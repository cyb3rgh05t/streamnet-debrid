package com.arflix.tv.benchmark

import androidx.benchmark.macro.CompilationMode
import androidx.benchmark.macro.FrameTimingMetric
import androidx.benchmark.macro.MacrobenchmarkScope
import androidx.benchmark.macro.StartupMode
import androidx.benchmark.macro.StartupTimingMetric
import androidx.benchmark.macro.junit4.BaselineProfileRule
import androidx.benchmark.macro.junit4.MacrobenchmarkRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.uiautomator.By
import androidx.test.uiautomator.Until
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

// Staging build id (applicationId + ".beta"). Install it, sign in once, then run the benchmarks.
private const val TARGET_PACKAGE = "com.arvio.tv.beta"
private const val SETTLE_MS = 4_000L
private const val KEY_DELAY_MS = 110L

private fun MacrobenchmarkScope.waitForApp() {
    device.wait(Until.hasObject(By.pkg(packageName).depth(0)), 15_000)
    Thread.sleep(SETTLE_MS)
}

private fun MacrobenchmarkScope.pressRepeated(times: Int, press: () -> Unit) {
    repeat(times) {
        press()
        Thread.sleep(KEY_DELAY_MS)
    }
}

/** Walks Home with the D-pad: down through the rows, right along one rail, and back. */
private fun MacrobenchmarkScope.scrollHome() {
    pressRepeated(8) { device.pressDPadDown() }
    pressRepeated(14) { device.pressDPadRight() }
    pressRepeated(14) { device.pressDPadLeft() }
    pressRepeated(8) { device.pressDPadUp() }
}

/** Opens the focused title and moves through the Details rows. */
private fun MacrobenchmarkScope.browseDetails() {
    device.pressDPadCenter()
    Thread.sleep(SETTLE_MS)
    pressRepeated(6) { device.pressDPadDown() }
    pressRepeated(10) { device.pressDPadRight() }
    pressRepeated(6) { device.pressDPadUp() }
    device.pressBack()
    Thread.sleep(1_000L)
}

@RunWith(AndroidJUnit4::class)
class StartupBenchmark {
    @get:Rule
    val rule = MacrobenchmarkRule()

    @Test
    fun coldStartupNoCompilation() = startup(CompilationMode.None())

    @Test
    fun coldStartupBaselineProfile() = startup(CompilationMode.Partial())

    private fun startup(mode: CompilationMode) = rule.measureRepeated(
        packageName = TARGET_PACKAGE,
        metrics = listOf(StartupTimingMetric()),
        compilationMode = mode,
        startupMode = StartupMode.COLD,
        iterations = 8,
    ) {
        pressHome()
        startActivityAndWait()
    }
}

@RunWith(AndroidJUnit4::class)
class ScrollBenchmark {
    @get:Rule
    val rule = MacrobenchmarkRule()

    @Test
    fun homeDpadScroll() = frames { scrollHome() }

    @Test
    fun detailsDpadScroll() = frames { browseDetails() }

    private fun frames(block: MacrobenchmarkScope.() -> Unit) = rule.measureRepeated(
        packageName = TARGET_PACKAGE,
        metrics = listOf(FrameTimingMetric()),
        compilationMode = CompilationMode.Partial(),
        startupMode = StartupMode.WARM,
        iterations = 5,
        setupBlock = {
            pressHome()
            startActivityAndWait()
            waitForApp()
        },
        measureBlock = block,
    )
}

/**
 * Generates a baseline profile from the same user journey. Run with
 * `./gradlew :benchmark:connectedSideloadStagingAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.arflix.tv.benchmark.BaselineProfileGenerator`
 * and copy the produced baseline-prof.txt into app/src/main/ (see benchmark/README.md).
 */
@RunWith(AndroidJUnit4::class)
class BaselineProfileGenerator {
    @get:Rule
    val rule = BaselineProfileRule()

    @Test
    fun generate() = rule.collect(
        packageName = TARGET_PACKAGE,
        includeInStartupProfile = true,
    ) {
        pressHome()
        startActivityAndWait()
        waitForApp()
        scrollHome()
        browseDetails()
        scrollHome()
    }
}
