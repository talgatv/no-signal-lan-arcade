package lol.lan.arcade.server.tls

import io.ktor.network.tls.certificates.KeyType
import io.ktor.network.tls.certificates.buildKeyStore
import io.ktor.network.tls.extensions.HashAlgorithm
import io.ktor.network.tls.extensions.SignatureAlgorithm
import java.net.InetAddress
import java.security.KeyStore
import java.security.cert.X509Certificate
import javax.net.ssl.KeyManagerFactory
import javax.net.ssl.SSLContext

internal const val TLS_CERT_ALIAS = "ogh-host"
private const val PASSWORD = "ogh-local"

/**
 * Generates a fresh self-signed TLS certificate covering the given LAN IPs, matching how
 * pc/host.py's `ensure_self_signed_certs()` derives its SAN list from `local_ips()`.
 *
 * Held only in memory for the life of the running server — regenerated on every Start
 * (an RSA-2048 keypair takes well under a second) rather than persisted to disk. This
 * sidesteps needing to pick and round-trip an Android-compatible `KeyStore` file format
 * (Android's default keystore type is not guaranteed to be "JKS") for a marginal UX gain
 * (skipping a repeat browser security warning across restarts). Guests still only see the
 * "connection is not private" warning once per browser per server session.
 */
object TlsCertProvider {

    fun sslContext(ipAddresses: List<String>): SSLContext {
        val keyStore = buildServerKeyStore(ipAddresses)
        val kmf = KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm())
        kmf.init(keyStore, PASSWORD.toCharArray())
        val ctx = SSLContext.getInstance("TLS")
        ctx.init(kmf.keyManagers, null, null)
        return ctx
    }

    /** Exposed separately from [sslContext] so tests can inspect the generated certificate
     *  (e.g. confirm the SAN IP list) without needing a full TLS handshake. */
    internal fun buildServerKeyStore(ipAddresses: List<String>): KeyStore {
        val addresses = resolveAddresses(ipAddresses)
        return buildKeyStore {
            certificate(TLS_CERT_ALIAS) {
                password = PASSWORD
                hash = HashAlgorithm.SHA256
                sign = SignatureAlgorithm.RSA
                keySizeInBits = 2048
                daysValid = 825
                keyType = KeyType.Server
                domains = listOf("localhost", "ogh.local")
                this.ipAddresses = addresses
            }
        }
    }

    internal fun resolveAddresses(ipAddresses: List<String>): List<InetAddress> {
        val resolved = (ipAddresses + "127.0.0.1").distinct()
            .mapNotNull { runCatching { InetAddress.getByName(it) }.getOrNull() }
        return resolved.ifEmpty { listOf(InetAddress.getByName("127.0.0.1")) }
    }
}

internal fun KeyStore.certificateFor(alias: String): X509Certificate =
    getCertificate(alias) as X509Certificate
