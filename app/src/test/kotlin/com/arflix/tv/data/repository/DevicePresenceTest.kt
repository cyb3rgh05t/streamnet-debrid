package com.arflix.tv.data.repository

import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.awaitCancellation
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class DevicePresenceTest {
    @Test
    fun `authenticated foreground loop sends immediately and every 30 seconds`() = runTest {
        val auth = MutableStateFlow<AuthState>(AuthState.Loading)
        var sends = 0
        val job = backgroundScope.launch { runPresenceHeartbeats(auth) { sends++ } }
        runCurrent()
        assertEquals(0, sends)
        auth.value = AuthState.Authenticated("account-a", "demo@example.test", null)
        runCurrent()
        assertEquals(1, sends)
        advanceTimeBy(29_999)
        runCurrent()
        assertEquals(1, sends)
        advanceTimeBy(1)
        runCurrent()
        assertEquals(2, sends)
        auth.value = AuthState.NotAuthenticated
        runCurrent()
        advanceTimeBy(90_000)
        runCurrent()
        assertEquals(2, sends)
        auth.value = AuthState.Authenticated("account-b", "demo@example.test", null)
        runCurrent()
        assertEquals(3, sends)
        job.cancel()
        runCurrent()
        advanceTimeBy(90_000)
        runCurrent()
        assertEquals(3, sends)
    }

    @Test
    fun `logout and foreground-job cancellation cancel in-flight heartbeat`() = runTest {
        val auth = MutableStateFlow<AuthState>(AuthState.Authenticated("account-a", "demo@example.test", null))
        var cancelled = false
        val job = backgroundScope.launch {
            runPresenceHeartbeats(auth) {
                try {
                    awaitCancellation()
                } finally {
                    cancelled = true
                }
            }
        }
        runCurrent()
        auth.value = AuthState.NotAuthenticated
        runCurrent()
        assertTrue(cancelled)
        cancelled = false
        auth.value = AuthState.Authenticated("account-b", "demo@example.test", null)
        runCurrent()
        job.cancel()
        runCurrent()
        assertTrue(cancelled)
    }
}
