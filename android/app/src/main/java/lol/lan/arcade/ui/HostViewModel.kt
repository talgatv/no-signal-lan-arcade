package lol.lan.arcade.ui

import android.app.Application
import android.content.Intent
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import lol.lan.arcade.data.SettingsStore
import lol.lan.arcade.net.NetworkUtils
import lol.lan.arcade.service.HostForegroundService

data class HostUiState(
    val running: Boolean = false,
    val port: Int = SettingsStore.DEFAULT_PORT,
    val ips: List<String> = emptyList(),
    val keepScreenOn: Boolean = true,
    val language: String? = null,
)

class HostViewModel(application: Application) : AndroidViewModel(application) {
    private val settings = SettingsStore(application)
    private val _state = MutableStateFlow(HostUiState())
    val state: StateFlow<HostUiState> = _state

    init {
        viewModelScope.launch {
            settings.port.collect { p -> _state.update { it.copy(port = p) } }
        }
        viewModelScope.launch {
            settings.keepScreenOn.collect { v -> _state.update { it.copy(keepScreenOn = v) } }
        }
        viewModelScope.launch {
            settings.language.collect { v -> _state.update { it.copy(language = v) } }
        }
    }

    fun start() {
        val app = getApplication<Application>()
        val port = _state.value.port
        app.startService(
            Intent(app, HostForegroundService::class.java).putExtra(HostForegroundService.EXTRA_PORT, port)
        )
        _state.update { it.copy(running = true, ips = NetworkUtils.localIpv4Addresses()) }
    }

    fun stop() {
        val app = getApplication<Application>()
        app.stopService(Intent(app, HostForegroundService::class.java))
        _state.update { it.copy(running = false, ips = emptyList()) }
    }

    fun refreshIps() {
        if (_state.value.running) _state.update { it.copy(ips = NetworkUtils.localIpv4Addresses()) }
    }

    fun setPort(port: Int) {
        viewModelScope.launch { settings.setPort(port) }
    }

    fun setKeepScreenOn(enabled: Boolean) {
        viewModelScope.launch { settings.setKeepScreenOn(enabled) }
    }

    fun setLanguage(tag: String?) {
        viewModelScope.launch { settings.setLanguage(tag) }
    }
}
