package lol.lan.arcade.server.tls

import lol.lan.arcade.server.ContentRoots
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.io.BufferedReader
import java.io.File
import java.io.InputStreamReader
import java.net.ServerSocket
import java.nio.charset.StandardCharsets
import java.security.SecureRandom
import java.security.cert.X509Certificate
import javax.net.ssl.SSLContext
import javax.net.ssl.SSLSocket
import javax.net.ssl.X509TrustManager

/**
 * End-to-end test: a real TLS handshake against a real self-signed cert, real hand-rolled
 * HTTP parsing, and a real WebSocket upgrade + relay — the same path a browser exercises
 * after accepting the "connection is not private" warning.
 */
class HttpsOghServerTest {

    private lateinit var server: HttpsOghServer
    private var port: Int = 0

    private fun contentRoots(vararg assets: Pair<String, String>): ContentRoots {
        val map = assets.toMap()
        return ContentRoots(File("/nonexistent-in-test"), loadAssetBytes = { p -> map[p]?.toByteArray() })
    }

    /** Picks a free port by briefly binding a plain ServerSocket, matching the pattern most
     *  test suites use to avoid hardcoding a port that might already be in use. */
    private fun freePort(): Int = ServerSocket(0).use { it.localPort }

    private fun startServer(vararg assets: Pair<String, String>) {
        port = freePort()
        val sslContext = TlsCertProvider.sslContext(listOf("127.0.0.1"))
        server = HttpsOghServer(port, contentRoots(*assets), sslContext)
        server.start()
        Thread.sleep(150) // give the accept loop a moment to bind
    }

    @After
    fun tearDown() {
        if (::server.isInitialized) server.stop()
    }

    /** Trusts any cert — acceptable here because the whole point of the test is verifying our
     *  own self-signed certificate works, not validating a real certificate chain. */
    private fun trustAllClientSocket(): SSLSocket {
        val trustAll = object : X509TrustManager {
            override fun checkClientTrusted(chain: Array<out X509Certificate>?, authType: String?) {}
            override fun checkServerTrusted(chain: Array<out X509Certificate>?, authType: String?) {}
            override fun getAcceptedIssuers(): Array<X509Certificate> = arrayOf()
        }
        val ctx = SSLContext.getInstance("TLS")
        ctx.init(null, arrayOf(trustAll), SecureRandom())
        return ctx.socketFactory.createSocket("127.0.0.1", port) as SSLSocket
    }

    private fun readHttpResponse(input: java.io.InputStream): Pair<Int, String> {
        val reader = BufferedReader(InputStreamReader(input, StandardCharsets.UTF_8))
        val statusLine = reader.readLine() ?: return -1 to ""
        val status = statusLine.split(" ")[1].toInt()
        var contentLength = 0
        while (true) {
            val line = reader.readLine() ?: break
            if (line.isEmpty()) break
            if (line.startsWith("Content-Length:", ignoreCase = true)) {
                contentLength = line.substringAfter(":").trim().toInt()
            }
        }
        val buf = CharArray(contentLength)
        var read = 0
        while (read < contentLength) {
            val n = reader.read(buf, read, contentLength - read)
            if (n == -1) break
            read += n
        }
        return status to String(buf, 0, read)
    }

    @Test
    fun `real TLS handshake succeeds against the self-signed cert`() {
        startServer("web/www/index.html" to "<html>LOBBY</html>")
        val socket = trustAllClientSocket()
        socket.startHandshake() // throws on failure
        assertTrue(socket.session.isValid)
        socket.close()
    }

    @Test
    fun `reuses one TLS connection for multiple requests (keep-alive)`() {
        // Regression test for the real slowness a user reported: every asset on a page was
        // paying for a brand-new TLS handshake because the server closed the connection after
        // one response. A single handshake (one connect + startHandshake) followed by three
        // sequential requests on the same socket is the actual proof this is fixed.
        startServer(
            "web/games/a/index.html" to "AAA",
            "web/games/b/index.html" to "BBBB",
            "web/games/c/index.html" to "CCCCC",
        )
        // Exactly one socket, one handshake, for all three requests below — the point of the test.
        val socket = trustAllClientSocket()
        socket.startHandshake()

        val bodies = listOf("/games/a/index.html", "/games/b/index.html", "/games/c/index.html").map { path ->
            socket.outputStream.write("GET $path HTTP/1.1\r\nHost: 127.0.0.1\r\n\r\n".toByteArray(StandardCharsets.US_ASCII))
            socket.outputStream.flush()
            val (status, body) = readHttpResponse(socket.inputStream)
            assertEquals(200, status)
            body
        }
        assertEquals(listOf("AAA", "BBBB", "CCCCC"), bodies)
        socket.close()
    }

