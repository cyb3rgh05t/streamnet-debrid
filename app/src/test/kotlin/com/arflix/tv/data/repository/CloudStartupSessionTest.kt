package com.arflix.tv.data.repository

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class CloudStartupSessionTest {
    @Test
    fun `transient refresh failure keeps persisted session`() {
        assertEquals(
            "user-1",
            resolveCloudStartupUserId(
                refreshRequired = true,
                refreshTokenAvailable = true,
                refreshSucceeded = false,
                persistedUserId = "user-1",
                accessTokenUserId = null,
            )
        )
    }

    @Test
    fun `rejected refresh does not restore cleared session from stale state`() {
        assertNull(
            resolveCloudStartupUserId(
                refreshRequired = true,
                refreshTokenAvailable = true,
                refreshSucceeded = false,
                persistedUserId = null,
                accessTokenUserId = null,
            )
        )
    }

    @Test
    fun `expired access token without refresh token is signed out`() {
        assertNull(
            resolveCloudStartupUserId(
                refreshRequired = true,
                refreshTokenAvailable = false,
                refreshSucceeded = false,
                persistedUserId = "user-1",
                accessTokenUserId = null,
            )
        )
    }
}