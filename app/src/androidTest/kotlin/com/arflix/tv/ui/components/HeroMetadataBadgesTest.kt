package com.arflix.tv.ui.components

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.getUnclippedBoundsInRoot
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.unit.dp
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.arflix.tv.data.model.MediaItem
import com.arflix.tv.data.model.MediaType
import com.arflix.tv.ui.screens.home.HeroSection
import com.arflix.tv.ui.screens.home.mergeHomeHeroMetadata
import com.arflix.tv.util.DeviceType
import com.arflix.tv.util.LocalDeviceType
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class HeroMetadataBadgesTest {
    @get:Rule
    val compose = createComposeRule()

    private val movie = MediaItem(
        id = 1, title = "Movie", releaseDate = "12 Dec 1997",
        duration = "2h 0m", certification = "FSK 18", budget = 24_000_000L,
        genreIds = listOf(28),
        imdbRating = "7.9",
    )

    private fun show(item: MediaItem = movie, showOptional: Boolean = true) {
        compose.setContent {
            CompositionLocalProvider(LocalDeviceType provides DeviceType.TV) {
                Box(Modifier.width(320.dp).testTag("hero-bounds")) {
                    HeroSection(
                        item = item, logoUrl = null, measurementOnly = true,
                        showBudget = showOptional, showCertification = showOptional,
                    )
                }
            }
        }
    }

    @Test
    fun partialContinueWatchingUpdatesKeepEveryBadgeVisible() {
        val visible = mutableStateOf(movie)
        compose.setContent {
            CompositionLocalProvider(LocalDeviceType provides DeviceType.TV) {
                Box(Modifier.width(320.dp)) {
                    HeroSection(item = visible.value, logoUrl = null, measurementOnly = true)
                }
            }
        }
        repeat(3) { update ->
            compose.runOnIdle {
                visible.value = mergeHomeHeroMetadata(
                    MediaItem(
                        id = movie.id, title = movie.title, duration = "0m",
                        budget = 0L, progress = 20 + update,
                        isPartiallyWatched = true,
                    ),
                    visible.value,
                )
            }
            for (text in listOf("Action", "12 Dec 1997", "2h 0m", "7.9", "FSK 18", "Budget $24M")) {
                compose.onNodeWithText(text).assertIsDisplayed()
            }
        }
    }

    @Test
    fun metadataBadgesAreVisibleAndStayWithinNarrowHeroBounds() {
        show()
        val bounds = compose.onNodeWithTag("hero-bounds").getUnclippedBoundsInRoot()
        for (text in listOf("12 Dec 1997", "Action", "2h 0m", "FSK 18")) {
            val badge = compose.onNodeWithText(text).assertIsDisplayed().getUnclippedBoundsInRoot()
            assertTrue(badge.left >= bounds.left)
            assertTrue(badge.right <= bounds.right)
        }
        compose.onNodeWithText("Budget $24M").assertIsDisplayed()
        compose.onNodeWithText("7.9").assertIsDisplayed()
        compose.onNodeWithContentDescription("IMDb").assertIsDisplayed()
        val ordered = listOf("Action", "12 Dec 1997", "2h 0m")
            .map { compose.onNodeWithText(it).getUnclippedBoundsInRoot() }
        ordered.zipWithNext().forEach { (first, second) ->
            assertTrue(second.top > first.top || (second.top == first.top && second.left > first.left))
        }
    }

    @Test
    fun optionalMetadataStillRespectsProfileSettings() {
        show(showOptional = false)
        compose.onNodeWithText("12 Dec 1997").assertIsDisplayed()
        compose.onNodeWithText("2h 0m").assertIsDisplayed()
        compose.onNodeWithText("FSK 18").assertDoesNotExist()
        compose.onNodeWithText("Budget $24M").assertDoesNotExist()
    }

    @Test
    fun missingMetadataAndSeriesBudgetAreNotRendered() {
        show(movie.copy(mediaType = MediaType.TV, releaseDate = null, duration = "0m", certification = null))
        compose.onNodeWithText("12 Dec 1997").assertDoesNotExist()
        compose.onNodeWithText("0m").assertDoesNotExist()
        compose.onNodeWithText("FSK 18").assertDoesNotExist()
        compose.onNodeWithText("Budget $24M").assertDoesNotExist()
    }
}
