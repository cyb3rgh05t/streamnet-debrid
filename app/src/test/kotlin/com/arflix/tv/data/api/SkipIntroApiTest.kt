package com.arflix.tv.data.api

import com.google.gson.Gson
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test

class SkipIntroApiTest {
    @Test
    fun `introdb maps post credits segment`() {
        val response = Gson().fromJson(
            """{"post_credits":{"start_ms":120000,"end_ms":125000}}""",
            IntroDbSegmentsResponse::class.java,
        )

        assertNotNull(response.postCredits)
        assertEquals(120_000L, response.postCredits?.startMs)
        assertEquals(125_000L, response.postCredits?.endMs)
    }
}