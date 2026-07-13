package lol.lan.arcade.server

/** Common shape of [OghServer] (plain HTTP, Ktor CIO) and
 *  [lol.lan.arcade.server.tls.HttpsOghServer] (hand-rolled HTTPS), so
 *  [lol.lan.arcade.service.HostForegroundService] can hold either without caring which. */
interface RunningHostServer {
    fun start()
    fun stop()
}
