package lol.lan.arcade.ui

import android.app.Activity
import android.app.LocaleManager
import android.content.Context
import android.content.res.Configuration
import android.content.res.Resources
import android.os.Build
import android.os.LocaleList
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import lol.lan.arcade.R
import java.util.Locale

private data class LanguageOption(val tag: String?, val label: String)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    state: HostUiState,
    onPortChange: (Int) -> Unit,
    onKeepScreenOnChange: (Boolean) -> Unit,
    onLanguageChange: (String?) -> Unit,
    onUseHttpsChange: (Boolean) -> Unit,
    onBack: () -> Unit,
) {
    val context = LocalContext.current
    var portText by remember(state.port) { mutableStateOf(state.port.toString()) }
    var languageMenuOpen by remember { mutableStateOf(false) }
    var advancedOpen by rememberSaveable { mutableStateOf(false) }

    val languages = listOf(
        LanguageOption(null, stringResource(R.string.settings_system_language)),
        LanguageOption("en", "English"),
        LanguageOption("zh", "中文"),
        LanguageOption("ru", "Русский"),
        LanguageOption("es", "Español"),
        LanguageOption("ar", "العربية"),
        LanguageOption("fr", "Français"),
    )
    val selectedLanguage = languages.firstOrNull { it.tag == state.language } ?: languages.first()
    val parsedPort = portText.toIntOrNull()
    val validPort = parsedPort != null && parsedPort in 1024..65535

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = stringResource(R.string.settings_title),
                        fontWeight = FontWeight.Bold,
                    )
                },
                actions = {
                    TextButton(onClick = onBack) {
                        Text(stringResource(R.string.settings_done))
                    }
                },
            )
        },
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
            contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 8.dp, bottom = 36.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            item {
                Text(
                    text = stringResource(R.string.settings_intro),
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            item {
                SettingsCard {
                    Text(
                        text = stringResource(R.string.settings_language),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Box(modifier = Modifier.fillMaxWidth()) {
                        OutlinedButton(
                            onClick = { languageMenuOpen = true },
                            modifier = Modifier
                                .fillMaxWidth()
                                .heightIn(min = 52.dp),
                        ) {
                            Text(selectedLanguage.label)
                        }
                        DropdownMenu(
                            expanded = languageMenuOpen,
                            onDismissRequest = { languageMenuOpen = false },
                            modifier = Modifier.fillMaxWidth(0.86f),
                        ) {
                            languages.forEach { option ->
                                DropdownMenuItem(
                                    text = {
                                        Text(
                                            text = option.label,
                                            fontWeight = if (option.tag == selectedLanguage.tag) {
                                                FontWeight.Bold
                                            } else {
                                                FontWeight.Normal
                                            },
                                        )
                                    },
                                    onClick = {
                                        languageMenuOpen = false
                                        onLanguageChange(option.tag)
                                        applyAppLocale(context, option.tag)
                                    },
                                )
                            }
                        }
                    }
                }
            }

            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceContainer,
                    ),
                    shape = MaterialTheme.shapes.extraLarge,
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .toggleable(
                                value = state.keepScreenOn,
                                role = Role.Switch,
                                onValueChange = onKeepScreenOnChange,
                            )
                            .padding(18.dp),
                        horizontalArrangement = Arrangement.spacedBy(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            text = stringResource(R.string.settings_keep_invite_visible),
                            modifier = Modifier.weight(1f),
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Medium,
                        )
                        Switch(
                            checked = state.keepScreenOn,
                            onCheckedChange = null,
                        )
                    }
                }
            }

            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceContainer,
                    ),
                    shape = MaterialTheme.shapes.extraLarge,
                ) {
                    Column(
                        modifier = Modifier.padding(18.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        Text(
                            text = stringResource(R.string.settings_advanced),
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold,
                        )

                        TextButton(
                            onClick = { advancedOpen = !advancedOpen },
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text(
                                if (advancedOpen) {
                                    stringResource(R.string.settings_hide_advanced)
                                } else {
                                    stringResource(R.string.settings_show_advanced)
                                }
                            )
                        }

                        if (advancedOpen) {
                            if (state.isActive) {
                                Text(
                                    text = stringResource(R.string.settings_advanced_running),
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.tertiary,
                                )
                            }

                            Text(
                                text = stringResource(R.string.settings_port),
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.SemiBold,
                            )
                            OutlinedTextField(
                                value = portText,
                                onValueChange = { text ->
                                    portText = text.filter(Char::isDigit).take(5)
                                    portText.toIntOrNull()
                                        ?.takeIf { it in 1024..65535 }
                                        ?.let(onPortChange)
                                },
                                modifier = Modifier.fillMaxWidth(),
                                enabled = !state.isActive,
                                isError = portText.isNotEmpty() && !validPort,
                                supportingText = {
                                    Text(stringResource(R.string.settings_port_hint))
                                },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                singleLine = true,
                            )

                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .toggleable(
                                        value = state.useHttps,
                                        enabled = !state.isActive,
                                        role = Role.Switch,
                                        onValueChange = onUseHttpsChange,
                                    )
                                    .padding(top = 8.dp),
                                horizontalArrangement = Arrangement.spacedBy(16.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = stringResource(R.string.settings_use_https),
                                        style = MaterialTheme.typography.titleSmall,
                                        fontWeight = FontWeight.SemiBold,
                                    )
                                    Text(
                                        text = stringResource(R.string.settings_use_https_hint),
                                        modifier = Modifier.padding(top = 4.dp),
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                                Switch(
                                    checked = state.useHttps,
                                    onCheckedChange = null,
                                    enabled = !state.isActive,
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SettingsCard(content: @Composable ColumnScope.() -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainer,
        ),
        shape = MaterialTheme.shapes.extraLarge,
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            content = content,
        )
    }
}

private fun applyAppLocale(context: Context, languageTag: String?) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        val localeManager = context.getSystemService(LocaleManager::class.java)
        localeManager.applicationLocales =
            if (languageTag == null) LocaleList.getEmptyLocaleList()
            else LocaleList.forLanguageTags(languageTag)
    } else {
        val locale = languageTag
            ?.let(Locale::forLanguageTag)
            ?: Resources.getSystem().configuration.locales[0]
        Locale.setDefault(locale)
        val configuration = Configuration(context.resources.configuration).apply {
            setLocale(locale)
            setLayoutDirection(locale)
        }
        @Suppress("DEPRECATION")
        context.resources.updateConfiguration(configuration, context.resources.displayMetrics)
        (context as? Activity)?.recreate()
    }
}
