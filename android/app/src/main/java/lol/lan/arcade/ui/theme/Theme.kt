package lol.lan.arcade.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val DarkColors = darkColorScheme(
    primary = OghAccent,
    onPrimary = OghBackground,
    secondary = OghAccentDark,
    background = OghBackground,
    surface = OghSurface,
    onBackground = OghOnDark,
    onSurface = OghOnDark,
)

private val LightColors = lightColorScheme(
    primary = OghAccentDark,
    secondary = OghAccent,
)

@Composable
fun OghHostTheme(content: @Composable () -> Unit) {
    val colors = if (isSystemInDarkTheme()) DarkColors else LightColors
    MaterialTheme(colorScheme = colors, content = content)
}
