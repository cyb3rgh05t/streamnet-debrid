package com.arflix.tv.ui.theme

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Rect
import android.graphics.drawable.Drawable
import androidx.compose.ui.graphics.Color

val NeutralLogoBrandGradient = listOf(
    Color(0xFF303236),
    Color(0xFF1C1D20),
    Color(0xFF101112),
)

private val LightLogoBrandGradient = listOf(
    Color(0xFFE8EAED),
    Color(0xFFC8CCD2),
    Color(0xFF8D939C),
)

fun logoBrandGradient(
    drawable: Drawable,
    allowLightBackground: Boolean = true,
): List<Color> = runCatching {
    val bitmap = Bitmap.createBitmap(32, 32, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    val previousBounds = Rect(drawable.bounds)
    drawable.setBounds(0, 0, bitmap.width, bitmap.height)
    drawable.draw(canvas)
    drawable.bounds = previousBounds

    val bucketWeights = DoubleArray(12)
    val bucketRed = DoubleArray(12)
    val bucketGreen = DoubleArray(12)
    val bucketBlue = DoubleArray(12)
    val hsv = FloatArray(3)
    var visibleWeight = 0L
    var darkWeight = 0L
    var lightWeight = 0L

    for (y in 0 until bitmap.height) {
        for (x in 0 until bitmap.width) {
            val pixel = bitmap.getPixel(x, y)
            val alpha = android.graphics.Color.alpha(pixel)
            if (alpha < 48) continue

            android.graphics.Color.colorToHSV(pixel, hsv)
            visibleWeight += alpha
            when {
                hsv[2] < 0.64f -> darkWeight += alpha
                hsv[2] > 0.78f -> lightWeight += alpha
            }
            if (hsv[1] < 0.16f || hsv[2] < 0.08f || hsv[2] > 0.98f) continue

            val bucket = ((hsv[0] / 30f).toInt()).coerceIn(0, bucketWeights.lastIndex)
            val weight = alpha * hsv[1].toDouble()
            bucketWeights[bucket] += weight
            bucketRed[bucket] += android.graphics.Color.red(pixel) * weight
            bucketGreen[bucket] += android.graphics.Color.green(pixel) * weight
            bucketBlue[bucket] += android.graphics.Color.blue(pixel) * weight
        }
    }
    bitmap.recycle()

    val rankedBuckets = bucketWeights.indices
        .filter { bucketWeights[it] > 0.0 }
        .sortedByDescending { bucketWeights[it] }
    val primaryBucket = rankedBuckets.firstOrNull()
    val darkLogo = visibleWeight > 0L &&
        darkWeight.toDouble() / visibleWeight > 0.46 &&
        darkWeight > lightWeight * 1.3

    if (primaryBucket == null) {
        return@runCatching if (darkLogo && allowLightBackground) {
            LightLogoBrandGradient
        } else {
            NeutralLogoBrandGradient
        }
    }
    val secondaryBucket = rankedBuckets.firstOrNull { candidate ->
        val distance = kotlin.math.abs(candidate - primaryBucket)
        distance in 2..10
    } ?: primaryBucket

    fun darkBrandColor(bucket: Int, value: Float): Color {
        val weight = bucketWeights[bucket]
        val average = android.graphics.Color.rgb(
            (bucketRed[bucket] / weight).toInt(),
            (bucketGreen[bucket] / weight).toInt(),
            (bucketBlue[bucket] / weight).toInt(),
        )
        android.graphics.Color.colorToHSV(average, hsv)
        return Color(
            android.graphics.Color.HSVToColor(
                floatArrayOf(hsv[0], hsv[1].coerceAtLeast(0.34f), value)
            )
        )
    }

    if (darkLogo && allowLightBackground) {
        fun lightBrandColor(bucket: Int, saturation: Float, value: Float): Color {
            val weight = bucketWeights[bucket]
            val average = android.graphics.Color.rgb(
                (bucketRed[bucket] / weight).toInt(),
                (bucketGreen[bucket] / weight).toInt(),
                (bucketBlue[bucket] / weight).toInt(),
            )
            android.graphics.Color.colorToHSV(average, hsv)
            return Color(
                android.graphics.Color.HSVToColor(
                    floatArrayOf(hsv[0], saturation.coerceAtMost(hsv[1].coerceAtLeast(0.12f)), value)
                )
            )
        }

        listOf(
            lightBrandColor(primaryBucket, 0.18f, 0.92f),
            lightBrandColor(secondaryBucket, 0.28f, 0.76f),
            lightBrandColor(primaryBucket, 0.34f, 0.56f),
        )
    } else {
        listOf(
            darkBrandColor(primaryBucket, 0.42f),
            darkBrandColor(secondaryBucket, 0.24f),
            Color(0xFF101112),
        )
    }
}.getOrElse { NeutralLogoBrandGradient }