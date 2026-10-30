package com.arflix.tv.ui.components

import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.isDisplayed
import androidx.compose.ui.test.getUnclippedBoundsInRoot
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.arflix.tv.data.model.MediaItem
import com.arflix.tv.ui.screens.details.DetailsContent
import com.arflix.tv.ui.screens.details.FocusSection
import com.arflix.tv.util.DeviceType
import com.arflix.tv.util.LocalDeviceType
import org.junit.Rule
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class DetailsMetadataBadgesTest {
    @get:Rule
    val compose = createComposeRule()

    private fun show(mobile: Boolean, showOptional: Boolean = true) {
        compose.setContent {
            CompositionLocalProvider(
                LocalDeviceType provides if (mobile) DeviceType.PHONE else DeviceType.TV
            ) {
                DetailsContent(
                    item = MediaItem(
                        id = 1, title = "Movie", year = "1997",
                        releaseDate = "12 Dec 1997", duration = "2h 0m",
                        imdbRating = "7.9",
                    ),
                    logoUrl = null, episodes = emptyList(), totalSeasons = 0,
                    currentSeason = 1, cast = emptyList(), reviews = emptyList(),
                    similar = emptyList(), similarLogoUrls = emptyMap(),
                    focusedSection = FocusSection.BUTTONS, descriptionScrollRequest = 0,
                    onDescriptionPositionChange = { _, _ -> },
                    buttonIndex = 0, episodeIndex = 0, ratingsIndex = 0,
                    seasonIndex = 0, castIndex = 0, reviewIndex = 0, similarIndex = 0,
                    isInWatchlist = false, isMobile = mobile,
                    genres = listOf("Action"),
                    certification = if (showOptional) "FSK 18" else null,
                    budget = if (showOptional) "\$24M" else null,
                )
            }
        }
    }

    @Test
    fun tvDetailsShowsAllMetadata() {
        show(mobile = false)
        assertVisible("12 Dec 1997")
        assertCommonMetadata()
        assertMetadataOrder("12 Dec 1997")
    }

    @Test
    fun phoneDetailsShowsAllMetadata() {
        show(mobile = true)
        compose.onNodeWithText("1997").assertIsDisplayed()
        assertCommonMetadata()
        assertMetadataOrder("1997")
    }

    @Test
    fun phoneDetailsHidesDisabledOptionalMetadata() {
        show(mobile = true, showOptional = false)
        compose.onNodeWithText("1997").assertIsDisplayed()
        compose.onNodeWithText("2h 0m").assertIsDisplayed()
        compose.onNodeWithText("FSK 18").assertDoesNotExist()
        compose.onNodeWithText("Budget \$24M").assertDoesNotExist()
    }

    private fun assertCommonMetadata() {
        assertVisible("7.9")
        assertVisible("Action")
        assertVisible("2h 0m")
        assertVisible("FSK 18")
        assertVisible("Budget \$24M")
    }

    private fun assertMetadataOrder(date: String) {
        val ordered = listOf("Action", date, "2h 0m").map { text ->
            val nodes = compose.onAllNodesWithText(text)
            nodes[nodes.fetchSemanticsNodes().indices.first { nodes[it].isDisplayed() }]
                .getUnclippedBoundsInRoot()
        }
        ordered.zipWithNext().forEach { (first, second) ->
            assertTrue(second.top > first.top || (second.top == first.top && second.left > first.left))
        }
    }

    private fun assertVisible(text: String) {
        val nodes = compose.onAllNodesWithText(text)
        assertTrue(
            "Expected visible metadata: $text",
            nodes.fetchSemanticsNodes().indices.any { nodes[it].isDisplayed() },
        )
    }
}
