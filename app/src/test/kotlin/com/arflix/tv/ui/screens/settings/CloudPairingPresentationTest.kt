package com.arflix.tv.ui.screens.settings

import android.content.res.Configuration
import com.arflix.tv.R
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config
import java.util.Locale

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class CloudPairingPresentationTest {
    @Test
    fun `qr reserves space for title hint code and complete status on small TVs`() {
        for (height in listOf(360f, 400f, 460f, 480f, 640f)) {
            val qr = cloudPairingQrSize(height)
            assertTrue(qr in 64f..220f)
            assertTrue(qr + 260f <= height)
        }
        assertEquals(64f, cloudPairingQrSize(200f))
    }

    @Test
    fun `pairing status resolves using UI locale instead of application locale`() {
        val context = RuntimeEnvironment.getApplication()
        val status = SettingsUiState(cloudAuthStatusMessage = R.string.settings_waiting_for_approval)
        fun localized(language: String) = context.createConfigurationContext(
            Configuration(context.resources.configuration).apply { setLocale(Locale.forLanguageTag(language)) }
        )
        val german = localized("de")
        val english = localized("en")
        assertEquals("Warten auf Bestätigung...", german.getString(status.cloudAuthStatusMessage!!))
        assertEquals("Waiting for approval...", english.getString(status.cloudAuthStatusMessage!!))
        assertEquals("Scanne den QR-Code", german.getString(R.string.cloud_connect_scan_hint))
        assertEquals("Scan the QR code", english.getString(R.string.cloud_connect_scan_hint))
    }
}
