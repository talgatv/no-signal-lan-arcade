package lol.lan.arcade.server.tls

import lol.lan.arcade.server.ContentRoots
import lol.lan.arcade.server.Connection
import lol.lan.arcade.server.Dispatcher
import lol.lan.arcade.server.Hub
import lol.lan.arcade.server.RouteResolver
import lol.lan.arcade.server.guessContentTypeString
import java.io.BufferedOutputStream
import java.io.OutputStream
import java.net.Socket
import java.nio.charset.StandardCharsets
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import javax.net.ssl.SSLContext
import javax.net.ssl.SSLServerSocket

/**
 * Same protocol and content-serving logic as [lol.lan.arcade.server.OghServer] (plain HTTP via
 * Ktor CIO), but hand-rolled over a raw [SSLServerSocket]. Ktor's CIO engine has no server-side
 * TLS support at all — confirmed by inspecting its compiled classes: zero SSL-related symbols,
 * versus `ktor-server-core`'s engine-agnostic `EngineSSLConnectorConfig` that CIO simply never
 * consumes. Switching to an engine that does support TLS (Netty) pulls in several MB of
 * largely Android-irrelevant native-transport code for one feature. This reuses the exact same
 * framework-agnostic [Hub]/[Dispatcher]/[ContentRoots]/[RouteResolver] core as the plain-HTTP
 * path — only the transport (and the hand-written HTTP/1.1 + WebSocket framing that transport
 * needs) differs.
 */
class HttpsOghServer(
    private val port: Int,
    private val contentRoots: ContentRoots,
    private val sslContext: SSLContext,
) {
    private val hub = Hub()
    private var serverSocket: SSLServerSocket? = null
    private var pool: ExecutorService? = null

    fun start() {
        if (serverSocket != null) return
        val executor = Executors.newCachedThreadPool()
        pool = executor
        val socket = sslContext.serverSocketFactory.createServerSocket(port) as SSLServerSocket
        serverSocket = socket
        executor.execute {
            while (!socket.isClosed) {
                val client = try {
                    socket.accept()
                } catch (e: Exception) {
                    break // socket closed during stop()
                }
                executor.execute { handleConnection(client) }
            }
        }
    }

    fun stop() {
        try {
            serverSocket?.close()
        } catch (e: Exception) {
            // already gone
        }
        serverSocket = null
        pool?.shutdownNow()
        pool = null
    }

    private fun handleConnection(socket: Socket) {
        try {
            val input = socket.getInputStream()
            val output = BufferedOutputStream(socket.getOutputStream())
            val request = HttpRequestParser.parse(input) ?: return

            if (request.path == "/ws" && request.header("upgrade")?.lowercase() == "websocket") {
                handleWebSocketUpgrade(request, input, output)
            } else {
                handleHttp(request, output)
            }
        } catch (e: Exception) {
            // one bad connection must not take down the accept loop
        } finally {
            try {
                socket.close()
            } catch (e: Exception) {
                // already gone
            }
        }
    }

    private fun handleWebSocketUpgrade(request: HttpRequest, input: java.io.InputStream, output: OutputStream) {
        val key = request.header("sec-websocket-key") ?: return
        val accept = WebSocketHandshake.acceptKey(key)
        val response = "HTTP/1.1 101 Switching Protocols\r\n" +
            "Upgrade: websocket\r\n" +
            "Connection: Upgrade\r\n" +
            "Sec-WebSocket-Accept: $accept\r\n\r\n"
        output.write(response.toByteArray(StandardCharsets.US_ASCII))
        output.flush()

        val ws = RawWebSocketConnection(input, output)
        val conn = Connection(sink = { text -> ws.sendText(text) })
        try {
            while (true) {
                val raw = ws.readFrame() ?: break
                Dispatcher.handle(hub, conn, raw, System.currentTimeMillis())
            }
        } finally {
            Dispatcher.onDisconnect(hub, conn)
        }
    }

    private fun handleHttp(request: HttpRequest, output: OutputStream) {
        if (request.path == "/api/health") {
            respondJson(output, """{"ok":true,"rooms":${hub.roomCounts().size},"v":1}""")
            return
        }
        if (request.path == "/api/rooms") {
            val body = hub.roomCounts().entries.joinToString(",", "{", "}") { (id, n) -> "${jsonString(id)}:$n" }
            respondJson(output, """{"rooms":$body}""")
            return
        }
        if (request.path in RouteResolver.HUB_REDIRECT_PATHS) {
            respondRedirect(output, "/games/hub/")
            return
        }

        val resolved = RouteResolver.resolve(request.path)
        val loaded = contentRoots.load(resolved.root, resolved.relativePath)
        if (loaded == null) {
            respondNotFound(output)
        } else {
            respondBytes(output, 200, "OK", loaded.bytes, guessContentTypeString(loaded.matchedPath))
        }
    }

    private fun respondBytes(output: OutputStream, status: Int, reason: String, bytes: ByteArray, contentType: String) {
        val header = "HTTP/1.1 $status $reason\r\n" +
            "Content-Type: $contentType\r\n" +
            "Content-Length: ${bytes.size}\r\n" +
            "Cache-Control: no-cache\r\n" +
            "Access-Control-Allow-Origin: *\r\n" +
            "Connection: close\r\n\r\n"
        output.write(header.toByteArray(StandardCharsets.US_ASCII))
        output.write(bytes)
        output.flush()
    }

    private fun respondJson(output: OutputStream, json: String) =
        respondBytes(output, 200, "OK", json.toByteArray(StandardCharsets.UTF_8), "application/json; charset=utf-8")

    private fun respondNotFound(output: OutputStream) =
        respondBytes(output, 404, "Not Found", "Not found".toByteArray(StandardCharsets.UTF_8), "text/plain; charset=utf-8")

    private fun respondRedirect(output: OutputStream, location: String) {
        val header = "HTTP/1.1 302 Found\r\nLocation: $location\r\nContent-Length: 0\r\nConnection: close\r\n\r\n"
        output.write(header.toByteArray(StandardCharsets.US_ASCII))
        output.flush()
    }

    private fun jsonString(s: String): String =
        "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"") + "\""
}
