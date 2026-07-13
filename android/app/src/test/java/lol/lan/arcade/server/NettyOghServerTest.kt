package lol.lan.arcade.server

import lol.lan.arcade.server.tls.TlsCertProvider
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import java.net.HttpURLConnection
import java.net.ServerSocket
import java.net.URL
import java.security.SecureRandom
import java.security.cert.X509Certificate
import javax.net.ssl.HttpsURLConnection
import javax.net.ssl.SSLContext
import javax.net.ssl.X509TrustManager

/**
 * End-to-end test: a real Netty engine, bound to a real port, serving [installOghRouting]
 * over both plain HTTP and (via [TlsCertProvider]'s self-signed [java.security.KeyStore])
 * real TLS — the two things unique to [NettyOghServer] that [OghServerRouteTest]'s in-memory
 * `testApplication` harness can't exercise (it never binds a socket or negotiates TLS).
 */
class NettyOghServerTest {

    private var server: NettyOghServer? = null

    private fun contentRoots(vararg assets: Pair<String, String>): ContentRoots {
        val map = assets.toMap()
        return ContentRoots(File("/nonexistent-in-test"), loadAssetBytes = { p -> map[p]?.toByteArray() })
    }

    private fun freePort(): Int = ServerSocket(0).use { it.localPort }

    private fun trustAllSslContext(): SSLContext {
        val trustAll = object : X509TrustManager {
            override fun checkClientTrusted(chain: Array<out X509Certificate>?, authType: String?) {}
            override fun checkServerTrusted(chain: Array<out X509Certificate>?, authType: String?) {}
            override fun getAcceptedIssuers(): Array<X509Certificate> = arrayOf()
        }
        return SSLContext.getInstance("TLS").apply {
            init(null, arrayOf(trustAll), SecureRandom())
        }
    }

    @After
    fun tearDown() {
        server?.stop()
    }

    @Test
    fun `plain HTTP connector serves routed content`() {
        val port = freePort()
        server = NettyOghServer(port, contentRoots("web/games/comet/client/index.html" to "COMET"), useHttps = false)
        server!!.start()
        Thread.sleep(300) // give Netty's bootstrap a moment to bind

        val conn = URL("http://127.0.0.1:$port/games/comet/client/index.html").openConnection() as HttpURLConnection
        try {
            assertEquals(200, conn.responseCode)
            assertEquals("COMET", conn.inputStream.bufferedReader().readText())
        } finally {
            conn.disconnect()
        }
    }

    @Test
    fun `sslConnector serves routed content over a real TLS handshake`() {
        val port = freePort()
        server = NettyOghServer(
            port,
            contentRoots("web/games/comet/client/index.html" to "COMET"),
            useHttps = true,
            ipAddresses = listOf("127.0.0.1"),
        )
        server!!.start()
        Thread.sleep(300)

        val conn = URL("https://127.0.0.1:$port/games/comet/client/index.html").openConnection() as HttpsURLConnection
        conn.sslSocketFactory = trustAllSslContext().socketFactory
        conn.hostnameVerifier = javax.net.ssl.HostnameVerifier { _, _ -> true }
        try {
            assertEquals(200, conn.responseCode)
            assertEquals("COMET", conn.inputStream.bufferedReader().readText())
            // Confirms an actual TLS session was negotiated, not a plaintext fallback.
            assertTrue(conn.cipherSuite.isNotEmpty())
        } finally {
            conn.disconnect()
        }
    }

    @Test
    fun `health endpoint responds over the netty engine`() {
        val port = freePort()
        server = NettyOghServer(port, contentRoots(), useHttps = false)
        server!!.start()
        Thread.sleep(300)

        val conn = URL("http://127.0.0.1:$port/api/health").openConnection() as HttpURLConnection
        try {
            assertEquals(200, conn.responseCode)
            assertTrue(conn.inputStream.bufferedReader().readText().contains("\"ok\":true"))
        } finally {
            conn.disconnect()
        }
    }
}
