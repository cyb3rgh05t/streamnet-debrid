package com.arflix.tv.util

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import java.util.UUID

internal suspend fun Context.getOrCreateInstallationId(): String {
    val key = stringPreferencesKey("analytics_install_id_v1")
    val prefs = settingsDataStore.edit { values ->
        if (values[key].isNullOrBlank()) values[key] = UUID.randomUUID().toString()
    }
    return prefs[key] ?: error("Installation ID could not be stored")
}
