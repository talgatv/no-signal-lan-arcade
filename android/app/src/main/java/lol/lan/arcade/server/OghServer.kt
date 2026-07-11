package lol.lan.arcade.server

import io.ktor.http.ContentType
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.Application
import io.ktor.server.application.call
import io.ktor.server.application.install
import io.ktor.server.cio.CIO
import io.ktor.server.engine.EmbeddedServer
import io.ktor.server.engine.embeddedServer
import io.ktor.server.response.respondBytes
import io.ktor.server.response.respondRedirect
import io.ktor.server.response.respondText
import io.ktor.server.routing.get
import io.ktor.server.routing.routing
import io.ktor.server.websocket.WebSockets
import io.ktor.server.websocket.webSocket
import io.ktor.websocket.Frame
import io.ktor.websocket.readText
import kotlinx.coroutines.channels.consumeEach
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

private const val MAX_WS_FRAME_BYTES = 2L * 1024 * 1024 // PTT clips base64-encode up to ~900 KB text (lan-chat MAX_B64)

internal fun guessContentType(path: String): ContentType = ContentType.parse(guessContentTypeString(path))

/** Registers the WebSocket plugin and all HTTP/WS routes on [Application]. Shared by
 *  production (OghServer.start) and tests (OghServerRouteTest), so both exercise the
 *  exact same route wiring. */
fun Application.installOghRouting(hub: Hub, contentRoots: ContentRoots) {
    install(WebSockets) {
        pingPeriodMillis = 30_000L
        timeoutMillis = 60_000L
        maxFrameSize = MAX_WS_FRAME_BYTES
        masking = false
    }
    routing {
        webSocket("/ws") {
            val conn = Connection(sink = { text -> outgoing.trySend(Frame.Text(text)) })
            try {
                incoming.consumeEach { frame ->
                    if (frame is Frame.Text) {
                        Dispatcher.handle(hub, conn, frame.readText(), System.currentTimeMillis())
                    }
                }
            } finally {
                Dispatcher.onDisconnect(hub, conn)
            }
        }

        get("/api/health") {
            val body = buildJsonObject {
                put("ok", true)
                put("rooms", hub.roomCounts().size)
                put("v", 1)
            }.toString()
            call.respondText(body, ContentType.Application.Json)
        }

        get("/api/rooms") {
            val body = buildJsonObject {
                put("rooms", buildJsonObject { hub.roomCounts().forEach { (id, n) -> put(id, n) } })
            }.toString()
            call.respondText(body, ContentType.Application.Json)
        }

        get("/{path...}") {
            val raw = "/" + call.parameters.getAll("path").orEmpty().joinToString("/")
            if (raw in RouteResolver.HUB_REDIRECT_PATHS) {
                call.respondRedirect("/games/hub/", permanent = false)
                return@get
            }
            val resolved = RouteResolver.resolve(raw)
            val loaded = contentRoots.load(resolved.root, resolved.relativePath)
            if (loaded == null) {
                call.respondText("Not found", ContentType.Text.Plain, HttpStatusCode.NotFound)
            } else {
                call.respondBytes(loaded.bytes, guessContentType(loaded.matchedPath))
            }
        }

        get("/") {
            val resolved = RouteResolver.resolve("/")
            val loaded = contentRoots.load(resolved.root, resolved.relativePath)
            if (loaded == null) {
                call.respondText("Not found", ContentType.Text.Plain, HttpStatusCode.NotFound)
            } else {
                call.respondBytes(loaded.bytes, guessContentType(loaded.matchedPath))
            }
        }
    }
}

class OghServer(private val port: Int, private val contentRoots: ContentRoots) : RunningHostServer {
    private val hub = Hub()
    private var engine: EmbeddedServer<*, *>? = null

    override fun start() {
        if (engine != null) return
        engine = embeddedServer(CIO, host = "0.0.0.0", port = port) {
            installOghRouting(hub, contentRoots)
        }.start(wait = false)
    }

    override fun stop() {
        engine?.stop(1000, 2000)
        engine = null
    }
}
