package com.arflix.tv.data.api

import com.arflix.tv.di.AppModule
import com.google.gson.Gson
import kotlinx.coroutines.runBlocking
import okhttp3.HttpUrl
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Protocol
import okhttp3.Response
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test

class SkipIntroApiTest {
    @Test
    fun `theintrodb uses v4 endpoint`() {
        val retrofit = AppModule.provideTheIntroDbRetrofit(OkHttpClient())
        assertEquals("https://api.theintrodb.org/v4/", retrofit.baseUrl().toString())
        assertNotNull(retrofit.create(TheIntroDbApi::class.java))
    }

    @Test
    fun `theintrodb v4 preserves tmdb season and episode coordinates`() = runBlocking {
        var requestedUrl: HttpUrl? = null
        val client = OkHttpClient.Builder().addInterceptor { chain ->
            val request = chain.request()
            requestedUrl = request.url
            Response.Builder()
                .request(request)
                .protocol(Protocol.HTTP_1_1)
                .code(200)
                .message("OK")
                .body(
                    """{"tvdb_id":71663,"type":"tv","intro":[{"start_ms":0,"end_ms":23000}]}"""
                        .toResponseBody("application/json".toMediaType())
                )
                .build()
        }.build()
        val api = AppModule.provideTheIntroDbRetrofit(client).create(TheIntroDbApi::class.java)

        val response = api.getMedia(tmdbId = 456, season = 2, episode = 3)

        assertEquals("/v4/media", requestedUrl?.encodedPath)
        assertEquals("456", requestedUrl?.queryParameter("tmdb_id"))
        assertEquals("2", requestedUrl?.queryParameter("season"))
        assertEquals("3", requestedUrl?.queryParameter("episode"))
        assertEquals(null, requestedUrl?.queryParameter("tvdb_id"))
        assertEquals(23000L, response.intro?.single()?.endMs)
    }

    @Test
    fun `theintrodb v4 tvdb identity does not prevent segment decoding`() {
        val response = Gson().fromJson(
            """{
                "tvdb_id":71663,
                "type":"tv",
                "intro":[{"start_ms":null,"end_ms":23000}],
                "recap":[{"start_ms":25000,"end_ms":134000}],
                "credits":[{"start_ms":5801777,"end_ms":6371111},{"start_ms":6408000,"end_ms":null}],
                "preview":[{"start_ms":1680000,"end_ms":1740000}]
            }""",
            TheIntroDbMediaResponse::class.java,
        )
        assertEquals(23000L, response.intro?.single()?.endMs)
        assertEquals(25000L, response.recap?.single()?.startMs)
        assertEquals(134000L, response.recap?.single()?.endMs)
        assertEquals(2, response.credits?.size)
        assertEquals(6408000L, response.credits?.last()?.startMs)
        assertEquals(null, response.credits?.last()?.endMs)
        assertEquals(1680000L, response.preview?.single()?.startMs)
        assertEquals(1740000L, response.preview?.single()?.endMs)
    }

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