package lol.lan.arcade.server.tls

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream

class RawWebSocketTest {

    @Test
    fun `acceptKey matches the RFC 6455 worked example`() {
        // RFC 6455 section 1.3 worked example.
        val accept = WebSocketHandshake.acceptKey("dGhlIHNhbXBsZSBub25jZQ==")
        assertEquals("s3pPLMBiTxaQ9kYGzzhZRbK+xOo=", accept)
    }

    private fun clientTextFrame(text: String, masked: Boolean = true): ByteArray {
        val payload = text.toByteArray(Charsets.UTF_8)
        val out = ByteArrayOutputStream()
        out.write(0x81) // FIN + text opcode
        val maskBit = if (masked) 0x80 else 0x00
        when {
            payload.size < 126 -> out.write(maskBit or payload.size)
            else -> {
                out.write(maskBit or 126)
                out.write((payload.size ushr 8) and 0xFF)
                out.write(payload.size and 0xFF)
            }
        }
        val mask = byteArrayOf(0x12, 0x34, 0x56, 0x78)
        if (masked) out.write(mask)
        val outgoingPayload = if (masked) {
            ByteArray(payload.size) { i -> (payload[i].toInt() xor mask[i % 4].toInt()).toByte() }
        } else {
            payload
        }
        out.write(outgoingPayload)
        return out.toByteArray()
    }

    @Test
    fun `reads a masked client text frame`() {
        val bytes = clientTextFrame("hello")
        val ws = RawWebSocketConnection(ByteArrayInputStream(bytes), ByteArrayOutputStream())
        assertEquals("hello", ws.readFrame())
    }

    @Test
    fun `reads a masked client text frame with non-ascii payload`() {
        val bytes = clientTextFrame("Привет!")
        val ws = RawWebSocketConnection(ByteArrayInputStream(bytes), ByteArrayOutputStream())
        assertEquals("Привет!", ws.readFrame())
    }

    @Test
    fun `reads a payload requiring the 126 extended length header`() {
        val text = "x".repeat(500)
        val bytes = clientTextFrame(text)
        val ws = RawWebSocketConnection(ByteArrayInputStream(bytes), ByteArrayOutputStream())
        assertEquals(text, ws.readFrame())
    }

    @Test
    fun `close frame ends the read with null`() {
        val out = ByteArrayOutputStream()
        out.write(0x88) // FIN + close opcode
        out.write(0x80) // masked, zero length
        out.write(byteArrayOf(0, 0, 0, 0)) // mask
        val ws = RawWebSocketConnection(ByteArrayInputStream(out.toByteArray()), ByteArrayOutputStream())
        assertNull(ws.readFrame())
    }

    @Test
    fun `truncated stream returns null instead of throwing`() {
        val ws = RawWebSocketConnection(ByteArrayInputStream(byteArrayOf(0x81.toByte())), ByteArrayOutputStream())
        assertNull(ws.readFrame())
    }

    @Test
    fun `ping is answered with pong and reading continues to the next real frame`() {
        val out = ByteArrayOutputStream()
        // ping frame (masked, empty payload)
        out.write(0x89) // FIN + ping opcode
        out.write(0x80)
        out.write(byteArrayOf(0, 0, 0, 0))
        // followed by a real text frame
        out.write(clientTextFrame("after-ping"))

        val serverOut = ByteArrayOutputStream()
        val ws = RawWebSocketConnection(ByteArrayInputStream(out.toByteArray()), serverOut)
        assertEquals("after-ping", ws.readFrame())

        // Server must have written a pong (0x8A) before the loop moved on.
        val written = serverOut.toByteArray()
        assertEquals(0x8A.toByte(), written[0])
    }

    @Test
    fun `sendText writes an unmasked server frame with the correct header`() {
        val out = ByteArrayOutputStream()
        val ws = RawWebSocketConnection(ByteArrayInputStream(ByteArray(0)), out)
        ws.sendText("hi")
        val written = out.toByteArray()
        assertEquals(0x81.toByte(), written[0]) // FIN + text
        assertEquals(2, written[1].toInt()) // length 2, no mask bit (servers don't mask)
        assertEquals("hi", String(written, 2, 2, Charsets.UTF_8))
    }

    @Test
    fun `sendText uses the extended 16-bit length header above 125 bytes`() {
        val text = "y".repeat(200)
        val out = ByteArrayOutputStream()
        val ws = RawWebSocketConnection(ByteArrayInputStream(ByteArray(0)), out)
        ws.sendText(text)
        val written = out.toByteArray()
        assertEquals(0x81.toByte(), written[0])
        assertEquals(126, written[1].toInt())
        val len = ((written[2].toInt() and 0xFF) shl 8) or (written[3].toInt() and 0xFF)
        assertEquals(200, len)
    }
}
