package lol.lan.arcade.net

import java.net.Inet4Address
import java.net.NetworkInterface
import java.util.Collections

object NetworkUtils {
    /** All non-loopback IPv4 addresses on any "up" interface — mirrors local_ips() in pc/host.py. */
    fun localIpv4Addresses(): List<String> = try {
        Collections.list(NetworkInterface.getNetworkInterfaces())
            .asSequence()
            .filter { it.isUp && !it.isLoopback }
            .flatMap { iface -> Collections.list(iface.inetAddresses).asSequence() }
            .filterIsInstance<Inet4Address>()
            .mapNotNull { it.hostAddress }
            .filter { it.isNotBlank() }
            .distinct()
            .toList()
    } catch (e: Exception) {
        emptyList()
    }
}
