package lol.lan.arcade.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController

object Routes {
    const val HOME = "home"
    const val RUNNING = "running"
    const val SETTINGS = "settings"
}

@Composable
fun AppNav() {
    val nav: NavHostController = rememberNavController()
    val viewModel: HostViewModel = viewModel()
    val state by viewModel.state.collectAsState()

    NavHost(navController = nav, startDestination = Routes.HOME) {
        composable(Routes.HOME) {
            HomeScreen(
                state = state,
                onStart = {
                    viewModel.start()
                    nav.navigate(Routes.RUNNING)
                },
                onOpenSettings = { nav.navigate(Routes.SETTINGS) },
            )
        }
        composable(Routes.RUNNING) {
            RunningScreen(
                state = state,
                onRefresh = viewModel::refreshIps,
                onStop = {
                    viewModel.stop()
                    nav.popBackStack(Routes.HOME, inclusive = false)
                },
            )
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
