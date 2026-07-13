package lol.lan.arcade.server

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.io.File

class ContentRootsTest {

    @get:Rule
    val tmp = TemporaryFolder()

    private fun fakeAssets(vararg entries: Pair<String, String>): (String) -> ByteArray? {
        val map = entries.toMap()
        return { path -> map[path]?.toByteArray() }
    }

    @Test
    fun `serves a bundled asset when no external override exists`() {
        val roots = ContentRoots(tmp.root, fakeAssets("web/games/comet/client/index.html" to "ASSET"))
        val loaded = roots.load(RouteResolver.Root.GAMES, "comet/client/index.html")
        assertArrayEquals("ASSET".toByteArray(), loaded?.bytes)
    }

    @Test
    fun `program assets share the games root for bundled and external content`() {
        val assetPath = "web/games/programs/lan-chat/client/index.html"
        val externalDir = File(tmp.root, "packs/games/programs/lan-chat/client").apply { mkdirs() }
        val roots = ContentRoots(tmp.root, fakeAssets(assetPath to "BUNDLED"))

        val bundled = roots.load(RouteResolver.Root.GAMES, "programs/lan-chat/client/")
        assertArrayEquals("BUNDLED".toByteArray(), bundled?.bytes)
        assertEquals("games/programs/lan-chat/client/index.html", bundled?.matchedPath)

        File(externalDir, "index.html").writeText("EXTERNAL")
        val external = roots.load(RouteResolver.Root.GAMES, "programs/lan-chat/client/")
        assertArrayEquals("EXTERNAL".toByteArray(), external?.bytes)
    }

    @Test
    fun `external pack directory overrides a bundled asset with the same path`() {
        val gamesDir = File(tmp.root, "packs/games/comet/client").apply { mkdirs() }
        File(gamesDir, "index.html").writeText("EXTERNAL")
        val roots = ContentRoots(tmp.root, fakeAssets("web/games/comet/client/index.html" to "ASSET"))
        val loaded = roots.load(RouteResolver.Root.GAMES, "comet/client/index.html")
        assertArrayEquals("EXTERNAL".toByteArray(), loaded?.bytes)
    }

    @Test
    fun `falls back to index html for a directory-style request`() {
        val roots = ContentRoots(tmp.root, fakeAssets("web/games/comet/client/index.html" to "ASSET"))
        val loaded = roots.load(RouteResolver.Root.GAMES, "comet/client/")
        assertArrayEquals("ASSET".toByteArray(), loaded?.bytes)
        val loaded2 = roots.load(RouteResolver.Root.GAMES, "comet/client")
        assertArrayEquals("ASSET".toByteArray(), loaded2?.bytes)
    }

    @Test
    fun `matchedPath reflects the index html fallback, not the directory-style request`() {
        // Regression test: a live device test caught this exact bug — the hub UI's
        // entryToPath() always generates directory-style links (games/hub.js strips
        // "index.html" and ensures a trailing slash), so every real game/program link
        // goes through this fallback. If matchedPath still said "comet/client/" here,
        // the server would guess Content-Type from an extension-less path and serve
        // real HTML as application/octet-stream — which Chrome silently refuses to
        // render (confirmed against the actual bug before this fix).
        val roots = ContentRoots(tmp.root, fakeAssets("web/games/comet/client/index.html" to "ASSET"))
        val loaded = roots.load(RouteResolver.Root.GAMES, "comet/client/")
        assertEquals("games/comet/client/index.html", loaded?.matchedPath)
    }

    @Test
    fun `returns null when nothing matches`() {
        val roots = ContentRoots(tmp.root, fakeAssets())
        assertNull(roots.load(RouteResolver.Root.GAMES, "nope/nothing.html"))
    }

    @Test
    fun `path traversal is rejected before touching either source`() {
        val roots = ContentRoots(tmp.root, fakeAssets("web/games/../../etc/passwd" to "SHOULD NOT SERVE"))
        assertNull(roots.load(RouteResolver.Root.GAMES, "../../etc/passwd"))
    }

    @Test
    fun `shared root maps under games slash _shared`() {
        val roots = ContentRoots(tmp.root, fakeAssets("web/games/_shared/js/ogh-net.js" to "NET"))
        val loaded = roots.load(RouteResolver.Root.SHARED, "js/ogh-net.js")
        assertArrayEquals("NET".toByteArray(), loaded?.bytes)
    }
}
