package com.arflix.tv.data.api

import com.google.gson.annotations.SerializedName
import retrofit2.http.GET
import retrofit2.http.Path


data class FanartTvResponse(
    @SerializedName("clearlogo") val clearLogos: List<FanartImage> = emptyList(),
    @SerializedName("hdtvlogo") val hdTvLogos: List<FanartImage> = emptyList(),
    @SerializedName("tvthumb") val thumbnails: List<FanartImage> = emptyList(),
    @SerializedName("tvbanner") val banners: List<FanartImage> = emptyList(),
    @SerializedName("showbackground") val backgrounds: List<FanartImage> = emptyList(),
    @SerializedName("tvposter") val posters: List<FanartImage> = emptyList(),
)

data class FanartImage(
    val url: String? = null,
    val lang: String? = null,
    val likes: Int? = null,
)

interface FanartApi {
    @GET("tv/{tvdbId}")
    suspend fun getTvArtwork(@Path("tvdbId") tvdbId: Int): FanartTvResponse
}
