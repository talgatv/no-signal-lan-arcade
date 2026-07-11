package lol.lan.arcade.server

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class RouteResolverTest {

    @Test
    fun `root and lobby aliases resolve to www index`() {
        for (p in listOf("/", "/index.html", "/lobby", "/lobby/")) {
            assertEquals(RouteResolver.Root.WWW, RouteResolver.resolve(p).root)
            assertEquals("index.html", RouteResolver.resolve(p).relativePath)
        }
    }

    @Test
    fun `about aliases resolve to www about`() {
        for (p in listOf("/about", "/about/", "/about.html")) {
            val r = RouteResolver.resolve(p)
            assertEquals(RouteResolver.Root.WWW, r.root)
            assertEquals("about.html", r.relativePath)
        }
    }

    @Test
    fun `hub aliases resolve to the games hub index`() {
        for (p in listOf("/games", "/games/", "/games/hub", "/games/hub/", "/hub", "/hub/", "/library", "/library/", "/apps", "/apps/")) {
            val r = RouteResolver.resolve(p)
            assertEquals(RouteResolver.Root.GAMES, r.root)
            assertEquals("hub/index.html", r.relativePath)
        }
    }

    @Test
    fun `games prefix strips to a relative path under the games root`() {
        val r = RouteResolver.resolve("/games/comet/client/index.html")
        assertEquals(RouteResolver.Root.GAMES, r.root)
        assertEquals("comet/client/index.html", r.relativePath)
    }

    @Test
    fun `programs prefix strips to the programs root`() {
        val r = RouteResolver.resolve("/programs/lan-chat/client/")
        assertEquals(RouteResolver.Root.PROGRAMS, r.root)
        assertEquals("lan-chat/client/", r.relativePath)
    }

    @Test
    fun `shared prefix maps to the games shared root`() {
        val r = RouteResolver.resolve("/shared/js/ogh-net.js")
        assertEquals(RouteResolver.Root.SHARED, r.root)
        assertEquals("js/ogh-net.js", r.relativePath)
    }

    @Test
    fun `docs prefix maps to the docs root`() {
        val r = RouteResolver.resolve("/docs/README.md")
        assertEquals(RouteResolver.Root.DOCS, r.root)
        assertEquals("README.md", r.relativePath)
    }

    @Test
    fun `www prefix and default fallback both map to www`() {
        assertEquals("style.css", RouteResolver.resolve("/www/style.css").relativePath)
        assertEquals("favicon.ico", RouteResolver.resolve("/favicon.ico").relativePath)
        assertEquals(RouteResolver.Root.WWW, RouteResolver.resolve("/favicon.ico").root)
    }

    @Test
    fun `safeRelative rejects any dot-dot segment`() {
        assertNull(RouteResolver.safeRelative("../secret"))
        assertNull(RouteResolver.safeRelative("games/../../etc/passwd"))
        assertNull(RouteResolver.safeRelative("a/b/../../../c"))
    }

    @Test
    fun `safeRelative decodes percent-encoding before checking`() {
        assertNull(RouteResolver.safeRelative("%2e%2e/secret"))
    }

    @Test
    fun `safeRelative accepts normal nested paths and strips a leading slash`() {
        assertEquals("comet/client/index.html", RouteResolver.safeRelative("/comet/client/index.html"))
        assertEquals("comet/client/index.html", RouteResolver.safeRelative("comet/client/index.html"))
    }
}
