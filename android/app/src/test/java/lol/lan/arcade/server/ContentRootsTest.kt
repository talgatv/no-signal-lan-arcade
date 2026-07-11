package lol.lan.arcade.server

import org.junit.Assert.assertArrayEquals
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
        val bytes = roots.load(RouteResolver.Root.GAMES, "comet/client/index.html")
        assertArrayEquals("ASSET".toByteArray(), bytes)
    }

    @Test
    fun `external pack directory overrides a bundled asset with the same path`() {
        val gamesDir = File(tmp.root, "packs/games/comet/client").apply { mkdirs() }
        File(gamesDir, "index.html").writeText("EXTERNAL")
        val roots = ContentRoots(tmp.root, fakeAssets("web/games/comet/client/index.html" to "ASSET"))
        val bytes = roots.load(RouteResolver.Root.GAMES, "comet/client/index.html")
        assertArrayEquals("EXTERNAL".toByteArray(), bytes)
    }

    @Test
    fun `falls back to index html for a directory-style request`() {
        val roots = ContentRoots(tmp.root, fakeAssets("web/games/comet/client/index.html" to "ASSET"))
        val bytes = roots.load(RouteResolver.Root.GAMES, "comet/client/")
        assertArrayEquals("ASSET".toByteArray(), bytes)
        val bytes2 = roots.load(RouteResolver.Root.GAMES, "comet/client")
        assertArrayEquals("ASSET".toByteArray(), bytes2)
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
        val bytes = roots.load(RouteResolver.Root.SHARED, "js/ogh-net.js")
        assertArrayEquals("NET".toByteArray(), bytes)
    }
}
