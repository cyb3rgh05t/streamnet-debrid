package com.arflix.tv.ui.screens.home

import androidx.datastore.preferences.core.stringSetPreferencesKey

/** First-start tips shown one at a time on Home. */
enum class HomeTip(val id: String) {
    ROWS("rows"),
    ADDONS("addons"),
    LIVE_TV("live_tv"),
    CLOUD("cloud"),
}

val HOME_TIPS_DISMISSED_KEY = stringSetPreferencesKey("home_tips_dismissed")

/**
 * The next tip to show, or null. Tips the user already closed stay closed; the add-on and Live TV
 * tips only appear while they still apply.
 */
internal fun selectHomeTip(
    dismissedIds: Set<String>,
    hasUserAddon: Boolean,
    hasIptvSource: Boolean,
): HomeTip? {
    return HomeTip.entries.firstOrNull { tip ->
        tip.id !in dismissedIds && when (tip) {
            HomeTip.ADDONS -> !hasUserAddon
            HomeTip.LIVE_TV -> !hasIptvSource
            else -> true
        }
    }
}
