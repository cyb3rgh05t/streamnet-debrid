package com.arflix.tv.util

import org.junit.Assert.assertEquals
import org.junit.Test

class AppLanguageTranslationTest {

    @Test
    fun skipLabelsTranslateForGerman() {
        assertEquals("Intro überspringen", AppTranslations.translate("Skip Intro", "de-DE"))
        assertEquals("Zusammenfassung überspringen", AppTranslations.translate("Skip Recap", "de-DE"))
        assertEquals("Abspann überspringen", AppTranslations.translate("Skip Credits", "de-DE"))
        assertEquals("Vorschau überspringen", AppTranslations.translate("Skip Preview", "de-DE"))
        assertEquals("Überspringen", AppTranslations.translate("Skip", "de-DE"))
    }

    @Test
    fun skipLabelsRemainEnglishForEnglishLocale() {
        assertEquals("Skip Intro", AppTranslations.translate("Skip Intro", "en-US"))
        assertEquals("Skip Recap", AppTranslations.translate("Skip Recap", "en-US"))
        assertEquals("Skip Credits", AppTranslations.translate("Skip Credits", "en-US"))
        assertEquals("Skip Preview", AppTranslations.translate("Skip Preview", "en-US"))
        assertEquals("Skip", AppTranslations.translate("Skip", "en-US"))
    }
}
