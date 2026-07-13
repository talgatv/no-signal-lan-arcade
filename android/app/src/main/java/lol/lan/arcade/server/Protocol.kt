package lol.lan.arcade.server

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.longOrNull
import kotlinx.serialization.json.put

/** One player as reported in `lobby` messages. */
data class PlayerInfo(
    val id: String,
    val name: String,
    val ready: Boolean,
    val gameId: String,
    val isHost: Boolean,
)

/**
 * A parsed client→server message. Wraps the raw [JsonObject] so unknown/dynamic
 * fields (`payload`, `action`, `tick`) can be forwarded verbatim without the server
 * needing to understand game-specific shapes — mirrors `msg.get(...)` in pc/host.py.
 */
class IncomingMessage private constructor(private val obj: JsonObject) {
    val type: String? get() = string("type")

    fun string(key: String): String? = obj[key]?.jsonPrimitive?.contentOrNull
    fun bool(key: String, default: Boolean): Boolean = obj[key]?.jsonPrimitive?.booleanOrNull ?: default
    fun long(key: String): Long? = obj[key]?.jsonPrimitive?.longOrNull
    fun element(key: String): JsonElement? = obj[key]

    companion object {
        fun parse(raw: String): IncomingMessage = IncomingMessage(Json.parseToJsonElement(raw).jsonObject)

        fun parseOrNull(raw: String): IncomingMessage? = try {
            parse(raw)
        } catch (e: Exception) {
            null
        }
    }
}

/** Builders for every server→client message. Each returns compact JSON text. */
object Outgoing {

    private fun message(build: kotlinx.serialization.json.JsonObjectBuilder.() -> Unit): String =
        buildJsonObject {
            put("v", 1)
            build()
        }.toString()

    fun hello(playerId: String, isHost: Boolean, room: String): String = message {
        put("type", "hello")
        put("playerId", playerId)
        put("isHost", isHost)
        put("room", room)
    }

    fun lobby(players: List<PlayerInfo>, room: String): String = message {
        put("type", "lobby")
        put("players", buildJsonArray {
            players.forEach { p ->
                add(buildJsonObject {
                    put("id", p.id)
                    put("name", p.name)
                    put("ready", p.ready)
                    put("gameId", p.gameId)
                    put("isHost", p.isHost)
                })
            }
        })
        put("room", room)
    }

    fun chat(fromId: String, name: String, text: String): String = message {
        put("type", "chat")
        put("from", fromId)
        put("name", name)
        put("text", text)
    }

    fun gameStart(gameId: String, seed: Long, hostId: String?): String = message {
        put("type", "game:start")
        put("gameId", gameId)
        put("seed", seed)
        if (hostId != null) put("hostId", hostId) else put("hostId", JsonNull)
    }

    /** [type] is one of "game:action" | "game:state" | "game:event". Forwards action/payload/tick verbatim. */
    fun relay(type: String, fromId: String, incoming: IncomingMessage, nowMillis: Long): String = message {
        put("type", type)
        put("from", fromId)
        put("action", incoming.element("action") ?: JsonNull)
        put("payload", incoming.element("payload") ?: JsonNull)
        put("tick", incoming.element("tick") ?: JsonNull)
        put("t", incoming.long("t") ?: nowMillis)
    }

    fun pong(t: JsonElement?): String = message {
        put("type", "pong")
        put("t", t ?: JsonNull)
    }

    fun error(message: String): String = this.message {
        put("type", "error")
        put("message", message)
    }
}
