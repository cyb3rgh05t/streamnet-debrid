package com.arflix.tv.util

import androidx.datastore.preferences.core.mutablePreferencesOf
import com.google.common.truth.Truth.assertThat
import org.junit.Test

class ProfileAccentColorTest {

    @Test
    fun `each profile resolves its own accent color`() {
        val preferences = mutablePreferencesOf(
            profileAccentColorKey("primary") to "Blue",
            profileAccentColorKey("secondary") to "Green",
            ACCENT_COLOR_KEY to "Orange"
        )

        assertThat(readProfileAccentColor(preferences, "primary")).isEqualTo("Blue")
        assertThat(readProfileAccentColor(preferences, "secondary")).isEqualTo("Green")
    }

    @Test
    fun `profile without accent uses legacy global color`() {
        val preferences = mutablePreferencesOf(ACCENT_COLOR_KEY to "Violet")

        assertThat(readProfileAccentColor(preferences, "primary")).isEqualTo("Violet")
    }
}