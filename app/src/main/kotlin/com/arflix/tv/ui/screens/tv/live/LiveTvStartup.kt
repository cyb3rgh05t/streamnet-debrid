package com.arflix.tv.ui.screens.tv.live

import com.arflix.tv.data.model.IptvChannel

/**
 * Startup decisions for the Live TV screen, kept out of the composable so they
 * can be unit tested. The screen itself is a single very large @Composable, so
 * behaviour expressed inline there can only be verified on a device — these
 * rules are the parts users actually complained about, so they live here.
 */
object LiveTvStartup {

    /**
     * Which channel Live TV should open on.
     *
     * Order: an explicit request (deep link, "continue watching" action) wins;
     * otherwise resume the channel the session last recorded. The session
     * already persisted `lastChannelId` but nothing consumed it on entry, so
     * Live TV always reopened at the top of the list.
     *
     * A remembered id that is no longer in the playlists is ignored, so a
     * removed channel can't pin the screen to something that cannot be shown.
     */
    fun resumeChannelId(
        explicitChannelId: String?,
        lastChannelId: String?,
        availableChannelIds: Set<String>,
    ): String? {
        explicitChannelId?.takeIf { it.isNotBlank() }?.let { return it }
        val remembered = lastChannelId?.trim().orEmpty()
        if (remembered.isEmpty()) return null
        // An empty channel set means the list hasn't loaded yet — keep the
        // remembered id so it can be honoured once channels arrive, rather than
        // discarding it and defaulting to the top of the list.
        if (availableChannelIds.isEmpty()) return remembered
        return remembered.takeIf { it in availableChannelIds }
    }

    /**
     * Whether the sidebar may claim D-pad focus right now.
     *
     * While channels are still loading the list recomposes underneath the
     * focused item, Compose drops focus, and the focus effect used to grab it
     * back — which is what made the selector jump in unrelated directions when
     * a user pressed a direction key during load. Touch devices never take
     * this focus at all.
     */
    fun shouldClaimSidebarFocus(
        isTouchDevice: Boolean,
        isCategoryZoneActive: Boolean,
        channelsLoaded: Boolean,
    ): Boolean = !isTouchDevice && isCategoryZoneActive && channelsLoaded

    /**
     * Whether the channel-search field should be focused.
     *
     * The signal seeds at 0 so opening Live TV does not slam focus into the
     * search box; only an explicit user action (which bumps the signal) does.
     */
    fun shouldFocusSearch(focusSearchSignal: Int): Boolean = focusSearchSignal > 0

    /**
     * Whether the channel-search row may take D-pad focus.
     *
     * Search is the first focusable row in the sidebar, so while the playlist
     * is still loading Compose parks the selector there by default — and
     * "down" from search selects the first category, which does not exist yet,
     * so every key press is swallowed and the selector looks frozen. Keeping
     * search out of the focus order until there is a category to move to sends
     * that initial focus straight to the category list instead.
     */
    fun searchIsReachable(categoryCount: Int): Boolean = categoryCount > 0

    /**
     * Where the selector lands when Live TV opens.
     *
     * This used to be the search row on purpose ("Default IPTV entry is the
     * playlist/category rail, focused on Search"), which is exactly what users
     * reported as broken: the selector opened inside the search box, and since
     * "down" from search selects the first category — which does not exist
     * until the playlist has parsed — it stayed stuck there through the entire
     * load. The categories are the useful landing spot; search is one press up.
     */
    enum class EntryFocus { CATEGORY_LIST, NONE }

    fun entryFocus(isTouchDevice: Boolean, hasChannels: Boolean): EntryFocus = when {
        isTouchDevice -> EntryFocus.NONE
        !hasChannels -> EntryFocus.NONE
        else -> EntryFocus.CATEGORY_LIST
    }

    /**
     * How long the sidebar keeps re-claiming the selector after Live TV opens.
     *
     * The mini player attaches its video surface shortly after the screen
     * appears; that takes the platform focus, and Compose then falls back to
     * the first focusable row — the search box. Roughly two seconds of retries
     * covers stream start-up on a slow TV without fighting the user afterwards.
     */
    const val INITIAL_FOCUS_ATTEMPTS: Int = 25
    const val INITIAL_FOCUS_RETRY_MS: Long = 80L

    /** Ids of the channels currently available, for [resumeChannelId]. */
    fun channelIds(channels: List<IptvChannel>): Set<String> =
        channels.mapTo(LinkedHashSet(channels.size)) { it.id }
}
