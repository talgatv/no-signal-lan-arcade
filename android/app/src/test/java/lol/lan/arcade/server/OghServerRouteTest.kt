package lol.lan.arcade.server

import io.ktor.client.plugins.websocket.WebSockets
import io.ktor.client.plugins.websocket.webSocket
import io.ktor.client.request.get
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import io.ktor.server.testing.testApplication
import io.ktor.websocket.Frame
import io.ktor.websocket.readText
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.boolean
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

class OghServerRouteTest {

    private fun contentRoots(vararg assets: Pair<String, String>): ContentRoots {
        val map = assets.toMap()
        return ContentRoots(File("/nonexistent-in-test"), loadAssetBytes = { p -> map[p]?.toByteArray() })
    }

    @Test
    fun `serves the lobby index at root`() = testApplication {
        application { installOghRouting(Hub(), contentRoots("web/www/index.html" to "<html>LOBBY</html>")) }
        val res = client.get("/")
        assertEquals(HttpStatusCode.OK, res.status)
        assertEquals("<html>LOBBY</html>", res.bodyAsText())
    }

    @Test
    fun `serves a game asset under games prefix`() = testApplication {
        application { installOghRouting(Hub(), contentRoots("web/games/comet/client/index.html" to "COMET")) }
        val res = client.get("/games/comet/client/index.html")
        assertEquals(HttpStatusCode.OK, res.status)
        assertEquals("COMET", res.bodyAsText())
    }

    @Test
    fun `bare hub aliases redirect to the canonical trailing-slash path`() = testApplication {
        // Regression test for a bug caught live on-device (and confirmed also present in
        // pc/host.py, fixed there too): /games/, /hub, etc. must redirect rather than
        // serve hub/index.html's bytes directly, or its relative asset paths break.
        application { installOghRouting(Hub(), contentRoots()) }
        val noRedirectClient = createClient { followRedirects = false }
        for (path in listOf("/games", "/games/", "/games/hub", "/hub", "/library", "/apps")) {
            val res = noRedirectClient.get(path)
            assertEquals("redirect expected for $path", HttpStatusCode.Found, res.status)
            assertEquals("/games/hub/", res.headers["Location"])
        }
    }

    @Test
    fun `canonical hub path serves content directly, no redirect`() = testApplication {
        application { installOghRouting(Hub(), contentRoots("web/games/hub/index.html" to "<html>HUB</html>")) }
        val res = client.get("/games/hub/")
        assertEquals(HttpStatusCode.OK, res.status)
        assertEquals("<html>HUB</html>", res.bodyAsText())
    }

    @Test
    fun `directory-style request gets text-html, not octet-stream`() = testApplication {
        // Regression test for a bug caught during the live device smoke test: the hub
        // UI (games/hub/hub.js entryToPath()) always links to games/programs with a
        // trailing slash and no "index.html" — e.g. "/programs/lan-chat/client/". The
        // server resolves that to real HTML via ContentRoots' index.html fallback, but
        // was guessing Content-Type from the pre-fallback request path (no extension),
        // so it answered "application/octet-stream" — which Chrome silently refused to
        // render as a page. Confirmed against the real bug on-device before this fix.
        application {
            installOghRouting(Hub(), contentRoots("web/programs/lan-chat/client/index.html" to "<html>CHAT</html>"))
        }
        val res = client.get("/programs/lan-chat/client/")
        assertEquals(HttpStatusCode.OK, res.status)
        assertEquals(ContentType.Text.Html.withoutParameters(), res.contentType()?.withoutParameters())
        assertEquals("<html>CHAT</html>", res.bodyAsText())
    }

    @Test
    fun `unknown path returns 404`() = testApplication {
        application { installOghRouting(Hub(), contentRoots()) }
        val res = client.get("/games/nope.html")
        assertEquals(HttpStatusCode.NotFound, res.status)
    }

    @Test
    fun `health endpoint reports ok`() = testApplication {
        application { installOghRouting(Hub(), contentRoots()) }
        val res = client.get("/api/health")
        val obj = Json.parseToJsonElement(res.bodyAsText()).jsonObject
        assertEquals(true, obj["ok"]!!.jsonPrimitive.boolean)
    }

    @Test
    fun `two websocket clients join the same room and relay a game action`() = testApplication {
        application { installOghRouting(Hub(), contentRoots()) }
        val wsClient = createClient { install(WebSockets) }

        wsClient.webSocket("/ws") {
            send(Frame.Text("""{"v":1,"type":"join","room":"main","name":"Ada","gameId":"x"}"""))
            (incoming.receive() as Frame.Text) // Ada's hello
            incoming.receive() // Ada's own lobby broadcast from her own join

            val bobJob = launch {
                wsClient.webSocket("/ws") {
                    send(Frame.Text("""{"v":1,"type":"join","room":"main","name":"Bo","gameId":"x"}"""))
                    (incoming.receive() as Frame.Text) // Bo's hello
                    incoming.receive() // lobby broadcast triggered by Bo's own join, seen by Bo
                    val relayed = (incoming.receive() as Frame.Text).readText() // Ada's action, relayed to Bo
                    assertTrue(relayed.contains("\"type\":\"game:action\""))
                    assertTrue(relayed.contains("\"action\":\"input\""))
                }
            }

            incoming.receive() // lobby broadcast triggered by Bo's join, seen by Ada
            send(Frame.Text("""{"v":1,"type":"game:action","action":"input","payload":{}}"""))
            bobJob.join()
        }
    }

    @Test
    fun `api rooms reflects an active room after a join`() = testApplication {
        val hub = Hub()
        application { installOghRouting(hub, contentRoots()) }
        val wsClient = createClient { install(WebSockets) }
        wsClient.webSocket("/ws") {
            send(Frame.Text("""{"v":1,"type":"join","room":"main","name":"Ada","gameId":"x"}"""))
            incoming.receive()
            incoming.receive()
        }
        val res = client.get("/api/rooms")
        val obj = Json.parseToJsonElement(res.bodyAsText()).jsonObject
        assertTrue(obj.containsKey("rooms"))
    }
}
