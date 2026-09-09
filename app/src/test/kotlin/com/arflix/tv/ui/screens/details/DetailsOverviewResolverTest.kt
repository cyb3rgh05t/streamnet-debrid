package com.arflix.tv.ui.screens.details

import com.arflix.tv.data.model.MediaItem
import com.arflix.tv.data.model.MediaType
import org.junit.Assert.assertEquals
import org.junit.Test

class DetailsOverviewResolverTest {
    @Test
    fun `complete overview is preserved`() {
        val complete = "A".repeat(160)
        val item = MediaItem(id = 42, title = "Dark", overview = complete, mediaType = MediaType.TV)
        val searchMatch = item.copy(overview = "B".repeat(220))

        assertEquals(complete, selectBestOverview(item, complete, listOf(searchMatch)))
    }

    @Test
    fun `truncated overview is replaced by longer exact match`() {
        val truncated = "Eine unvollständige Beschreibung..."
        val item = MediaItem(id = 42, title = "Dark", overview = truncated, mediaType = MediaType.TV)
        val improved = "Eine vollständige Beschreibung, die den Inhalt der Serie ausführlich zusammenfasst."
        val searchMatch = item.copy(overview = improved)

        assertEquals(improved, selectBestOverview(item, truncated, listOf(searchMatch)))
    }
}