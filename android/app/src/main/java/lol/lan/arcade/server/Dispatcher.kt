package lol.lan.arcade.server

/** One live WebSocket connection. `player` is null until a `join` message arrives. */
class Connection(val sink: (String) -> Unit) {
    var player: Player? = null
}

/**
 * Ports `_dispatch()` / `_on_disconnect()` from `pc/host.py` line-for-line so the two
 * hosts speak the identical protocol. `nowMillis` is passed in rather than read from
 * the clock so behavior is deterministic in tests.
 */
object Dispatcher {

    fun handle(hub: Hub, conn: Connection, raw: String, nowMillis: Long) {
        val msg = IncomingMessage.parseOrNull(raw)
        if (msg == null) {
            conn.sink(Outgoing.error("invalid json"))
            return
        }

        if (msg.type == "join") {
            val name = msg.string("name") ?: "Player"
            val roomId = (msg.string("room") ?: "main").take(32)
            val gameId = (msg.string("gameId") ?: msg.string("game_id") ?: "").take(64)
            val room = hub.room(roomId)
            val player = Player(newPlayerId(), name, roomId, gameId, conn.sink)
            conn.player = player
            room.add(player)
            val isHost = room.hostId == player.id
            conn.sink(Outgoing.hello(player.id, isHost, roomId))
            room.broadcast(Outgoing.lobby(room.snapshot(), roomId))
            return
        }

        val player = conn.player
        if (player == null) {
            conn.sink(Outgoing.error("join first"))
            return
        }
        val room = hub.room(player.room)

        when (msg.type) {
            "ready" -> {
                player.ready = msg.bool("value", default = true)
                room.broadcast(Outgoing.lobby(room.snapshot(), room.id))
            }
            "chat" -> {
                val text = (msg.string("text") ?: "").take(200)
                room.broadcast(Outgoing.chat(player.id, player.name, text))
            }
            "game:start" -> {
                if (player.id != room.hostId) {
                    conn.sink(Outgoing.error("only host can start"))
                    return
                }
                val gameId = msg.string("gameId") ?: player.gameId
                val seed = msg.long("seed") ?: (nowMillis / 1000 % 10_000_000)
                room.broadcast(Outgoing.gameStart(gameId, seed, room.hostId))
            }
            "game:action", "game:state", "game:event" -> {
                val type = msg.type!!
                val out = Outgoing.relay(type, player.id, msg, nowMillis)
                // game:action and game:state exclude the sender; game:event does not.
                // (Verified against pc/host.py's actual control flow, not its comment.)
                val exclude = if (type == "game:event") null else player.id
                room.broadcast(out, exclude = exclude)
            }
            "ping" -> {
                conn.sink(Outgoing.pong(msg.element("t")))
            }
            else -> {
                conn.sink(Outgoing.error("unknown type: ${msg.type}"))
            }
        }
    }

    fun onDisconnect(hub: Hub, conn: Connection) {
        val player = conn.player ?: return
        val room = hub.room(player.room)
        room.remove(player.id)
        room.broadcast(Outgoing.lobby(room.snapshot(), room.id))
        hub.cleanupIfEmpty(player.room)
        conn.player = null
    }
}
