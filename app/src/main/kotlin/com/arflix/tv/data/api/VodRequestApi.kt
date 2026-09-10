package com.arflix.tv.data.api

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.Header
import retrofit2.http.POST

interface VodRequestApi {
    @POST("api/v1/request")
    suspend fun requestMedia(
        @Header("X-API-Key") apiKey: String,
        @Body request: VodRequestBody,
    ): Response<Unit>
}

data class VodRequestBody(
    val mediaId: Int,
    val mediaType: String,
    val seasons: Any? = null,
    val is4k: Boolean = false,
)
