package lol.lan.arcade.server

/** Extension → MIME type. Shared by the Ktor HTTP server and the raw-socket HTTPS server so
 *  both guess Content-Type identically. */
internal fun guessContentTypeString(path: String): String {
    val ext = path.substringAfterLast('.', "").lowercase()
    return when (ext) {
        "html", "htm" -> "text/html"
        "js", "mjs" -> "text/javascript"
        "css" -> "text/css"
        "json" -> "application/json"
        "md", "markdown" -> "text/markdown"
        "svg" -> "image/svg+xml"
        "png" -> "image/png"
        "jpg", "jpeg" -> "image/jpeg"
        "gif" -> "image/gif"
        "ico" -> "image/x-icon"
        "woff" -> "font/woff"
        "woff2" -> "font/woff2"
        "ttf" -> "font/ttf"
        "wasm" -> "application/wasm"
        "mp3" -> "audio/mpeg"
        "wav" -> "audio/wav"
        "webm" -> "video/webm"
        "txt" -> "text/plain"
        else -> "application/octet-stream"
    }
}
