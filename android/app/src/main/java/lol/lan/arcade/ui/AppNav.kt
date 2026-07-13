package lol.lan.arcade.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.platform.LocalView
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController

object Routes {
    const val HOME = "home"
    const val SETTINGS = "settings"
}

@Composable
fun AppNav() {
    val nav = rememberNavController()
    val viewModel: HostViewModel = viewModel()
    val state by viewModel.state.collectAsState()
    val view = LocalView.current

    // Keeping the invitation visible is useful only while this screen is actually
    // hosting. Restore the window's previous policy when hosting stops or the UI leaves.
    DisposableEffect(view, state.isActive, state.keepScreenOn) {
        val previous = view.keepScreenOn
        view.keepScreenOn = state.isActive && state.keepScreenOn
        onDispose { view.keepScreenOn = previous }
    }

    NavHost(navController = nav, startDestination = Routes.HOME) {
        composable(Routes.HOME) {
            // Home and Running are two states of the same destination. The foreground
            // service is the source of truth, so Back/recreate can never reveal a false
            // "stopped" Home screen while nearby players are still connected.
            if (state.isActive) {
                RunningScreen(
                    state = state,
                    onRefresh = viewModel::refreshIps,
                    onStop = viewModel::stop,
                )
            } else {
                HomeScreen(
                    state = state,
                    onStart = viewModel::start,
                    onOpenSettings = { nav.navigate(Routes.SETTINGS) },
                )
            }
        }

        composable(Routes.SETTINGS) {
            SettingsScreen(
                state = state,
                onPortChange = viewModel::setPort,
                onKeepScreenOnChange = viewModel::setKeepScreenOn,
                onLanguageChange = viewModel::setLanguage,
                onUseHttpsChange = viewModel::setUseHttps,
                onBack = { nav.popBackStack() },
            )
        }
    }
}
