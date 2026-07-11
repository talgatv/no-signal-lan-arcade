package lol.lan.arcade.server

import io.ktor.client.plugins.websocket.WebSockets
import io.ktor.client.plugins.websocket.webSocket
import io.ktor.client.request.get
import io.ktor.client.statement.bodyAsText
import io.ktor.http.HttpStatusCode
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
