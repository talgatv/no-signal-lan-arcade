package lol.lan.arcade.ui

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import lol.lan.arcade.R
import lol.lan.arcade.ui.qr.qrCodeBitmap

@Composable
fun RunningScreen(state: HostUiState, onRefresh: () -> Unit, onStop: () -> Unit) {
    val context = LocalContext.current

    LaunchedEffect(state.running) {
        while (state.running) {
            onRefresh()
            delay(5000)
        }
    }

    LazyColumn(modifier = Modifier.fillMaxWidth().padding(24.dp)) {
        item {
            Text(stringResource(R.string.running_title), style = MaterialTheme.typography.headlineSmall)
            Spacer(Modifier.height(16.dp))
        }
        if (state.ips.isEmpty()) {
            item { Text(stringResource(R.string.running_no_ip)) }
        } else {
            items(state.ips) { ip ->
                val url = "http://$ip:${state.port}/"
                Text(url, style = MaterialTheme.typography.bodyLarge)
                val bitmap = remember(url) { qrCodeBitmap(url) }
                if (bitmap != null) {
                    Image(
                        bitmap = bitmap.asImageBitmap(),
                        contentDescription = url,
                        modifier = Modifier.size(200.dp).padding(vertical = 8.dp),
                    )
                }
                Spacer(Modifier.height(16.dp))
            }
        }

        item {
            Button(onClick = {
                val ip = state.ips.firstOrNull() ?: "127.0.0.1"
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse("http://$ip:${state.port}/"))
                context.startActivity(intent)
            }) { Text(stringResource(R.string.running_open_lobby)) }

            Spacer(Modifier.height(8.dp))
            Text(stringResource(R.string.running_hotspot_hint), style = MaterialTheme.typography.bodySmall)
            OutlinedButton(onClick = { openHotspotSettings(context) }) {
                Text(stringResource(R.string.running_hotspot_button))
            }

            Spacer(Modifier.height(24.dp))
            Button(onClick = onStop) { Text(stringResource(R.string.running_stop)) }
        }
    }
}

private fun openHotspotSettings(context: Context) {
    // Settings.ACTION_WIFI_TETHER_SETTING is not part of the public SDK — this action
    // string is the stable, widely-used way apps deep-link to hotspot settings anyway.
    val primary = Intent("android.settings.WIFI_TETHER_SETTINGS")
    val fallback = Intent(Settings.ACTION_WIRELESS_SETTINGS)
    try {
        context.startActivity(primary)
    } catch (e: Exception) {
        try {
            context.startActivity(fallback)
        } catch (e2: Exception) {
            // No settings screen resolvable on this OEM build — nothing more we can do here.
        }
    }
}
