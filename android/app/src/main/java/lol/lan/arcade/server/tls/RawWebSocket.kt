package lol.lan.arcade.server.tls

import java.io.EOFException
import java.io.InputStream
import java.io.OutputStream
import java.security.MessageDigest
import java.util.Base64

private const val WS_MAGIC = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"

object WebSocketHandshake {
    /** Sec-WebSocket-Accept value for a given Sec-WebSocket-Key — same magic GUID (RFC 6455)
     *  pc/host.py's WS_MAGIC uses. */
    fun acceptKey(clientKey: String): String {
        val digest = MessageDigest.getInstance("SHA-1").digest((clientKey + WS_MAGIC).toByteArray(Charsets.UTF_8))
        return Base64.getEncoder().encodeToString(digest)
    }
}

/**
 * RFC 6455 text-frame connection for one accepted socket. Ports `WsConnection` from
 * `pc/host.py` line-for-line: same frame header format, text frames only (binary/continuation
 * ignored), ping answered with pong, close/EOF/any read error ends the loop by returning null
 * rather than throwing — a single bad client must never take down the accept loop.
 */
class RawWebSocketConnection(private val input: InputStream, private val output: OutputStream) {
    private val writeLock = Any()

    fun sendText(text: String) {
        val payload = text.toByteArray(Charsets.UTF_8)
        val header = buildHeader(0x81, payload.size)
        synchronized(writeLock) {
            output.write(header)
            output.write(payload)
            output.flush()
        }
    }

    /** Reads one text frame; null means the connection is over (close frame, EOF, or error). */
    fun readFrame(): String? {
        return try {
            readFrameOrThrow()
        } catch (e: Exception) {
            null
        }
    }

    private tailrec fun readFrameOrThrow(): String? {
        val b1 = input.read()
        val b2 = input.read()
        if (b1 == -1 || b2 == -1) return null

        val opcode = b1 and 0x0F
        val masked = (b2 and 0x80) != 0
        var length = (b2 and 0x7F).toLong()
        if (length == 126L) {
            length = readExact(2).toUnsignedLong()
        } else if (length == 127L) {
            length = readExact(8).toUnsignedLong()
        }
        val mask = if (masked) readExact(4) else ByteArray(0)
        val data = if (length > 0) readExact(length.toInt()) else ByteArray(0)
        val payload = if (masked) unmask(data, mask) else data

        return when (opcode) {
            0x8 -> null // close
            0x9 -> { sendPong(payload); readFrameOrThrow() } // ping -> pong, keep reading
            0xA -> readFrameOrThrow() // pong, ignore
            0x1 -> String(payload, Charsets.UTF_8) // text
            else -> readFrameOrThrow() // binary/continuation: ignore, matches pc/host.py
        }
    }

    private fun sendPong(data: ByteArray) {
        val header = byteArrayOf(0x8A.toByte(), (data.size and 0x7F).toByte())
        synchronized(writeLock) {
            output.write(header)
            output.write(data)
            output.flush()
        }
    }

    private fun buildHeader(firstByte: Int, length: Int): ByteArray {
        val header = ArrayList<Byte>(10)
        header.add(firstByte.toByte())
        when {
            length < 126 -> header.add(length.toByte())
            length < 65536 -> {
                header.add(126.toByte())
                header.add((length ushr 8).toByte())
                header.add(length.toByte())
            }
            else -> {
                header.add(127.toByte())
                for (shift in 7 downTo 0) {
                    header.add((length.toLong() ushr (shift * 8)).toByte())
                }
            }
        }
        return header.toByteArray()
    }

    private fun unmask(data: ByteArray, mask: ByteArray): ByteArray =
        ByteArray(data.size) { i -> (data[i].toInt() xor mask[i % 4].toInt()).toByte() }

    private fun readExact(n: Int): ByteArray {
        val buf = ByteArray(n)
        var off = 0
        while (off < n) {
            val read = input.read(buf, off, n - off)
            if (read == -1) throw EOFException()
            off += read
        }
        return buf
    }
}

private fun ByteArray.toUnsignedLong(): Long {
    var result = 0L
    for (b in this) result = (result shl 8) or (b.toLong() and 0xFF)
    return result
}
