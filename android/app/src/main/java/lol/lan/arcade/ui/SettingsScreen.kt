package lol.lan.arcade.ui

import android.app.LocaleManager
import android.content.Context
import android.os.Build
import android.os.LocaleList
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import lol.lan.arcade.R

private val LANGUAGES: List<Pair<String?, String>> = listOf(
    null to "System default",
    "en" to "English",
    "zh" to "中文",
    "ru" to "Русский",
    "es" to "Español",
    "ar" to "العربية",
    "fr" to "Français",
)

@Composable
fun SettingsScreen(
    state: HostUiState,
    onPortChange: (Int) -> Unit,
    onKeepScreenOnChange: (Boolean) -> Unit,
    onLanguageChange: (String?) -> Unit,
    onBack: () -> Unit,
) {
    val context = LocalContext.current
    var portText by remember(state.port) { mutableStateOf(state.port.toString()) }

    Column(modifier = Modifier.fillMaxWidth().padding(24.dp)) {
        Text(stringResource(R.string.settings_title), style = MaterialTheme.typography.headlineSmall)
        Spacer(Modifier.height(24.dp))

        Text(stringResource(R.string.settings_language), style = MaterialTheme.typography.titleMedium)
        LANGUAGES.forEach { (tag, label) ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .selectable(selected = state.language == tag) {
                        onLanguageChange(tag)
                        applyAppLocale(context, tag)
                    },
                verticalAlignment = Alignment.CenterVertically,
            ) {
                RadioButton(
                    selected = state.language == tag,
                    onClick = {
                        onLanguageChange(tag)
                        applyAppLocale(context, tag)
                    },
                )
                Text(label)
            }
        }

        Spacer(Modifier.height(24.dp))
        Text(stringResource(R.string.settings_port), style = MaterialTheme.typography.titleMedium)
        OutlinedTextField(
            value = portText,
            onValueChange = { text ->
                portText = text.filter { it.isDigit() }.take(5)
                portText.toIntOrNull()?.let { if (it in 1024..65535) onPortChange(it) }
            },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            singleLine = true,
        )
        Text(stringResource(R.string.settings_port_hint), style = MaterialTheme.typography.bodySmall)

        Spacer(Modifier.height(24.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(stringResource(R.string.settings_keep_screen_on), modifier = Modifier.weight(1f))
            Switch(checked = state.keepScreenOn, onCheckedChange = onKeepScreenOnChange)
        }

        Spacer(Modifier.height(24.dp))
        TextButton(onClick = onBack) { Text(stringResource(R.string.settings_back)) }
    }
}

private fun applyAppLocale(context: Context, languageTag: String?) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        val localeManager = context.getSystemService(LocaleManager::class.java)
        localeManager.applicationLocales =
            if (languageTag == null) LocaleList.getEmptyLocaleList() else LocaleList.forLanguageTags(languageTag)
    }
}
