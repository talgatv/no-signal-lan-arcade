package lol.lan.arcade.server.tls

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import java.io.ByteArrayInputStream
import java.io.SequenceInputStream

class HttpRequestParserTest {

    private fun streamOf(text: String) = ByteArrayInputStream(text.toByteArray(Charsets.UTF_8))

    @Test
    fun `parses method, path, and headers`() {
        val raw = "GET /games/hub/ HTTP/1.1\r\nHost: 192.168.1.213:8443\r\nUser-Agent: TestClient\r\n\r\n"
        val req = HttpRequestParser.parse(streamOf(raw))
        assertEquals("GET", req?.method)
        assertEquals("/games/hub/", req?.path)
        assertEquals("192.168.1.213:8443", req?.header("Host"))
        assertEquals("TestClient", req?.header("user-agent")) // header lookup is case-insensitive
    }

    @Test
    fun `returns null on empty input`() {
        assertNull(HttpRequestParser.parse(streamOf("")))
    }

    @Test
    fun `returns null when the request line is malformed`() {
        assertNull(HttpRequestParser.parse(streamOf("garbage\r\n\r\n")))
    }

    @Test
    fun `ignores a header line with no colon rather than failing the whole request`() {
        val raw = "GET / HTTP/1.1\r\nnocolonhere\r\nHost: x\r\n\r\n"
        val req = HttpRequestParser.parse(streamOf(raw))
        assertEquals("x", req?.header("host"))
    }

    @Test
    fun `stops exactly at the blank line, leaving body bytes untouched for the caller`() {
        val raw = "GET /ws HTTP/1.1\r\nUpgrade: websocket\r\n\r\nREMAINING-BYTES"
        val input = streamOf(raw)
        val req = HttpRequestParser.parse(input)
        assertEquals("websocket", req?.header("upgrade"))
        val rest = input.readBytes().toString(Charsets.UTF_8)
        assertEquals("REMAINING-BYTES", rest)
    }

    @Test
    fun `works when the stream delivers bytes across multiple underlying chunks`() {
        // SequenceInputStream forces InputStream.read() calls to cross chunk boundaries,
        // exercising the byte-by-byte reader the same way a real socket stream would.
        val chunks = listOf("GET / HTTP", "/1.1\r\nHost", ": x\r\n\r\n").map { streamOf(it) }
        val combined = SequenceInputStream(java.util.Collections.enumeration(chunks))
        val req = HttpRequestParser.parse(combined)
        assertEquals("GET", req?.method)
        assertEquals("x", req?.header("host"))
    }
}
