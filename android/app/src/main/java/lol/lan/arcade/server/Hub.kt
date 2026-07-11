package lol.lan.arcade.server

import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

fun newPlayerId(): String = UUID.randomUUID().toString().replace("-", "").take(8)

/**
 * One connected participant. `send` delivers a raw JSON text frame to this player;
 * it is injected so this class has zero WebSocket/Ktor dependency and stays unit-testable.
 */
class Player(
    val id: String,
    name: String,
    val room: String,
    val gameId: String,
    val send: (String) -> Unit,
) {
    val name: String = name.take(24).ifBlank { "P-${id.take(4)}" }
    var ready: Boolean = false
}

class Room(val id: String) {
    private val players = LinkedHashMap<String, Player>()
    private val lock = Any()

    var hostId: String? = null
        private set

    fun add(player: Player) {
        synchronized(lock) {
            if (players.isEmpty()) hostId = player.id
            players[player.id] = player
        }
    }

    fun remove(playerId: String) {
        synchronized(lock) {
            players.remove(playerId)
            if (hostId == playerId) hostId = players.keys.firstOrNull()
        }
    }

    fun player(id: String): Player? = synchronized(lock) { players[id] }

    fun isEmpty(): Boolean = synchronized(lock) { players.isEmpty() }

    fun snapshot(): List<PlayerInfo> = synchronized(lock) {
        players.values.map { p ->
            PlayerInfo(p.id, p.name, p.ready, p.gameId, p.id == hostId)
        }
    }

    /** Sends [json] to every player except [exclude] (if given). Never throws — a dead sink is swallowed. */
    fun broadcast(json: String, exclude: String? = null) {
        val targets = synchronized(lock) { players.values.toList() }
        for (p in targets) {
            if (exclude != null && p.id == exclude) continue
            try {
                p.send(json)
            } catch (_: Exception) {
                // Matches pc/host.py: a broken connection must not break the broadcast loop.
            }
        }
    }
}

class Hub {
    private val rooms = ConcurrentHashMap<String, Room>()

    fun room(id: String): Room = rooms.getOrPut(id) { Room(id) }

    fun cleanupIfEmpty(id: String) {
        rooms[id]?.let { if (it.isEmpty()) rooms.remove(id, it) }
    }

    fun roomCounts(): Map<String, Int> = rooms.mapValues { it.value.snapshot().size }
}
