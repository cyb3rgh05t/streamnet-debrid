package com.arflix.tv.ui.screens.player

import android.content.Context
import androidx.media3.exoplayer.DefaultRenderersFactory

/**
 * Play builds do not package the optional FFmpeg extension. Keep the shared
 * player call site stable and use Media3's built-in renderers instead.
 */
class FfmpegFirstRenderersFactory(context: Context) : DefaultRenderersFactory(context)
