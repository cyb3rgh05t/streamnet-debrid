package com.arflix.tv.data.repository

import com.arflix.tv.data.model.MediaItem
import org.junit.Assert.assertEquals
import org.junit.Test

class MediaRepositoryCacheMergeTest {
    @Test
    fun `enriched home item fills missing full details overview`() {
        val fullDetails = MediaItem(id = 42, title = "Title", overview = "", duration = "2h")
        val enrichedHomeItem = MediaItem(id = 42, title = "Title", overview = "Recovered plot")

        val merged = mergeEnrichedItemIntoFullDetails(fullDetails, enrichedHomeItem)

        assertEquals("Recovered plot", merged.overview)
        assertEquals("2h", merged.duration)
    }

    @Test
    fun `enriched home item does not replace existing full details overview`() {
        val fullDetails = MediaItem(id = 42, title = "Title", overview = "Localized plot")
        val enrichedHomeItem = MediaItem(id = 42, title = "Title", overview = "Search plot")

        val merged = mergeEnrichedItemIntoFullDetails(fullDetails, enrichedHomeItem)

        assertEquals("Localized plot", merged.overview)
    }
}