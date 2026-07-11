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

    /**
     * Bare aliases for the games hub. These must NOT be served directly: `games/hub/index.html`
     * uses paths relative to its own folder (`../_shared/css/...`, `hub.css`, `hub.js`).
     * Serving that file's content at a shallower URL like `/games/` or `/hub` would resolve
     * those relative paths against the wrong "directory", so the hub loads unstyled with
     * hub.js never executing (confirmed live: hub.js resolved to `/games/hub.js` → 404, so
     * it never ran, so the catalog fetch it triggers never happened either). The caller must
     * redirect these to the canonical `/games/hub/` instead of calling [resolve] on them.
     */
    val HUB_REDIRECT_PATHS = setOf(
        "/games", "/games/", "/games/hub",
        "/hub", "/hub/", "/library", "/library/", "/apps", "/apps/",
    )

    fun resolve(rawPath: String): Resolved {
        val path = rawPath.ifEmpty { "/" }
        return when {
            path in LOBBY_PATHS -> Resolved(Root.WWW, "index.html")
            path in ABOUT_PATHS -> Resolved(Root.WWW, "about.html")
            path == "/games/hub/" -> Resolved(Root.GAMES, "hub/index.html")
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
