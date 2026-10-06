package com.arflix.tv.ui.components

import org.junit.Assert.assertEquals
import org.junit.Test

class SourceItemHeadingTest {
    @Test
    fun addsRecognizedReleaseYearToItemTitle() {
        assertEquals("Pacific Rim: Uprising (2018)", sourceItemHeading("Pacific Rim: Uprising", "2018"))
    }

    @Test
    fun keepsTitleWithoutMissingOrInvalidYear() {
        listOf(null, "", "unknown", "1080p", "2018-03-22").forEach { year ->
            assertEquals("Movie", sourceItemHeading(" Movie ", year))
        }
        assertEquals("", sourceItemHeading("", "2018"))
    }

    @Test
    fun doesNotRepeatExistingParenthesizedYear() {
        assertEquals("Movie (2018)", sourceItemHeading("Movie (2018)", "2018"))
    }
}
