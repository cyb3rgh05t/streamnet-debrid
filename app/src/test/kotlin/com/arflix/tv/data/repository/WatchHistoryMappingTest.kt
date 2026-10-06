package com.arflix.tv.data.repository

import com.arflix.tv.data.api.WatchHistoryRecord
import com.google.gson.Gson
import org.junit.Assert.assertEquals
import org.junit.Test

class WatchHistoryMappingTest {
    @Test
    fun webHistoryWithoutPayloadUserIdUsesAuthenticatedAccount() {
        val json = """[
            {"media_type":"movie","show_tmdb_id":969681,"profile_id":"main",
             "progress":0.01,"position_seconds":90,"duration_seconds":9000},
            {"media_type":"tv","show_tmdb_id":62231,"profile_id":"main",
             "progress":0.00315,"position_seconds":8,"duration_seconds":2542}
        ]"""
        val entries = Gson().fromJson(json, Array<WatchHistoryRecord>::class.java)
            .map { it.toEntry("signed-in-account") }

        assertEquals(listOf(969681, 62231), entries.map { it.show_tmdb_id })
        assertEquals(listOf("signed-in-account", "signed-in-account"), entries.map { it.user_id })
        assertEquals(90L, entries.first().position_seconds)
        assertEquals("main", entries.first().profile_id)
    }

    @Test
    fun historyOwnershipComesFromAuthenticatedAccountNotPayload() {
        val record = WatchHistoryRecord(
            userId = "legacy-owner",
            mediaType = "movie",
            showTmdbId = 123,
            progress = 0.2f,
            positionSeconds = 120,
            durationSeconds = 600
        )
        assertEquals("signed-in-account", record.toEntry("signed-in-account").user_id)
    }

    @Test(expected = IllegalArgumentException::class)
    fun mappingRequiresAuthenticatedAccount() {
        WatchHistoryRecord(
            mediaType = "movie", progress = 0f, positionSeconds = 0, durationSeconds = 0
        ).toEntry("")
    }
}
