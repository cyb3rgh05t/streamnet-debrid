package com.arflix.tv.ui.components

import com.arflix.tv.data.model.StreamSource
import com.google.common.truth.Truth.assertThat
import org.junit.Test

class StreamSelectorIdentityTest {

    @Test
    fun duplicateVisibleAddonLabelsKeepUniqueComposeKeys() {
        val tabs = buildSourceAddonTabs(
            streams = listOf(
                stream(addonId = "stravo-instance-one-ac49"),
                stream(addonId = "stravo-instance-two-ac49"),
            ),
            addonOrderedIds = emptyList(),
        )

        assertThat(tabs.map { it.label })
            .containsExactly("Stravo #AC49", "Stravo #AC49 (2)")
            .inOrder()
        assertThat(sourceAddonTabKeys(tabs)).containsNoDuplicates()
    }

    @Test
    fun addonRailKeysUseFullAddonIdentityInsteadOfDisplayText() {
        val tabs = listOf(
            SourceAddonTab(id = "instance-one", label = "Duplicate"),
            SourceAddonTab(id = "instance-two", label = "Duplicate"),
        )

        assertThat(sourceAddonTabKeys(tabs))
            .containsExactly(
                "source_addon:all",
                "source_addon:id:instance-one",
                "source_addon:id:instance-two",
            )
            .inOrder()
    }

    @Test
    fun identicalStreamRowsStillReceiveUniqueKeys() {
        val stream = stream(addonId = "stravo")

        assertThat(sourceStreamRowKey(stream, 0))
            .isNotEqualTo(sourceStreamRowKey(stream, 1))
    }

    private fun stream(addonId: String) = StreamSource(
        source = "source",
        addonName = "Stravo - TorBox",
        addonId = addonId,
        quality = "4K",
        size = "12 GB",
    )
}
