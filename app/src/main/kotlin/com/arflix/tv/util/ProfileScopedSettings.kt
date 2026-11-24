package com.arflix.tv.util

import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey

/**
 * Settings that used to be stored once per device and are now stored per profile. A value saved
 * before the change keeps counting for every profile until that profile changes it, so nobody
 * loses a choice and no migration step is needed.
 */
object ProfileSettingName {
    const val OLED_BLACK_BACKGROUND = "oled_black_background"
    const val ACCENT_GRADIENT_BACKGROUND = "accent_gradient_background"
    const val SUBTITLE_PRELOAD_ENABLED = "subtitle_preload_enabled"
    const val SUBTITLE_REMOVE_HEARING_IMPAIRED = "subtitle_remove_hearing_impaired"
    const val SUBTITLE_AI_ENABLED = "subtitle_ai_enabled"
    const val SUBTITLE_AI_AUTO_SELECT = "subtitle_ai_auto_select"
    const val SUBTITLE_AI_FIND_BEST_MATCH = "subtitle_ai_find_best_match"
    const val SUBTITLE_AI_MODEL = "subtitle_ai_model"
}

fun profileBooleanSettingKey(profileId: String, name: String): Preferences.Key<Boolean> =
    booleanPreferencesKey("profile_${profileId}_$name")

fun profileStringSettingKey(profileId: String, name: String): Preferences.Key<String> =
    stringPreferencesKey("profile_${profileId}_$name")

/** The profile's own value, else the value stored before the setting became per-profile, else null. */
fun readProfileBooleanOrNull(
    preferences: Preferences,
    profileId: String?,
    name: String,
    legacyKey: Preferences.Key<Boolean>,
): Boolean? =
    profileId?.takeIf { it.isNotBlank() }?.let { preferences[profileBooleanSettingKey(it, name)] }
        ?: preferences[legacyKey]

fun readProfileBoolean(
    preferences: Preferences,
    profileId: String?,
    name: String,
    legacyKey: Preferences.Key<Boolean>,
    default: Boolean,
): Boolean = readProfileBooleanOrNull(preferences, profileId, name, legacyKey) ?: default

fun readProfileStringOrNull(
    preferences: Preferences,
    profileId: String?,
    name: String,
    legacyKey: Preferences.Key<String>,
): String? =
    profileId?.takeIf { it.isNotBlank() }?.let { preferences[profileStringSettingKey(it, name)] }
        ?: preferences[legacyKey]
