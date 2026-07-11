package lol.lan.arcade.server.tls

import java.io.InputStream

data class HttpRequest(val method: String, val path: String, val headers: Map<String, String>) {
    fun header(name: String): String? = headers[name.lowercase()]
}

/**
 * Minimal HTTP/1.1 request-line + headers reader for the hand-rolled HTTPS listener
 * ([HttpsOghServer]). Reads byte-by-byte (not via a buffered [java.io.Reader]) specifically
 * so that after parsing headers, [input] is positioned exactly at the first byte of whatever
 * follows — required for the WebSocket upgrade path, where any pre-buffered lookahead would
 * silently eat the start of the client's first WS frame.
 */
object HttpRequestParser {

    /** Returns null on EOF or a malformed request line/header — caller should just close. */
    fun parse(input: InputStream): HttpRequest? {
        val requestLine = readLine(input) ?: return null
        val parts = requestLine.split(" ")
        if (parts.size < 2) return null
        val method = parts[0]
        val path = parts[1]

        val headers = LinkedHashMap<String, String>()
        while (true) {
            val line = readLine(input) ?: return null
            if (line.isEmpty()) break
            val idx = line.indexOf(':')
            if (idx <= 0) continue
            val key = line.substring(0, idx).trim().lowercase()
            val value = line.substring(idx + 1).trim()
            headers[key] = value
        }
        return HttpRequest(method, path, headers)
    }

    private fun readLine(input: InputStream): String? {
        val buf = StringBuilder()
        var sawCr = false
        while (true) {
            val b = input.read()
            if (b == -1) return if (buf.isEmpty()) null else buf.toString()
            val c = b.toChar()
            if (sawCr && c == '\n') return buf.toString()
            if (sawCr) {
                buf.append('\r')
                sawCr = false
            }
            if (c == '\r') {
                sawCr = true
                continue
            }
            buf.append(c)
        }
    }
}
