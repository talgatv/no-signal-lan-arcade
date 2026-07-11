package lol.lan.arcade.server

import io.ktor.server.engine.EmbeddedServer
import io.ktor.server.engine.connector
import io.ktor.server.engine.embeddedServer
import io.ktor.server.engine.sslConnector
import io.ktor.server.netty.Netty
import io.ktor.server.netty.NettyApplicationEngine
import lol.lan.arcade.server.tls.TLS_CERT_ALIAS
import lol.lan.arcade.server.tls.TLS_CERT_PASSWORD
import lol.lan.arcade.server.tls.TlsCertProvider

/**
 * Ktor's Netty engine, unlike CIO, has native TLS support via [sslConnector] — no hand-rolled
 * socket/HTTP/WebSocket framing needed the way [lol.lan.arcade.server.tls.HttpsOghServer] required
 * for CIO. Same [installOghRouting] as [OghServer] either way, so both engines serve identical
 * routes; only the connector (plain vs TLS) and the engine class differ.
 *
 * Kept alongside, not replacing, [OghServer]/[HttpsOghServer] for now — this is the experimental
 * side of an A/B comparison (APK size, behavior) against the existing CIO+hand-rolled-TLS pair.
 */
class NettyOghServer(
    private val port: Int,
    private val contentRoots: ContentRoots,
    private val useHttps: Boolean,
    private val ipAddresses: List<String> = emptyList(),
) : RunningHostServer {
    private val hub = Hub()
    private var engine: EmbeddedServer<NettyApplicationEngine, NettyApplicationEngine.Configuration>? = null

    override fun start() {
        if (engine != null) return
        engine = embeddedServer(
            factory = Netty,
            configure = {
                if (useHttps) {
                    val keyStore = TlsCertProvider.buildServerKeyStore(ipAddresses)
                    sslConnector(
                        keyStore = keyStore,
                        keyAlias = TLS_CERT_ALIAS,
                        keyStorePassword = { TLS_CERT_PASSWORD.toCharArray() },
                        privateKeyPassword = { TLS_CERT_PASSWORD.toCharArray() },
                    ) {
                        host = "0.0.0.0"
                        port = this@NettyOghServer.port
                    }
                } else {
                    connector {
                        host = "0.0.0.0"
                        port = this@NettyOghServer.port
                    }
                }
            },
        ) {
            installOghRouting(hub, contentRoots)
        }.start(wait = false)
    }

    override fun stop() {
        engine?.stop(1000, 2000)
        engine = null
    }
}
