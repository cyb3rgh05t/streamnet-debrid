package com.arflix.tv

import android.content.pm.ActivityInfo
import android.content.res.Configuration
import android.os.SystemClock
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.filters.LargeTest
import org.junit.Test
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
@LargeTest
// Run on disposable devices: the connected-test runner can uninstall the app after testing.
class MainActivityLifecycleStabilityTest {

    @Test
    fun localizedResourcesFollowRotation() {
        ActivityScenario.launch(MainActivity::class.java).use { scenario ->
            var originalOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
            scenario.onActivity { originalOrientation = it.requestedOrientation }
            try {
                for ((request, expected) in listOf(
                    ActivityInfo.SCREEN_ORIENTATION_PORTRAIT to Configuration.ORIENTATION_PORTRAIT,
                    ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE to Configuration.ORIENTATION_LANDSCAPE,
                    ActivityInfo.SCREEN_ORIENTATION_PORTRAIT to Configuration.ORIENTATION_PORTRAIT
                )) {
                    scenario.onActivity { it.requestedOrientation = request }
                    val deadline = SystemClock.uptimeMillis() + 5_000
                    var orientation = Configuration.ORIENTATION_UNDEFINED
                    do {
                        scenario.onActivity { orientation = it.resources.configuration.orientation }
                        if (orientation == expected) break
                        SystemClock.sleep(50)
                    } while (SystemClock.uptimeMillis() < deadline)
                    assertEquals("Localized activity resources must follow rotation", expected, orientation)
                    scenario.onActivity {
                        val config = it.resources.configuration
                        assertTrue(
                            if (expected == Configuration.ORIENTATION_LANDSCAPE)
                                config.screenWidthDp > config.screenHeightDp
                            else config.screenHeightDp > config.screenWidthDp
                        )
                    }
                }
            } finally {
                scenario.onActivity { it.requestedOrientation = originalOrientation }
            }
        }
    }

    @Test
    fun repeatedLaunchAndCloseDoesNotCrash() {
        repeat(10) {
            ActivityScenario.launch(MainActivity::class.java).use { scenario ->
                scenario.onActivity { /* smoke check */ }
            }
        }
    }
}
