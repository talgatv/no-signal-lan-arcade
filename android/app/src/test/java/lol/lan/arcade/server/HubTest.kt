package lol.lan.arcade.server

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class HubTest {

    private fun sink(log: MutableList<String>): (String) -> Unit = { log.add(it) }

    @Test
    fun `first player to join a room becomes host`() {
        val room = Room("main")
        val a = Player("a", "Ada", "main", "pulse-race", sink(mutableListOf()))
        val b = Player("b", "Bo", "main", "pulse-race", sink(mutableListOf()))
        room.add(a)
        room.add(b)
        assertEquals("a", room.hostId)
    }

    @Test
    fun `host reassigns to next remaining player on leave`() {
        val room = Room("main")
        val a = Player("a", "Ada", "main", "x", sink(mutableListOf()))
        val b = Player("b", "Bo", "main", "x", sink(mutableListOf()))
        room.add(a)
        room.add(b)
        room.remove("a")
        assertEquals("b", room.hostId)
    }

    @Test
    fun `host becomes null when room empties`() {
        val room = Room("main")
        val a = Player("a", "Ada", "main", "x", sink(mutableListOf()))
        room.add(a)
        room.remove("a")
        assertNull(room.hostId)
        assertTrue(room.isEmpty())
    }

    @Test
    fun `broadcast reaches everyone by default`() {
        val logA = mutableListOf<String>()
        val logB = mutableListOf<String>()
        val room = Room("main")
        room.add(Player("a", "Ada", "main", "x", sink(logA)))
        room.add(Player("b", "Bo", "main", "x", sink(logB)))
        room.broadcast("hi")
        assertEquals(listOf("hi"), logA)
        assertEquals(listOf("hi"), logB)
    }

    @Test
    fun `broadcast excludes the given player`() {
        val logA = mutableListOf<String>()
        val logB = mutableListOf<String>()
        val room = Room("main")
        room.add(Player("a", "Ada", "main", "x", sink(logA)))
        room.add(Player("b", "Bo", "main", "x", sink(logB)))
        room.broadcast("hi", exclude = "a")
        assertEquals(emptyList<String>(), logA)
        assertEquals(listOf("hi"), logB)
    }

    @Test
    fun `broadcast does not fail when one sink throws`() {
        val room = Room("main")
        room.add(Player("a", "Ada", "main", "x") { throw RuntimeException("closed") })
        val logB = mutableListOf<String>()
        room.add(Player("b", "Bo", "main", "x", sink(logB)))
        room.broadcast("hi") // must not throw
        assertEquals(listOf("hi"), logB)
    }

    @Test
    fun `snapshot reflects ready state and host flag`() {
        val room = Room("main")
        val a = Player("a", "Ada", "main", "x", sink(mutableListOf()))
        a.ready = true
        room.add(a)
        val snap = room.snapshot()
        assertEquals(1, snap.size)
        assertEquals(PlayerInfo("a", "Ada", ready = true, gameId = "x", isHost = true), snap[0])
    }

    @Test
    fun `hub returns the same room instance for the same id`() {
        val hub = Hub()
        assertTrue(hub.room("main") === hub.room("main"))
    }

    @Test
    fun `hub cleans up an empty room`() {
        val hub = Hub()
        val room = hub.room("main")
        room.add(Player("a", "Ada", "main", "x", sink(mutableListOf())))
        room.remove("a")
        hub.cleanupIfEmpty("main")
        assertTrue(hub.room("main") !== room) // a fresh Room was created — old one was dropped
    }

    @Test
    fun `hub does not clean up a non-empty room`() {
        val hub = Hub()
        val room = hub.room("main")
        room.add(Player("a", "Ada", "main", "x", sink(mutableListOf())))
        hub.cleanupIfEmpty("main")
        assertTrue(hub.room("main") === room)
    }

    @Test
    fun `roomCounts reports player counts per room`() {
        val hub = Hub()
        hub.room("main").add(Player("a", "Ada", "main", "x", sink(mutableListOf())))
        hub.room("side").add(Player("b", "Bo", "side", "x", sink(mutableListOf())))
        hub.room("side").add(Player("c", "Cy", "side", "x", sink(mutableListOf())))
        assertEquals(mapOf("main" to 1, "side" to 2), hub.roomCounts())
    }

    @Test
    fun `newPlayerId produces 8-char unique ids`() {
        val ids = (1..50).map { newPlayerId() }
        assertTrue(ids.all { it.length == 8 })
        assertEquals(ids.size, ids.toSet().size)
    }
}
