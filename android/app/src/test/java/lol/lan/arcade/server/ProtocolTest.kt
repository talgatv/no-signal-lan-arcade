package lol.lan.arcade.server

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.int
import kotlinx.serialization.json.long
import kotlinx.serialization.json.boolean
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ProtocolTest {

    @Test
    fun `parses a join message`() {
        val msg = IncomingMessage.parse("""{"v":1,"type":"join","room":"main","name":"Ada","gameId":"pulse-race"}""")
        assertEquals("join", msg.type)
        assertEquals("main", msg.string("room"))
        assertEquals("Ada", msg.string("name"))
        assertEquals("pulse-race", msg.string("gameId"))
    }

    @Test
    fun `missing optional field returns null`() {
        val msg = IncomingMessage.parse("""{"v":1,"type":"ping"}""")
        assertNull(msg.string("t"))
    }

    @Test
    fun `invalid json returns null`() {
        assertEquals(null, IncomingMessage.parseOrNull("not json"))
    }

    @Test
    fun `hello json has expected shape`() {
        val text = Outgoing.hello(playerId = "a1b2", isHost = true, room = "main")
        val obj = Json.parseToJsonElement(text).jsonObject
        assertEquals(1, obj["v"]!!.jsonPrimitive.int)
        assertEquals("hello", obj["type"]!!.jsonPrimitive.content)
        assertEquals("a1b2", obj["playerId"]!!.jsonPrimitive.content)
        assertEquals(true, obj["isHost"]!!.jsonPrimitive.boolean)
        assertEquals("main", obj["room"]!!.jsonPrimitive.content)
    }

    @Test
    fun `lobby json embeds player list`() {
        val players = listOf(PlayerInfo("p1", "Ada", ready = true, gameId = "pulse-race", isHost = true))
        val text = Outgoing.lobby(players, room = "main")
        val obj = Json.parseToJsonElement(text).jsonObject
        assertEquals("lobby", obj["type"]!!.jsonPrimitive.content)
        val first = (obj["players"] as JsonArray)[0].jsonObject
        assertEquals("p1", first["id"]!!.jsonPrimitive.content)
        assertEquals("Ada", first["name"]!!.jsonPrimitive.content)
        assertEquals(true, first["isHost"]!!.jsonPrimitive.boolean)
        assertEquals("main", obj["room"]!!.jsonPrimitive.content)
    }

    @Test
    fun `relay preserves action and payload verbatim`() {
        val incoming = IncomingMessage.parse(
            """{"v":1,"type":"game:action","action":"input","payload":{"steer":-1},"tick":5}"""
        )
        val text = Outgoing.relay(type = "game:action", fromId = "p1", incoming = incoming, nowMillis = 1000L)
        val obj = Json.parseToJsonElement(text).jsonObject
        assertEquals("game:action", obj["type"]!!.jsonPrimitive.content)
        assertEquals("p1", obj["from"]!!.jsonPrimitive.content)
        assertEquals("input", obj["action"]!!.jsonPrimitive.content)
        assertEquals(-1, obj["payload"]!!.jsonObject["steer"]!!.jsonPrimitive.int)
        assertEquals(5, obj["tick"]!!.jsonPrimitive.int)
        assertEquals(1000L, obj["t"]!!.jsonPrimitive.long)
    }

    @Test
    fun `relay falls back to now when t is absent`() {
        val incoming = IncomingMessage.parse("""{"v":1,"type":"game:event"}""")
        val text = Outgoing.relay(type = "game:event", fromId = "p1", incoming = incoming, nowMillis = 42L)
        val obj = Json.parseToJsonElement(text).jsonObject
        assertEquals(42L, obj["t"]!!.jsonPrimitive.long)
    }

    @Test
    fun `gameStart embeds null hostId when room has no host`() {
        val text = Outgoing.gameStart(gameId = "x", seed = 7L, hostId = null)
        val obj = Json.parseToJsonElement(text).jsonObject
        assertEquals("game:start", obj["type"]!!.jsonPrimitive.content)
        assertEquals(7L, obj["seed"]!!.jsonPrimitive.long)
        assertEquals(true, obj["hostId"]!!.toString() == "null")
    }

    @Test
    fun `error json carries the message`() {
        val text = Outgoing.error("join first")
        val obj = Json.parseToJsonElement(text).jsonObject
        assertEquals("error", obj["type"]!!.jsonPrimitive.content)
        assertEquals("join first", obj["message"]!!.jsonPrimitive.content)
    }

    @Test
    fun `pong echoes t verbatim`() {
        val t = Json.parseToJsonElement("""{"v":1,"type":"ping","t":123}""").jsonObject["t"]
        val text = Outgoing.pong(t)
        val obj = Json.parseToJsonElement(text).jsonObject
        assertEquals(123, obj["t"]!!.jsonPrimitive.int)
    }
}
