package com.arflix.tv.network

import android.app.Application
import com.arflix.tv.data.api.StreamApi
import kotlinx.coroutines.runBlocking
import okhttp3.Cache
import okhttp3.OkHttpClient
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import retrofit2.Retrofit
import java.net.ServerSocket
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], application = Application::class, manifest = Config.NONE)
class MarvelCatalogCacheTest {
    @get:Rule
    val temporaryFolder = TemporaryFolder()

    @Test
    fun `revalidation replaces a still fresh 69-entry cache with the current 87-entry catalog`() {
        val updatedBody = requireNotNull(javaClass.getResourceAsStream("/marvel-addon-timeline.json"))
            .bufferedReader().use { it.readText() }
        val staleBody = """{"metas":[${(0 until 69).joinToString(",") {
            """{"id":"old-$it","name":"Old entry $it","type":"movie"}"""
        }}]}"""
        ServerSocket(0).use { server ->
            server.soTimeout = 5000
            val executor = Executors.newSingleThreadExecutor()
            val cache = Cache(temporaryFolder.newFolder("http-cache"), 1024L * 1024)
            val client = OkHttpClient.Builder().cache(cache).build()
            try {
                val served = executor.submit<List<List<String>>> {
                    (0..1).map { index ->
                        server.accept().use { socket ->
                            socket.soTimeout = 5000
                            val reader = socket.getInputStream().bufferedReader()
                            val headers = buildList {
                                while (true) {
                                    val line = reader.readLine() ?: break
                                    if (line.isEmpty()) break
                                    add(line)
                                }
                            }
                            val body = (if (index == 0) staleBody else updatedBody).toByteArray(Charsets.UTF_8)
                            val date = DateTimeFormatter.RFC_1123_DATE_TIME.format(ZonedDateTime.now(java.time.ZoneOffset.UTC))
                            socket.getOutputStream().write(
                                ("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n" +
                                    "Date: $date\r\nCache-Control: public, max-age=1814400\r\n" +
                                    "ETag: \"${if (index == 0) "old" else "updated"}\"\r\n" +
                                    "Content-Length: ${body.size}\r\nConnection: close\r\n\r\n")
                                    .toByteArray(Charsets.UTF_8)
                            )
                            socket.getOutputStream().write(body)
                            headers
                        }
                    }
                }
                val url = "http://127.0.0.1:${server.localPort}/catalog/Marvel/marvel-mcu.json"
                val api = Retrofit.Builder().baseUrl("http://127.0.0.1:${server.localPort}/")
                    .client(client)
                    .addConverterFactory(RecoverableJsonConverterFactory())
                    .build().create(StreamApi::class.java)
                runBlocking {
                    assertEquals(69, api.getAddonCatalog(url).metas!!.size)
                    assertEquals(69, api.getAddonCatalog(url).metas!!.size)
                    val fresh = api.getAddonCatalog(url, cacheControl = "no-cache")
                    val metas = requireNotNull(fresh.metas)
                    assertEquals(87, metas.size)
                    assertEquals("Eyes of Wakanda", metas.first().name)
                }
                val requests = served.get(5, TimeUnit.SECONDS)
                assertEquals(2, requests.size)
                assertTrue(requests.last().any { it.equals("Cache-Control: no-cache", ignoreCase = true) })
            } finally {
                client.dispatcher.executorService.shutdown()
                client.connectionPool.evictAll()
                cache.close()
                executor.shutdownNow()
            }
        }
    }
}
