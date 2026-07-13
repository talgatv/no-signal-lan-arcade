package lol.lan.arcade.server

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
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
    fun `only the canonical trailing-slash hub path resolves to the hub index directly`() {
        val r = RouteResolver.resolve("/games/hub/")
        assertEquals(RouteResolver.Root.GAMES, r.root)
        assertEquals("hub/index.html", r.relativePath)
    }

    @Test
    fun `bare hub aliases are marked for redirect, not resolved directly`() {
        // Regression test: a live device test showed that serving hub/index.html's
        // content AT these shallower URLs breaks its relative asset paths
        // (../_shared/css/..., hub.css, hub.js all resolve wrong), so hub.js never
        // executes and the catalog never loads. The caller must redirect these to
        // /games/hub/ instead of calling resolve() on them — see HUB_REDIRECT_PATHS.
        for (p in listOf("/games", "/games/", "/games/hub", "/hub", "/hub/", "/library", "/library/", "/apps", "/apps/")) {
            assertTrue("$p should be in HUB_REDIRECT_PATHS", p in RouteResolver.HUB_REDIRECT_PATHS)
        }
        assertTrue("/games/hub/ (canonical) must NOT be redirected", "/games/hub/" !in RouteResolver.HUB_REDIRECT_PATHS)
    }

    @Test
    fun `games prefix strips to a relative path under the games root`() {
        val r = RouteResolver.resolve("/games/comet/client/index.html")
        assertEquals(RouteResolver.Root.GAMES, r.root)
        assertEquals("comet/client/index.html", r.relativePath)
    }

    @Test
    fun `canonical program path resolves inside the games root`() {
        val r = RouteResolver.resolve("/games/programs/lan-chat/client/")
        assertEquals(RouteResolver.Root.GAMES, r.root)
        assertEquals("programs/lan-chat/client/", r.relativePath)
    }

    @Test
    fun `legacy program urls redirect to the canonical tree and preserve query`() {
        assertEquals(
            "/games/programs/lan-chat/client/?name=Ada&room=main",
            RouteResolver.legacyProgramsRedirect("/programs/lan-chat/client/?name=Ada&room=main"),
        )
        assertEquals("/games/hub/", RouteResolver.legacyProgramsRedirect("/programs/"))
        assertNull(RouteResolver.legacyProgramsRedirect("/games/programs/lan-chat/client/"))
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
