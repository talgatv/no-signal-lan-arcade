package lol.lan.arcade.server

import java.io.File
import java.io.IOException

/**
 * Resolves (root, relativePath) to bytes. Checks the external pack directory first
 * (so a pushed full `games/`/`programs/` tree overrides the bundled demo subset for
 * local testing), then bundled APK assets. Tries `<path>/index.html` as a fallback
 * when `<path>` itself isn't found, mirroring pc/host.py's directory→index.html
 * behavior without needing real directory-listing on either source.
 */
class ContentRoots(
    private val externalBaseDir: File,
    private val loadAssetBytes: (String) -> ByteArray?,
) {
    private fun rootDirName(root: RouteResolver.Root): String = when (root) {
        RouteResolver.Root.WWW -> "www"
        RouteResolver.Root.GAMES -> "games"
        RouteResolver.Root.PROGRAMS -> "programs"
        RouteResolver.Root.SHARED -> "games/_shared"
        RouteResolver.Root.DOCS -> "docs"
    }

    fun load(root: RouteResolver.Root, relativePath: String): ByteArray? {
        val safeRel = RouteResolver.safeRelative(relativePath) ?: return null
        val base = rootDirName(root)
        val candidates = listOf("$base/$safeRel", "$base/$safeRel/index.html".replace("//", "/"))

        for (rel in candidates) {
            loadExternal(rel)?.let { return it }
        }
        for (rel in candidates) {
            loadAsset(rel)?.let { return it }
        }
        return null
    }

    private fun loadExternal(relPath: String): ByteArray? {
        val f = File(externalBaseDir, "packs/$relPath")
        return if (f.isFile) {
            try {
                f.readBytes()
            } catch (e: IOException) {
                null
            }
        } else {
            null
        }
    }

    private fun loadAsset(relPath: String): ByteArray? = loadAssetBytes("web/$relPath")
}
