package com.arflix.tv.ui.screens.details

import androidx.lifecycle.Lifecycle
import com.google.common.truth.Truth.assertThat
import org.junit.Test

class DetailsResumeRefreshGateTest {
    @Test
    fun `initial resume does not refresh details`() {
        val gate = DetailsResumeRefreshGate()

        assertThat(gate.onEvent(Lifecycle.Event.ON_RESUME)).isFalse()
    }

    @Test
    fun `first resume after leaving details refreshes play target`() {
        val gate = DetailsResumeRefreshGate()

        assertThat(gate.onEvent(Lifecycle.Event.ON_PAUSE)).isFalse()
        assertThat(gate.onEvent(Lifecycle.Event.ON_RESUME)).isTrue()
    }

    @Test
    fun `repeated resume without leaving does not refresh again`() {
        val gate = DetailsResumeRefreshGate()

        gate.onEvent(Lifecycle.Event.ON_PAUSE)
        assertThat(gate.onEvent(Lifecycle.Event.ON_RESUME)).isTrue()
        assertThat(gate.onEvent(Lifecycle.Event.ON_RESUME)).isFalse()
    }
}