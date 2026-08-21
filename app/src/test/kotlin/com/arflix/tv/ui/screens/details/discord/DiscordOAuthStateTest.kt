package com.arflix.tv.ui.screens.details.discord

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class DiscordOAuthStateTest {

    private val validState = DISCORD_MOBILE_OAUTH_STATE_PREFIX + "a".repeat(86)

    @Test
    fun `matching mobile state is accepted`() {
        assertTrue(isValidDiscordMobileOAuthState(validState, validState))
    }

    @Test
    fun `missing stored state is rejected`() {
        assertFalse(isValidDiscordMobileOAuthState(null, validState))
    }

    @Test
    fun `missing callback state is rejected`() {
        assertFalse(isValidDiscordMobileOAuthState(validState, null))
    }

    @Test
    fun `mismatched callback state is rejected`() {
        assertFalse(
            isValidDiscordMobileOAuthState(
                validState,
                DISCORD_MOBILE_OAUTH_STATE_PREFIX + "b".repeat(86)
            )
        )
    }

    @Test
    fun `unmarked state is rejected`() {
        val unmarkedState = "a".repeat(86)
        assertFalse(isValidDiscordMobileOAuthState(unmarkedState, unmarkedState))
    }
}
