package lol.lan.arcade.server.tls

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.security.cert.X509Certificate

class TlsCertProviderTest {

    @Test
    fun `resolveAddresses always includes loopback and dedupes`() {
        val addresses = TlsCertProvider.resolveAddresses(listOf("192.168.1.50", "127.0.0.1"))
        val text = addresses.map { it.hostAddress }
        assertTrue(text.contains("192.168.1.50"))
        assertTrue(text.contains("127.0.0.1"))
        assertEquals(2, text.size) // deduped, not three
    }

    @Test
    fun `resolveAddresses falls back to loopback only when given nothing usable`() {
        val addresses = TlsCertProvider.resolveAddresses(emptyList())
        assertEquals(listOf("127.0.0.1"), addresses.map { it.hostAddress })
    }

    @Test
    fun `generated certificate is a valid self-signed X509 cert covering the given LAN IP`() {
        val keyStore = TlsCertProvider.buildServerKeyStore(listOf("192.168.1.213"))
        val cert = keyStore.certificateFor(TLS_CERT_ALIAS)

        // Self-signed: verifying against its own public key must succeed.
        cert.verify(cert.publicKey)
        cert.checkValidity()

        val sanIps = (cert.subjectAlternativeNames ?: emptyList<List<*>>())
            .filter { (it[0] as Int) == 7 } // GeneralName type 7 = iPAddress
            .map { it[1] as String }
        assertTrue("expected 192.168.1.213 in SAN, got $sanIps", sanIps.contains("192.168.1.213"))
        assertTrue("expected 127.0.0.1 in SAN, got $sanIps", sanIps.contains("127.0.0.1"))
    }

    @Test
    fun `sslContext initializes without throwing`() {
        val ctx = TlsCertProvider.sslContext(listOf("192.168.1.213"))
        assertEquals("TLS", ctx.protocol)
        // A real, usable SSLContext exposes a working socket factory.
        val factory = ctx.serverSocketFactory
        assertTrue(factory.defaultCipherSuites.isNotEmpty())
    }

    @Test
    fun `each call generates an independent keypair`() {
        val certA = TlsCertProvider.buildServerKeyStore(listOf("192.168.1.213")).certificateFor(TLS_CERT_ALIAS)
        val certB = TlsCertProvider.buildServerKeyStore(listOf("192.168.1.213")).certificateFor(TLS_CERT_ALIAS)
        assertTrue(!certA.publicKey.equals(certB.publicKey) || !certA.serialNumber.equals(certB.serialNumber))
    }
}
