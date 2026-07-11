package lol.lan.arcade.server

import java.net.URLDecoder

/**
 * Maps an incoming HTTP path to a (root, relativePath) pair. Mirrors
 * `OGHHandler._resolve_static` in pc/host.py exactly, including which route
 * variants (with/without trailing slash) are recognized.
 */
object RouteResolver {

    enum class Root { WWW, GAMES, PROGRAMS, SHARED, DOCS }

    data class Resolved(val root: Root, val relativePath: String)

    private val LOBBY_PATHS = setOf("/", "/index.html", "/lobby", "/lobby/")
    private val ABOUT_PATHS = setOf("/about", "/about/", "/about.html")
    private val HUB_PATHS = setOf(
        "/games", "/games/", "/games/hub", "/games/hub/",
        "/hub", "/hub/", "/library", "/library/", "/apps", "/apps/",
    )

    fun resolve(rawPath: String): Resolved {
        val path = rawPath.ifEmpty { "/" }
        return when {
            path in LOBBY_PATHS -> Resolved(Root.WWW, "index.html")
            path in ABOUT_PATHS -> Resolved(Root.WWW, "about.html")
            path in HUB_PATHS -> Resolved(Root.GAMES, "hub/index.html")
            path.startsWith("/games/") -> Resolved(Root.GAMES, path.removePrefix("/games/"))
            path.startsWith("/programs/") -> Resolved(Root.PROGRAMS, path.removePrefix("/programs/"))
            path.startsWith("/shared/") -> Resolved(Root.SHARED, path.removePrefix("/shared/"))
            path.startsWith("/docs/") -> Resolved(Root.DOCS, path.removePrefix("/docs/"))
            path.startsWith("/www/") -> Resolved(Root.WWW, path.removePrefix("/www/"))
            else -> Resolved(Root.WWW, path.removePrefix("/"))
        }
    }

    /** Rejects any path containing a `..` segment (after percent-decoding). Null = unsafe. */
    fun safeRelative(relativePath: String): String? {
        val decoded = try {
            URLDecoder.decode(relativePath, "UTF-8")
        } catch (e: Exception) {
            return null
        }
        if (decoded.split("/").any { it == ".." }) return null
        return decoded.trimStart('/')
    }
}
