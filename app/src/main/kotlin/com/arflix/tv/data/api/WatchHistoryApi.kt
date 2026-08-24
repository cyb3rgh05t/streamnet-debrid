package com.arflix.tv.data.api

import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Query

interface WatchHistoryApi {
    @GET("watch-history")
    suspend fun getWatchHistory(
        @Header("Authorization") auth: String,
        @Query("profile_id") profileId: String? = null,
        @Query("show_tmdb_id") showTmdbId: Int? = null,
        @Query("media_type") mediaType: String? = null,
        @Query("season") season: Int? = null,
        @Query("episode") episode: Int? = null
    ): List<WatchHistoryRecord>

    @POST("watch-history")
    suspend fun upsertWatchHistory(
        @Header("Authorization") auth: String,
        @Body item: WatchHistoryRecord
    ): WatchHistoryRecord

    @DELETE("watch-history")
    suspend fun deleteWatchHistory(
        @Header("Authorization") auth: String,
        @Query("profile_id") profileId: String? = null,
        @Query("show_tmdb_id") showTmdbId: Int? = null,
        @Query("media_type") mediaType: String? = null,
        @Query("season") season: Int? = null,
        @Query("episode") episode: Int? = null
    )
}