package lol.lan.arcade.service

import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class HostRuntimeTest {
    @After
    fun resetRuntime() {
        HostRuntime.markStopped()
    }

    @Test
    fun `publishes real lifecycle transitions`() {
        HostRuntime.markStarting()
        assertEquals(HostStatus.STARTING, HostRuntime.state.value.status)

        HostRuntime.markRunning()
        assertEquals(HostStatus.RUNNING, HostRuntime.state.value.status)
        assertNull(HostRuntime.state.value.errorMessage)

        HostRuntime.markStopped()
        assertEquals(HostStatus.STOPPED, HostRuntime.state.value.status)
    }

    @Test
    fun `startup error keeps the deepest useful cause`() {
        val error = IllegalStateException("outer", IllegalArgumentException("port is already in use"))
        HostRuntime.markError(error)

        assertEquals(HostStatus.ERROR, HostRuntime.state.value.status)
        assertEquals("port is already in use", HostRuntime.state.value.errorMessage)
    }
}
