package lol.lan.arcade.service

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/** The real lifecycle of the in-process LAN host, as reported by the service that owns it. */
enum class HostStatus {
    STOPPED,
    STARTING,
    RUNNING,
    ERROR,
}

data class HostRuntimeState(
    val status: HostStatus = HostStatus.STOPPED,
    val errorMessage: String? = null,
)

/**
 * Process-wide status bridge between [HostForegroundService] and the Compose UI.
 *
 * The service is deliberately the authority here: an Activity/ViewModel can be recreated while
 * the foreground service keeps serving players. Keeping this state outside the ViewModel means
 * reopening the app (including from its notification) reflects the host that is actually alive,
 * rather than presenting another Start button optimistically.
 */
object HostRuntime {
    private val _state = MutableStateFlow(HostRuntimeState())
    val state: StateFlow<HostRuntimeState> = _state.asStateFlow()

    internal fun markStarting() {
        _state.value = HostRuntimeState(status = HostStatus.STARTING)
    }

    internal fun markRunning() {
        _state.value = HostRuntimeState(status = HostStatus.RUNNING)
    }

    internal fun markStopped() {
        _state.value = HostRuntimeState(status = HostStatus.STOPPED)
    }

    internal fun markError(error: Throwable) {
        val message = generateSequence(error) { it.cause }
            .mapNotNull { it.message?.trim()?.takeIf(String::isNotEmpty) }
            .lastOrNull()
            ?: error.javaClass.simpleName.takeIf(String::isNotEmpty)
            ?: "Host failed to start"
        _state.value = HostRuntimeState(
            status = HostStatus.ERROR,
            errorMessage = message,
        )
    }
}
