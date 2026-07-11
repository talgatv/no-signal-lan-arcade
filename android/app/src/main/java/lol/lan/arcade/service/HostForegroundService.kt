package lol.lan.arcade.service

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import lol.lan.arcade.MainActivity
import lol.lan.arcade.R
import lol.lan.arcade.net.NetworkUtils
import lol.lan.arcade.server.ContentRoots
import lol.lan.arcade.server.OghServer
import lol.lan.arcade.server.RunningHostServer
import lol.lan.arcade.server.tls.HttpsOghServer
import lol.lan.arcade.server.tls.TlsCertProvider
import java.io.IOException

class HostForegroundService : Service() {

    private var server: RunningHostServer? = null
    private var wakeLock: PowerManager.WakeLock? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val port = intent?.getIntExtra(EXTRA_PORT, DEFAULT_PORT) ?: DEFAULT_PORT
        val useHttps = intent?.getBooleanExtra(EXTRA_USE_HTTPS, false) ?: false
        val notification = buildNotification(port, useHttps)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }

        if (server == null) {
            val contentRoots = ContentRoots(
                externalBaseDir = getExternalFilesDir(null) ?: filesDir,
                loadAssetBytes = { path ->
                    try {
                        assets.open(path).use { it.readBytes() }
                    } catch (e: IOException) {
                        null
                    }
                },
            )
            server = if (useHttps) {
                val sslContext = TlsCertProvider.sslContext(NetworkUtils.localIpv4Addresses())
                HttpsOghServer(port = port, contentRoots = contentRoots, sslContext = sslContext)
            } else {
                OghServer(port = port, contentRoots = contentRoots)
            }
            server?.start()
        }
        acquireWakeLock()
        return START_STICKY
    }

    override fun onDestroy() {
        server?.stop()
        server = null
        releaseWakeLock()
        super.onDestroy()
    }

    private fun acquireWakeLock() {
        if (wakeLock?.isHeld == true) return
        val pm = getSystemService(POWER_SERVICE) as PowerManager
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "lol.lan.arcade:host").apply {
            setReferenceCounted(false)
            acquire(12 * 60 * 60 * 1000L) // 12h safety cap so a crash can't wake-lock forever; released in onDestroy
        }
    }

    private fun releaseWakeLock() {
        wakeLock?.let { if (it.isHeld) it.release() }
        wakeLock = null
    }

    private fun buildNotification(port: Int, useHttps: Boolean): android.app.Notification {
        val channelId = "ogh_host"
        val nm = getSystemService(NotificationManager::class.java)
        if (nm.getNotificationChannel(channelId) == null) {
            nm.createNotificationChannel(
                NotificationChannel(channelId, getString(R.string.notif_channel_name), NotificationManager.IMPORTANCE_LOW)
            )
        }
        val openIntent = PendingIntent.getActivity(
            this, 0, Intent(this, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE,
        )
        val text = if (useHttps) getString(R.string.notif_text_https, port) else getString(R.string.notif_text, port)
        return NotificationCompat.Builder(this, channelId)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(getString(R.string.notif_title))
            .setContentText(text)
            .setContentIntent(openIntent)
            .setOngoing(true)
            .build()
    }

    companion object {
        const val EXTRA_PORT = "port"
        const val EXTRA_USE_HTTPS = "use_https"
        const val DEFAULT_PORT = 8080
        private const val NOTIFICATION_ID = 1
    }
}
