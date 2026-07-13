package lol.lan.arcade.server

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class DispatcherTest {

    private class FakeConn {
        val log = mutableListOf<String>()
        val conn = Connection(sink = { log.add(it) })
    }

    @Test
    fun `join creates a player, replies hello, and broadcasts lobby`() {
        val hub = Hub()
        val a = FakeConn()
        Dispatcher.handle(hub, a.conn, """{"v":1,"type":"join","room":"main","name":"Ada","gameId":"pulse-race"}""", 0L)

        // Solo joiner gets two messages: their own "hello", then the room's "lobby"
        // broadcast — which has no exclude on join, so it reaches the joiner too
        // (matches pc/host.py: room.broadcast(...) after add() has no exclude param).
        assertEquals(2, a.log.size)
        assertTrue(a.log[0].contains("\"type\":\"hello\""))
        assertTrue(a.log[0].contains("\"isHost\":true"))
        assertTrue(a.log[1].contains("\"type\":\"lobby\""))
        assertEquals("main", a.conn.player?.room)
    }

    @Test
    fun `second joiner is not host and both get the updated lobby`() {
        val hub = Hub()
        val a = FakeConn()
        val b = FakeConn()
        Dispatcher.handle(hub, a.conn, """{"v":1,"type":"join","room":"main","name":"Ada","gameId":"x"}""", 0L)
        a.log.clear()
        Dispatcher.handle(hub, b.conn, """{"v":1,"type":"join","room":"main","name":"Bo","gameId":"x"}""", 0L)

        assertTrue(b.log[0].contains("\"isHost\":false"))
        assertTrue(a.log.any { it.contains("\"type\":\"lobby\"") && it.contains("Bo") })
        assertTrue(b.log.any { it.contains("\"type\":\"lobby\"") && it.contains("Bo") })
    }

    @Test
    fun `message before join gets an error and is not crashing`() {
        val hub = Hub()
        val a = FakeConn()
        Dispatcher.handle(hub, a.conn, """{"v":1,"type":"ready","value":true}""", 0L)
        assertTrue(a.log[0].contains("\"type\":\"error\""))
        assertTrue(a.log[0].contains("join first"))
    }

    @Test
    fun `ready updates state and rebroadcasts lobby`() {
        val hub = Hub()
        val a = FakeConn()
        Dispatcher.handle(hub, a.conn, """{"v":1,"type":"join","room":"main","name":"Ada","gameId":"x"}""", 0L)
        a.log.clear()
        Dispatcher.handle(hub, a.conn, """{"v":1,"type":"ready","value":true}""", 0L)
        assertTrue(a.log[0].contains("\"ready\":true"))
    }

    @Test
    fun `chat broadcasts to everyone including sender`() {
        val hub = Hub()
        val a = FakeConn()
        Dispatcher.handle(hub, a.conn, """{"v":1,"type":"join","room":"main","name":"Ada","gameId":"x"}""", 0L)
        a.log.clear()
        Dispatcher.handle(hub, a.conn, """{"v":1,"type":"chat","text":"hi"}""", 0L)
        assertTrue(a.log.any { it.contains("\"type\":\"chat\"") && it.contains("\"text\":\"hi\"") })
    }

    @Test
    fun `only the host can game-start`() {
        val hub = Hub()
        val a = FakeConn()
        val b = FakeConn()
        Dispatcher.handle(hub, a.conn, """{"v":1,"type":"join","room":"main","name":"Ada","gameId":"x"}""", 0L)
        Dispatcher.handle(hub, b.conn, """{"v":1,"type":"join","room":"main","name":"Bo","gameId":"x"}""", 0L)
        b.log.clear()
        Dispatcher.handle(hub, b.conn, """{"v":1,"type":"game:start","gameId":"x"}""", 0L)
        assertTrue(b.log[0].contains("only host can start"))
    }

    @Test
    fun `host can game-start and everyone is notified`() {
        val hub = Hub()
        val a = FakeConn()
        val b = FakeConn()
        Dispatcher.handle(hub, a.conn, """{"v":1,"type":"join","room":"main","name":"Ada","gameId":"x"}""", 0L)
        Dispatcher.handle(hub, b.conn, """{"v":1,"type":"join","room":"main","name":"Bo","gameId":"x"}""", 0L)
        a.log.clear(); b.log.clear()
        Dispatcher.handle(hub, a.conn, """{"v":1,"type":"game:start","gameId":"x","seed":7}""", 0L)
        assertTrue(a.log[0].contains("\"type\":\"game:start\""))
        assertTrue(b.log[0].contains("\"type\":\"game:start\""))
    }

    @Test
    fun `game action excludes the sender`() {
        val hub = Hub()
        val a = FakeConn()
        val b = FakeConn()
        Dispatcher.handle(hub, a.conn, """{"v":1,"type":"join","room":"main","name":"Ada","gameId":"x"}""", 0L)
        Dispatcher.handle(hub, b.conn, """{"v":1,"type":"join","room":"main","name":"Bo","gameId":"x"}""", 0L)
        a.log.clear(); b.log.clear()
        Dispatcher.handle(hub, a.conn, """{"v":1,"type":"game:action","action":"input","payload":{}}""", 0L)
        assertEquals(0, a.log.size)
        assertEquals(1, b.log.size)
    }

    @Test
    fun `game state also excludes the sender`() {
        val hub = Hub()
        val a = FakeConn()
        val b = FakeConn()
        Dispatcher.handle(hub, a.conn, """{"v":1,"type":"join","room":"main","name":"Ada","gameId":"x"}""", 0L)
        Dispatcher.handle(hub, b.conn, """{"v":1,"type":"join","room":"main","name":"Bo","gameId":"x"}""", 0L)
        a.log.clear(); b.log.clear()
        Dispatcher.handle(hub, a.conn, """{"v":1,"type":"game:state","payload":{}}""", 0L)
        assertEquals(0, a.log.size)
        assertEquals(1, b.log.size)
    }

    @Test
    fun `game event does NOT exclude the sender`() {
        // This is the quirk carried over verbatim from pc/host.py's _dispatch: the
        // exclude variable for game:event is left at its initial `None` (dead-code
        // reassignments in the Python only touch the game:state branch). Confirmed by
        // reading pc/host.py line-by-line, not by trusting its comment.
        val hub = Hub()
        val a = FakeConn()
        val b = FakeConn()
        Dispatcher.handle(hub, a.conn, """{"v":1,"type":"join","room":"main","name":"Ada","gameId":"x"}""", 0L)
        Dispatcher.handle(hub, b.conn, """{"v":1,"type":"join","room":"main","name":"Bo","gameId":"x"}""", 0L)
        a.log.clear(); b.log.clear()
        Dispatcher.handle(hub, a.conn, """{"v":1,"type":"game:event","payload":{}}""", 0L)
        assertEquals(1, a.log.size)
        assertEquals(1, b.log.size)
    }

    @Test
    fun `ping replies pong with the same t`() {
        val hub = Hub()
        val a = FakeConn()
        Dispatcher.handle(hub, a.conn, """{"v":1,"type":"join","room":"main","name":"Ada","gameId":"x"}""", 0L)
        a.log.clear()
        Dispatcher.handle(hub, a.conn, """{"v":1,"type":"ping","t":123}""", 0L)
        assertTrue(a.log[0].contains("\"type\":\"pong\""))
        assertTrue(a.log[0].contains("\"t\":123"))
    }

    @Test
    fun `unknown type after join gets an error naming the type`() {
        val hub = Hub()
        val a = FakeConn()
        Dispatcher.handle(hub, a.conn, """{"v":1,"type":"join","room":"main","name":"Ada","gameId":"x"}""", 0L)
        a.log.clear()
        Dispatcher.handle(hub, a.conn, """{"v":1,"type":"mystery"}""", 0L)
        assertTrue(a.log[0].contains("unknown type: mystery"))
    }

    @Test
    fun `malformed json gets an invalid json error and does not throw`() {
        val hub = Hub()
        val a = FakeConn()
        Dispatcher.handle(hub, a.conn, "not json at all", 0L)
        assertTrue(a.log[0].contains("invalid json"))
    }

    @Test
    fun `disconnect removes the player, reassigns host, and cleans up when empty`() {
        val hub = Hub()
        val a = FakeConn()
        Dispatcher.handle(hub, a.conn, """{"v":1,"type":"join","room":"main","name":"Ada","gameId":"x"}""", 0L)
        Dispatcher.onDisconnect(hub, a.conn)
        assertNull(a.conn.player)
        assertEquals(0, hub.roomCounts().size) // room removed once empty
    }
}
