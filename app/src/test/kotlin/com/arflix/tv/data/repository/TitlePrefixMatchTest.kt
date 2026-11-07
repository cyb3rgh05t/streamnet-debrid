package com.arflix.tv.data.repository

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class TitlePrefixMatchTest {
    @Test
    fun partialWordMatchesTitleStartAndLaterWords() {
        assertTrue(titleMatchesSearchPrefix("Reacher", "rea"))
        assertTrue(titleMatchesSearchPrefix("Jack Reacher: Kein Weg zurück", "rea"))
        assertTrue(titleMatchesSearchPrefix("Reacher", "REACHER"))
        assertFalse(titleMatchesSearchPrefix("Treasure Planet", "rea"))
        assertFalse(titleMatchesSearchPrefix("Reacher", "ea"))
    }

    @Test
    fun multiWordQueriesNeedOrderedWordPrefixes() {
        assertTrue(titleMatchesSearchPrefix("The King of Queens", "king que"))
        assertFalse(titleMatchesSearchPrefix("The King of Queens", "queens king"))
        assertTrue(titleMatchesSearchPrefix("S.W.A.T.", "s w a"))
    }

    @Test
    fun accentsPunctuationAndAmpersandAreIgnored() {
        assertTrue(titleMatchesSearchPrefix("Amélie", "amel"))
        assertTrue(titleMatchesSearchPrefix("Law & Order", "law and ord"))
        assertTrue(titleMatchesSearchPrefix("Spider-Man: No Way Home", "spider man no"))
    }

    @Test
    fun tooShortOrBlankQueriesDoNotMatch() {
        assertFalse(titleMatchesSearchPrefix("Reacher", ""))
        assertFalse(titleMatchesSearchPrefix("Reacher", " "))
        assertFalse(titleMatchesSearchPrefix("Reacher", "r"))
        assertFalse(titleMatchesSearchPrefix("", "rea"))
    }

    @Test
    fun normalizationStripsMarksAndCollapsesSeparators() {
        assertEquals("amelie and co", normalizeSearchText("Amélie & Co."))
    }
}