    @Test
    fun `serves static content over the real TLS connection`() {
        startServer("web/www/index.html" to "<html>LOBBY</html>")
        val socket = trustAllClientSocket()
        socket.outputStream.write("GET / HTTP/1.1\r\nHost: 127.0.0.1\r\n\r\n".toByteArray(StandardCharsets.US_ASCII))
        socket.outputStream.flush()
        val (status, body) = readHttpResponse(socket.inputStream)
        assertEquals(200, status)
        assertEquals("<html>LOBBY</html>", body)
        socket.close()
    }

    @Test
    fun `health endpoint responds correctly over TLS`() {
        startServer()
        val socket = trustAllClientSocket()
        socket.outputStream.write("GET /api/health HTTP/1.1\r\nHost: 127.0.0.1\r\n\r\n".toByteArray(StandardCharsets.US_ASCII))
        socket.outputStream.flush()
        val (status, body) = readHttpResponse(socket.inputStream)
        assertEquals(200, status)
        assertTrue(body.contains("\"ok\":true"))
        socket.close()
    }

    @Test
    fun `bare hub alias redirects over TLS just like the plain-HTTP server`() {
        startServer()
        val socket = trustAllClientSocket()
        socket.outputStream.write("GET /games/ HTTP/1.1\r\nHost: 127.0.0.1\r\n\r\n".toByteArray(StandardCharsets.US_ASCII))
        socket.outputStream.flush()
        val reader = BufferedReader(InputStreamReader(socket.inputStream, StandardCharsets.UTF_8))
        val statusLine = reader.readLine()!!
        assertTrue(statusLine.contains("302"))
        val headerLines = generateSequence { reader.readLine() }.takeWhile { it.isNotEmpty() }.toList()
        assertTrue(headerLines.any { it.equals("Location: /games/hub/", ignoreCase = true) })
        socket.close()
    }

    @Test
    fun `two websocket clients join the same room and relay a message over real TLS`() {
        startServer()

        val socketA = trustAllClientSocket()
        wsHandshake(socketA)
        val wsA = RawWebSocketConnection(socketA.inputStream, socketA.outputStream)
        wsA.sendText("""{"v":1,"type":"join","room":"main","name":"Ada","gameId":"x"}""")
        wsA.readFrame() // hello
        wsA.readFrame() // lobby broadcast from own join

        val socketB = trustAllClientSocket()
        wsHandshake(socketB)
        val wsB = RawWebSocketConnection(socketB.inputStream, socketB.outputStream)
        wsB.sendText("""{"v":1,"type":"join","room":"main","name":"Bo","gameId":"x"}""")
        wsB.readFrame() // hello
        wsB.readFrame() // lobby broadcast from own join
        wsA.readFrame() // lobby broadcast seen by Ada when Bo joins

        wsA.sendText("""{"v":1,"type":"chat","text":"hi over tls"}""")
        val chatOnA = wsA.readFrame()!! // chat broadcasts to everyone including sender
        val chatOnB = wsB.readFrame()!!
        assertTrue(chatOnA.contains("hi over tls"))
        assertTrue(chatOnB.contains("hi over tls"))

        socketA.close()
        socketB.close()
    }

    private fun wsHandshake(socket: SSLSocket) {
        val request = "GET /ws HTTP/1.1\r\n" +
            "Host: 127.0.0.1\r\n" +
            "Upgrade: websocket\r\n" +
            "Connection: Upgrade\r\n" +
            "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n" +
            "Sec-WebSocket-Version: 13\r\n\r\n"
        socket.outputStream.write(request.toByteArray(StandardCharsets.US_ASCII))
        socket.outputStream.flush()

        // Read the 101 response line-by-line so the stream is left positioned exactly at the
        // start of WS frame data, same requirement HttpRequestParser documents server-side.
        val input = socket.inputStream
        var lastFour = ByteArray(4)
        while (!(lastFour[0] == '\r'.code.toByte() && lastFour[1] == '\n'.code.toByte() &&
                lastFour[2] == '\r'.code.toByte() && lastFour[3] == '\n'.code.toByte())
        ) {
            val b = input.read()
            require(b != -1) { "connection closed during handshake" }
            lastFour = byteArrayOf(lastFour[1], lastFour[2], lastFour[3], b.toByte())
        }
    }
}
