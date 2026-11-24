package com.arflix.tv.util

import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.mutablePreferencesOf
import androidx.datastore.preferences.core.stringPreferencesKey
import com.google.common.truth.Truth.assertThat
import org.junit.Test

class ProfileScopedSettingsTest {
    private val legacyOled = booleanPreferencesKey("oled_black_background")
    private val legacyModel = stringPreferencesKey("subtitle_ai_model")
    private val oled = ProfileSettingName.OLED_BLACK_BACKGROUND

    @Test
    fun `profiles keep their own value`() {
        val prefs = mutablePreferencesOf(
            profileBooleanSettingKey("kids", oled) to true,
            profileBooleanSettingKey("adult", oled) to false,
        )
        assertThat(readProfileBoolean(prefs, "kids", oled, legacyOled, false)).isTrue()
        assertThat(readProfileBoolean(prefs, "adult", oled, legacyOled, true)).isFalse()
    }

    @Test
    fun `a value stored before the change counts for every profile until it is changed`() {
        val prefs = mutablePreferencesOf(
            legacyOled to true,
            profileBooleanSettingKey("adult", oled) to false,
        )
        assertThat(readProfileBoolean(prefs, "kids", oled, legacyOled, false)).isTrue()
        // A profile that changed it afterwards keeps its own choice.
        assertThat(readProfileBoolean(prefs, "adult", oled, legacyOled, true)).isFalse()
    }

    @Test
    fun `nothing stored yields null or the default`() {
        val prefs = mutablePreferencesOf()
        assertThat(readProfileBooleanOrNull(prefs, "kids", oled, legacyOled)).isNull()
        assertThat(readProfileBoolean(prefs, "kids", oled, legacyOled, true)).isTrue()
        assertThat(readProfileBoolean(prefs, null, oled, legacyOled, false)).isFalse()
        assertThat(readProfileStringOrNull(prefs, "kids", ProfileSettingName.SUBTITLE_AI_MODEL, legacyModel)).isNull()
    }

    @Test
    fun `string settings follow the same rule`() {
        val prefs = mutablePreferencesOf(
            legacyModel to "GROQ_LLAMA_70B",
            profileStringSettingKey("kids", ProfileSettingName.SUBTITLE_AI_MODEL) to "OTHER",
        )
        assertThat(readProfileStringOrNull(prefs, "kids", ProfileSettingName.SUBTITLE_AI_MODEL, legacyModel)).isEqualTo("OTHER")
        assertThat(readProfileStringOrNull(prefs, "adult", ProfileSettingName.SUBTITLE_AI_MODEL, legacyModel)).isEqualTo("GROQ_LLAMA_70B")
    }
}
