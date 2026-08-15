package com.arflix.tv.data.api

import com.google.gson.annotations.SerializedName
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

data class TvdbLoginRequest(
    @SerializedName("apikey") val apiKey: String,
)

data class TvdbLoginResponse(
    val data: TvdbLoginData? = null,
)

data class TvdbLoginData(
    val token: String? = null,
)

data class TvdbSearchResponse(
    val data: List<TvdbSearchResult> = emptyList(),
)

data class TvdbSearchResult(
    val id: String? = null,
    val name: String? = null,
    val type: String? = null,
)

data class TvdbArtworkResponse(
    val data: List<TvdbArtwork> = emptyList(),
)

data class TvdbArtwork(
    val image: String? = null,
    val type: Int? = null,
    val language: String? = null,
    @SerializedName("score") val score: Int? = null,
)

interface TvdbApi {
    @POST("login")
    suspend fun login(@Body request: TvdbLoginRequest): TvdbLoginResponse

    @GET("search")
    suspend fun search(
        @Query("query") query: String,
        @Query("type") type: String = "series",
    ): TvdbSearchResponse

    @GET("series/{id}/artworks")
    suspend fun getSeriesArtworks(@Path("id") id: Int): TvdbArtworkResponse
}
