package lol.lan.arcade.ui

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Test

class InviteLinksTest {
    @Test
    fun `prefers a common private LAN address over VPN and public addresses`() {
        assertEquals(
            "192.168.43.1",
            preferredHostIp(listOf("8.8.8.8", "10.8.0.2", "172.20.0.1", "192.168.43.1")),
        )
    }

    @Test
    fun `keeps input order when addresses share the same preference`() {
        assertEquals(
            "192.168.1.20",
            preferredHostIp(listOf("192.168.1.20", "192.168.43.1")),
        )
    }

    @Test
    fun `ignores loopback multicast and malformed addresses`() {
        assertNull(preferredHostIp(listOf("127.0.0.1", "224.0.0.1", "999.1.1.1", "not-an-ip")))
    }

    @Test
    fun `normalizes the selected IPv4 address`() {
        assertEquals("192.168.1.2", preferredHostIp(listOf(" 192.168.001.002 ")))
    }

    @Test
    fun `builds the canonical HTTP game-library link`() {
        assertEquals("http://192.168.1.20:8080/games/hub/", buildInviteUrl("192.168.1.20", 8080, false))
    }

    @Test
    fun `builds HTTPS guest and loopback host links`() {
        assertEquals(
            "https://10.0.0.5:8443/games/hub/",
            buildInviteUrl(preferredHostIp(listOf("10.0.0.5")), 8443, true),
        )
        assertEquals("https://127.0.0.1:8443/games/hub/", buildLocalPlayUrl(8443, true))
    }

    @Test
    fun `returns null when no guest address is available`() {
        assertNull(buildInviteUrl(null, 8080, false))
        assertNull(buildInviteUrl("not-an-ip", 8080, false))
    }

    @Test
    fun `rejects an invalid port`() {
        assertThrows(IllegalArgumentException::class.java) {
            buildInviteUrl("192.168.1.20", 70_000, false)
        }
    }
}
