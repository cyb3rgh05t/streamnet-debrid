package com.arflix.tv.ui.components

import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.test.assertIsFocused
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performKeyInput
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.test.click
import androidx.compose.ui.test.pressKey
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.arflix.tv.R
import com.arflix.tv.util.DeviceType
import com.arflix.tv.util.LocalDeviceType
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
@OptIn(ExperimentalTestApi::class)
class ExitAppDialogTest {
    @get:Rule
    val compose = createComposeRule()

    private val context get() = InstrumentationRegistry.getInstrumentation().targetContext

    private fun verifyTouchButtons(device: DeviceType) {
        var dismisses = 0
        var confirms = 0
        compose.setContent {
            CompositionLocalProvider(LocalDeviceType provides device) {
                ExitAppDialog(onConfirm = { confirms++ }, onDismiss = { dismisses++ })
            }
        }
        compose.onNodeWithText(context.getString(R.string.cancel)).performTouchInput { click() }
        compose.runOnIdle {
            assertEquals(1, dismisses)
            assertEquals(0, confirms)
        }
        compose.onNodeWithText(context.getString(R.string.exit_app_confirm)).performTouchInput { click() }
        compose.runOnIdle {
            assertEquals(1, dismisses)
            assertEquals(1, confirms)
        }
    }

    @Test
    fun phoneButtonsRespondToTouch() = verifyTouchButtons(DeviceType.PHONE)

    @Test
    fun tabletButtonsRespondToTouch() = verifyTouchButtons(DeviceType.TABLET)

    @Test
    fun tvKeepsCancelFocusedAndRespondsToDpad() {
        var dismisses = 0
        var confirms = 0
        compose.setContent {
            CompositionLocalProvider(LocalDeviceType provides DeviceType.TV) {
                ExitAppDialog(onConfirm = { confirms++ }, onDismiss = { dismisses++ })
            }
        }
        val cancel = compose.onNodeWithText(context.getString(R.string.cancel))
        cancel.assertIsFocused().performKeyInput { pressKey(Key.DirectionCenter) }
        compose.runOnIdle { assertEquals(1, dismisses) }
        cancel.performKeyInput { pressKey(Key.DirectionRight) }
        compose.onNodeWithText(context.getString(R.string.exit_app_confirm))
            .assertIsFocused().performKeyInput { pressKey(Key.DirectionCenter) }
        compose.runOnIdle { assertEquals(1, confirms) }
    }
}
