package lol.lan.arcade.ui

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
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import lol.lan.arcade.R

@Composable
fun HomeScreen(state: HostUiState, onStart: () -> Unit, onOpenSettings: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(stringResource(R.string.app_name), style = MaterialTheme.typography.headlineMedium)
        Text(stringResource(R.string.home_tagline), style = MaterialTheme.typography.bodyMedium)
        Button(onClick = onStart, modifier = Modifier.padding(top = 24.dp)) {
            Text(stringResource(R.string.home_start))
        }
        TextButton(onClick = onOpenSettings, modifier = Modifier.padding(top = 8.dp)) {
            Text(stringResource(R.string.settings_title))
        }
    }
}
