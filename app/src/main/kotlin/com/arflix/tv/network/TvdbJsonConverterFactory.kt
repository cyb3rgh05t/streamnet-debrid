package com.arflix.tv.network

import com.google.gson.JsonParseException
import okhttp3.ResponseBody
import retrofit2.Converter
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.io.IOException
import java.lang.reflect.Type

internal class TvdbJsonConverterFactory : Converter.Factory() {
    private val gson = GsonConverterFactory.create()

    override fun responseBodyConverter(
        type: Type,
        annotations: Array<Annotation>,
        retrofit: Retrofit
    ): Converter<ResponseBody, *>? {
        val converter = gson.responseBodyConverter(type, annotations, retrofit) ?: return null
        return Converter<ResponseBody, Any?> { body ->
            try {
                converter.convert(body)
            } catch (e: JsonParseException) {
                throw IOException("Invalid TVDB JSON response for ${type.typeName}", e)
            }
        }
    }

    override fun requestBodyConverter(
        type: Type,
        parameterAnnotations: Array<Annotation>,
        methodAnnotations: Array<Annotation>,
        retrofit: Retrofit
    ) = gson.requestBodyConverter(type, parameterAnnotations, methodAnnotations, retrofit)
}
