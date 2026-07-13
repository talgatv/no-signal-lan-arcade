package lol.lan.arcade.ui

/**
 * Picks one useful address for the invitation card instead of showing a QR code for every
 * interface (VPNs and virtual adapters included). The input order is retained within each
 * preference tier so Android's own interface order remains the final tie-breaker.
 */
fun preferredHostIp(addresses: List<String>): String? = addresses
    .mapIndexedNotNull { index, raw ->
        val octets = parseIpv4(raw) ?: return@mapIndexedNotNull null
        if (!isUsableGuestAddress(octets)) return@mapIndexedNotNull null
        RankedIpv4(normalized = octets.joinToString("."), rank = preferenceRank(octets), index = index)
    }
    .minWithOrNull(compareBy<RankedIpv4> { it.rank }.thenBy { it.index })
    ?.normalized

/** Canonical link guests should open; it lands directly on the game library. */
fun buildInviteUrl(ip: String?, port: Int, useHttps: Boolean): String? {
    if (ip == null) return null
    require(port in 1..65535) { "Port must be between 1 and 65535" }
    val octets = parseIpv4(ip) ?: return null
    val scheme = if (useHttps) "https" else "http"
    return "$scheme://${octets.joinToString(".")}:$port/games/hub/"
}

/** The host phone itself never needs a LAN address to open its own library. */
fun buildLocalPlayUrl(port: Int, useHttps: Boolean): String =
    requireNotNull(buildInviteUrl("127.0.0.1", port, useHttps))

private data class RankedIpv4(val normalized: String, val rank: Int, val index: Int)

private fun parseIpv4(raw: String): IntArray? {
    val parts = raw.trim().split('.')
    if (parts.size != 4) return null
    val octets = IntArray(4)
    for (index in parts.indices) {
        val part = parts[index]
        if (part.isEmpty() || part.any { !it.isDigit() }) return null
        val value = part.toIntOrNull() ?: return null
        if (value !in 0..255) return null
        octets[index] = value
    }
    return octets
}

private fun isUsableGuestAddress(ip: IntArray): Boolean {
    val first = ip[0]
    if (first == 0 || first == 127) return false
    if (first >= 224) return false // multicast, reserved, or limited broadcast
    return !(ip[0] == 255 && ip[1] == 255 && ip[2] == 255 && ip[3] == 255)
}

private fun preferenceRank(ip: IntArray): Int = when {
    ip[0] == 192 && ip[1] == 168 -> 0
    ip[0] == 172 && ip[1] in 16..31 -> 1
    ip[0] == 10 -> 2
    ip[0] == 169 && ip[1] == 254 -> 3
    ip[0] == 100 && ip[1] in 64..127 -> 4
    else -> 5
}
