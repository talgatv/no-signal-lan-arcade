package lol.lan.arcade.ui

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import lol.lan.arcade.R

@Composable
fun HomeScreen(state: HostUiState, onStart: () -> Unit, onOpenSettings: () -> Unit) {
    val context = LocalContext.current

    // Android 13+ requires POST_NOTIFICATIONS as a runtime permission — declaring it in
    // the manifest alone (already done) is not enough. Without this grant the foreground
    // service still runs and the LAN server still works (confirmed on-device: /api/health
    // kept responding after backgrounding either way), but the "server is running"
    // notification silently never posts, so a real user has no visible confirmation or
    // quick way back into the app. Ask once, right when the action that needs it happens.
    val requestNotificationPermission = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { onStart() }

    fun startHosting() {
        val needsPermission = Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) !=
            PackageManager.PERMISSION_GRANTED
        if (needsPermission) {
            requestNotificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
        } else {
            onStart()
        }
    }

    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(stringResource(R.string.app_name), style = MaterialTheme.typography.headlineMedium)
        Text(stringResource(R.string.home_tagline), style = MaterialTheme.typography.bodyMedium)
        Button(onClick = { startHosting() }, modifier = Modifier.padding(top = 24.dp)) {
            Text(stringResource(R.string.home_start))
        }
        TextButton(onClick = onOpenSettings, modifier = Modifier.padding(top = 8.dp)) {
            Text(stringResource(R.string.settings_title))
        }
    }
}
