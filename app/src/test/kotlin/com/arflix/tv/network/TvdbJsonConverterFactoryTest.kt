package com.arflix.tv.network

import com.arflix.tv.data.api.TvdbArtworkResponse
import com.arflix.tv.data.api.TvdbLoginRequest
import com.arflix.tv.data.api.TvdbLoginResponse
import com.arflix.tv.data.api.TvdbSearchResponse
import com.arflix.tv.data.api.TvdbApi
import com.google.gson.JsonParseException
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assert.assertThrows
import org.junit.Test
import retrofit2.Retrofit
import java.io.IOException
import java.net.ServerSocket
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.runBlocking
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], application = android.app.Application::class, manifest = Config.NONE)
class TvdbJsonConverterFactoryTest {
    private val retrofit = Retrofit.Builder()
        .baseUrl("https://api4.thetvdb.com/v4/")
        .addConverterFactory(TvdbJsonConverterFactory())
        .build()

    private fun <T> parse(type: Class<T>, json: String): T =
        retrofit.responseBodyConverter<T>(type, emptyArray())
            .convert(json.toResponseBody("application/json".toMediaType()))!!

    @Test
    fun `object instead of array is a recoverable IO failure for both list endpoints`() {
        for (type in listOf(TvdbSearchResponse::class.java, TvdbArtworkResponse::class.java)) {
            val failure = assertThrows(IOException::class.java) {
                parse(type, """{"status":"success","data":{}}""")
            }
            assertTrue(failure.cause is JsonParseException)
            assertTrue(failure.cause!!.message!!.contains("$.data"))
        }
    }

    @Test
    fun `valid arrays and login object preserve existing response shapes`() {
        assertEquals("123", parse(
            TvdbSearchResponse::class.java,
            """{"data":[{"id":"123","name":"Series","type":"series"}]}"""
        ).data.single().id)
        assertEquals("image", parse(
            TvdbArtworkResponse::class.java,
            """{"data":[{"image":"image","type":3}]}"""
        ).data.single().image)
        assertEquals("token", parse(TvdbLoginResponse::class.java, """{"data":{"token":"token"}}""").data?.token)
        assertTrue(parse(TvdbSearchResponse::class.java, """{"data":[]}""").data.isEmpty())
    }

    @Test
    fun `Retrofit suspend request delivers invalid JSON as IOException without escaping coroutine`() {
        ServerSocket(0).use { server ->
            server.soTimeout = 5000
            val executor = Executors.newSingleThreadExecutor()
            try {
                val response = executor.submit {
                    server.accept().use { socket ->
                        socket.soTimeout = 5000
                        val reader = socket.getInputStream().bufferedReader()
                        while (!reader.readLine().isNullOrEmpty()) { /* Consume HTTP headers. */ }
                        val body = """{"status":"success","data":{}}"""
                        socket.getOutputStream().write(
                            ("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n" +
                                "Content-Length: ${body.length}\r\nConnection: close\r\n\r\n$body")
                                .toByteArray(Charsets.UTF_8)
                        )
                    }
                }
                val api = Retrofit.Builder()
                    .baseUrl("http://127.0.0.1:${server.localPort}/")
                    .addConverterFactory(TvdbJsonConverterFactory())
                    .build().create(TvdbApi::class.java)
                val error = assertThrows(IOException::class.java) {
                    runBlocking { api.search("Series") }
                }
                assertTrue(
                    "Unexpected request failure: $error",
                    generateSequence<Throwable>(error) { it.cause }.any { it is JsonParseException }
                )
                response.get(5, TimeUnit.SECONDS)
            } finally {
                executor.shutdownNow()
            }
        }
    }

    @Test
    fun `login request serialization remains available`() {
        val converter = retrofit.requestBodyConverter<TvdbLoginRequest>(
            TvdbLoginRequest::class.java, emptyArray(), emptyArray()
        )
        val buffer = okio.Buffer()
        converter.convert(TvdbLoginRequest("test-key"))!!.writeTo(buffer)
        assertEquals("""{"apikey":"test-key"}""", buffer.readUtf8())
    }
}
