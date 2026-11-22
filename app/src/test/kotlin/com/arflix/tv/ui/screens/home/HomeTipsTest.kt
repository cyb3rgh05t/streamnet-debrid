package com.arflix.tv.ui.screens.home

import com.google.common.truth.Truth.assertThat
import org.junit.Test

class HomeTipsTest {
    private fun next(
        dismissed: Set<String> = emptySet(),
        hasUserAddon: Boolean = false,
        hasIptvSource: Boolean = false,
    ) = selectHomeTip(dismissed, hasUserAddon, hasIptvSource)

    @Test
    fun tipsComeOneAtATimeAndStayClosed() {
        assertThat(next()).isEqualTo(HomeTip.ROWS)
        assertThat(next(dismissed = setOf("rows"))).isEqualTo(HomeTip.ADDONS)
        assertThat(next(dismissed = setOf("rows", "addons", "live_tv"))).isEqualTo(HomeTip.CLOUD)
        assertThat(next(dismissed = HomeTip.entries.map { it.id }.toSet())).isNull()
    }

    @Test
    fun addonAndLiveTvTipsOnlyAppearWhileTheyApply() {
        assertThat(next(dismissed = setOf("rows"), hasUserAddon = true)).isEqualTo(HomeTip.LIVE_TV)
        assertThat(next(dismissed = setOf("rows"), hasUserAddon = true, hasIptvSource = true)).isEqualTo(HomeTip.CLOUD)
    }
}
