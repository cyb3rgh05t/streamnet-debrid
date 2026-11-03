package com.arflix.tv.ui.components

import androidx.compose.foundation.layout.width
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.test.*
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.arflix.tv.R
import com.arflix.tv.util.DeviceType
import com.arflix.tv.util.LocalDeviceType
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
@OptIn(ExperimentalTestApi::class)
class DetailsSummaryTest {
    @get:Rule val compose = createComposeRule()
    private val context get() = InstrumentationRegistry.getInstrumentation().targetContext
    private val longText = (1..20).joinToString("\n") { "Description line $it" }

    @Test
    fun longSummaryHasEightLinesAndOpensFullTextOnTouch() {
        compose.setContent {
            DetailsSummary(longText, TextStyle(fontSize = 14.sp), Color.White, Modifier.width(300.dp))
        }
        val layouts = mutableListOf<androidx.compose.ui.text.TextLayoutResult>()
        compose.onNodeWithText(longText).performSemanticsAction(SemanticsActions.GetTextLayoutResult) { it(layouts) }
        assertEquals(8, layouts.single().lineCount)
        compose.onNodeWithText(context.getString(R.string.summary_read_more)).performTouchInput { click() }
        compose.onNodeWithText(context.getString(R.string.summary_full)).assertIsDisplayed()
        compose.onNodeWithText(context.getString(R.string.summary_close)).performClick()
        compose.onNodeWithText(context.getString(R.string.summary_full)).assertDoesNotExist()
    }

    @Test
    fun dialogShowsItemTitleAndPosterWhenProvided() {
        compose.setContent {
            DetailsSummary(
                longText, TextStyle(fontSize = 14.sp), Color.White,
                Modifier.width(300.dp), title = "Top Gun: Maverick",
                posterUrl = "android.resource://com.arvio.tv/${R.drawable.avatar_28}",
            )
        }
        compose.onNodeWithText(context.getString(R.string.summary_read_more)).performClick()
        compose.onNodeWithText("Top Gun: Maverick").assertIsDisplayed()
        compose.onNodeWithContentDescription("Top Gun: Maverick").assertIsDisplayed()
    }

    @Test
    fun exactlyEightLinesDoesNotOfferExpansion() {
        compose.setContent {
            DetailsSummary(
                (1..8).joinToString("\n") { "Line $it" },
                TextStyle(fontSize = 14.sp), Color.White, Modifier.width(300.dp),
            )
        }
        compose.onNodeWithText(context.getString(R.string.summary_read_more)).assertDoesNotExist()
    }

    @Test
    fun shortSummaryIsNotExpandable() {
        compose.setContent {
            DetailsSummary("Short description", TextStyle(fontSize = 14.sp), Color.White)
        }
        compose.onNodeWithText(context.getString(R.string.summary_read_more)).assertDoesNotExist()
        compose.onNodeWithText("Short description").assertHasNoClickAction()
    }

    @Test
    fun tvOpenRequestShowsFullDescription() {
        val request = mutableIntStateOf(0)
        compose.setContent {
            CompositionLocalProvider(LocalDeviceType provides DeviceType.TV) {
                DetailsSummary(longText, TextStyle(fontSize = 14.sp), Color.White,
                    Modifier.width(300.dp), focused = true, openRequest = request.intValue)
            }
        }
        compose.onNodeWithText(context.getString(R.string.summary_read_more)).assertIsDisplayed()
        // Auf einem Fernseher öffnet ein D-Pad-Druck den Dialog, daher gilt der Tastatur-Eingabemodus.
        compose.onRoot().performKeyInput { pressKey(Key.DirectionRight) }
        compose.runOnIdle { request.intValue++ }
        compose.onNodeWithText(context.getString(R.string.summary_full)).assertIsDisplayed()
        // Der Fokus wird verzögert gesetzt, weil das Dialogfenster erst nach dem ersten Frame Anfragen annimmt.
        compose.waitUntilAtLeastOneExists(isFocused(), 5_000)
        compose.onNodeWithText(context.getString(R.string.summary_close)).assertIsFocused()
        compose.onNode(isFocused()).performKeyInput { pressKey(Key.DirectionDown) }
        compose.onNode(isFocused()).assertIsDisplayed()
        compose.onNode(isFocused()).performKeyInput { pressKey(Key.Back) }
        compose.onNodeWithText(context.getString(R.string.summary_full)).assertDoesNotExist()
    }
}
