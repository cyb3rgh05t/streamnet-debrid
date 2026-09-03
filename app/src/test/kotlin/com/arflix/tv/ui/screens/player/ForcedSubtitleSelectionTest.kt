package com.arflix.tv.ui.screens.player

import com.arflix.tv.data.model.Subtitle
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ForcedSubtitleSelectionTest {

    @Test
    fun `selects embedded forced subtitle matching configured audio language`() {
        val subtitles = listOf(
            subtitle(id = "de-full", lang = "de", forced = false),
            subtitle(id = "en-forced", lang = "en", forced = true),
            subtitle(id = "de-forced", lang = "de", forced = true),
        )

        val selected = selectForcedSubtitleForAudio(subtitles, "German", ::normalizeForTest)

        assertEquals("de-forced", selected?.id)
    }

    @Test
    fun `does not select forced subtitle in another audio language`() {
        val subtitles = listOf(subtitle(id = "en-forced", lang = "en", forced = true))

        assertNull(selectForcedSubtitleForAudio(subtitles, "de", ::normalizeForTest))
    }

    @Test
    fun `recognizes forced label when container flag is missing`() {
        val subtitle = subtitle(
            id = "de-signs",
            lang = "und",
            forced = false,
            label = "German Forced",
        )

        assertEquals(
            "de-signs",
            selectForcedSubtitleForAudio(listOf(subtitle), "de", ::normalizeForTest)?.id,
        )
    }

    @Test
    fun `ignores external forced subtitles and disabled audio preference`() {
        val external = subtitle(id = "external", lang = "de", forced = true, embedded = false)

        assertNull(selectForcedSubtitleForAudio(listOf(external), "de", ::normalizeForTest))
        assertNull(
            selectForcedSubtitleForAudio(
                listOf(subtitle(id = "forced", lang = "de", forced = true)),
                "none",
                ::normalizeForTest,
            ),
        )
    }

    @Test
    fun `normal subtitle off preference still enables forced-only selection`() {
        assertEquals(true, shouldAutoSelectForcedSubtitle("Off"))
        assertEquals(true, shouldAutoSelectForcedSubtitle("Forced"))
        assertEquals(false, shouldAutoSelectForcedSubtitle("German"))
    }

    @Test
    fun `selected audio language prefers track metadata and falls back to label`() {
        assertEquals("de", resolveSelectedAudioLanguage("deu", "English", ::normalizeForTest))
        assertEquals("de", resolveSelectedAudioLanguage("und", "German Dolby Digital", ::normalizeForTest))
        assertEquals("de", resolveSelectedAudioLanguage("und", "Deutsch DD 5_1", ::normalizeForTest))
        assertNull(resolveSelectedAudioLanguage(null, null, ::normalizeForTest))
    }

    private fun subtitle(
        id: String,
        lang: String,
        forced: Boolean,
        label: String = id,
        embedded: Boolean = true,
    ) = Subtitle(
        id = id,
        url = "",
        lang = lang,
        label = label,
        provider = "",
        isEmbedded = embedded,
        isForced = forced,
    )

    private fun normalizeForTest(language: String): String {
        val normalized = language.lowercase()
        return when {
            normalized.startsWith("german") || normalized == "deu" || normalized == "ger" -> "de"
            normalized == "deutsch" -> "de"
            normalized.startsWith("english") || normalized == "eng" -> "en"
            else -> normalized
        }
    }
}