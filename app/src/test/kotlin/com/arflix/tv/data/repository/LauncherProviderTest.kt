package com.arflix.tv.data.repository

import android.content.ContentResolver
import android.content.ContentValues
import android.content.Context
import android.database.MatrixCursor
import android.net.Uri
import android.provider.BaseColumns
import androidx.tvprovider.media.tv.TvContractCompat
import com.arflix.tv.data.model.MediaType
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class LauncherProviderTest {
    private fun repository(context: Context) = LauncherContinueWatchingRepository(
        context, mockk(), mockk(), mockk(), mockk(), mockk()
    )

    @Test
    fun `provider reconciliation updates survivors removes duplicates and leaves unrelated rows`() {
        val resolver = mockk<ContentResolver>()
        val context = mockk<Context>()
        every { context.contentResolver } returns resolver
        val uri = TvContractCompat.WatchNextPrograms.CONTENT_URI
        val keyColumn = TvContractCompat.WatchNextPrograms.COLUMN_INTERNAL_PROVIDER_ID
        val prefix = "arvio_continue_watchnext"
        val key = "$prefix:MOVIE:1:-1:-1"
        every { resolver.query(uri, any(), null, null, null) } answers {
            MatrixCursor(arrayOf(BaseColumns._ID, keyColumn)).apply {
                addRow(arrayOf<Any>(1L, key))
                addRow(arrayOf<Any>(2L, key))
                addRow(arrayOf<Any>(3L, "$prefix:MOVIE:2:-1:-1"))
                addRow(arrayOf<Any>(4L, "unrelated"))
            }
        }
        every { resolver.delete(any(), null, null) } returns 1
        every { resolver.update(any(), any(), null, null) } returns 1
        val values = listOf(ContentValues().apply { put(keyColumn, key) })
        val repository = repository(context)
        val method = repository.javaClass.getDeclaredMethod(
            "syncPrograms", Uri::class.java, String::class.java, List::class.java
        ).apply { isAccessible = true }
        repeat(2) { method.invoke(repository, uri, prefix, values) }
        verify(exactly = 2) { resolver.update(Uri.withAppendedPath(uri, "1"), any(), null, null) }
        verify(exactly = 2) { resolver.delete(Uri.withAppendedPath(uri, "2"), null, null) }
        verify(exactly = 2) { resolver.delete(Uri.withAppendedPath(uri, "3"), null, null) }
        verify(exactly = 0) { resolver.delete(Uri.withAppendedPath(uri, "4"), null, null) }
        verify(exactly = 0) { resolver.insert(any(), any()) }
    }

    @Test
    fun `launcher metadata shares app subtitle and supports relative landscape artwork`() {
        val context = RuntimeEnvironment.getApplication()
        val repository = repository(context)
        val item = ContinueWatchingItem(
            id = 12, title = "Series", mediaType = MediaType.TV,
            progress = 50, season = 1, episode = 2, displaySeason = 3, displayEpisode = 4,
            durationSeconds = 600, resumePositionSeconds = 300, backdropPath = "/landscape.jpg"
        )
        val method = repository.javaClass.getDeclaredMethod(
            "previewProgramValues", java.lang.Long.TYPE, ContinueWatchingItem::class.java, Integer.TYPE
        ).apply { isAccessible = true }
        val values = method.invoke(repository, 1L, item, 0) as ContentValues
        assertEquals(item.toMediaItem(context).subtitle, values.getAsString("short_description"))
        assertEquals(300_000, values.getAsInteger("last_playback_position_millis"))
        assertEquals(600_000, values.getAsInteger("duration_millis"))
        assertEquals(true, values.getAsString("poster_art_uri").endsWith("/landscape.jpg"))
    }
}
