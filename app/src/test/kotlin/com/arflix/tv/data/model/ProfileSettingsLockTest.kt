package com.arflix.tv.data.model

import com.google.common.truth.Truth.assertThat
import org.junit.Test

class ProfileSettingsLockTest {
    @Test
    fun `legacy profile does not require settings pin`() {
        val profile = Profile(name = "Legacy")

        assertThat(profile.hasSettingsPin()).isFalse()
        assertThat(profile.requiresSettingsPin()).isFalse()
    }

    @Test
    fun `lock without pin cannot block settings`() {
        val profile = Profile(name = "Incomplete", settingsLocked = true)

        assertThat(profile.requiresSettingsPin()).isFalse()
    }

    @Test
    fun `configured lock requires settings pin`() {
        val profile = Profile(
            name = "Protected",
            settingsPin = "salted-hash",
            settingsLocked = true
        )

        assertThat(profile.hasSettingsPin()).isTrue()
        assertThat(profile.requiresSettingsPin()).isTrue()
    }

    @Test
    fun `stored pin remains available while lock is disabled`() {
        val profile = Profile(
            name = "Temporarily open",
            settingsPin = "salted-hash",
            settingsLocked = false
        )

        assertThat(profile.hasSettingsPin()).isTrue()
        assertThat(profile.requiresSettingsPin()).isFalse()
    }
}
