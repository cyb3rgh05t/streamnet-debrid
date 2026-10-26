package com.arflix.tv.network

import com.arflix.tv.BuildConfig

/**
 * User-Agent for IPTV playlists, guides and live playback. Keeps the VLC product tokens that providers
 * and panels expect and appends the app name and version, so the connection list of a panel shows
 * which app (and release) is connected.
 */
internal const val IPTV_USER_AGENT = "VLC/3.0.20 LibVLC/3.0.20 StreamNet/${BuildConfig.VERSION_NAME}"

/**
 * Merges HTTP request headers by name, ignoring case; entries of [overrides] replace those of [base].
 *
 * media3's `OkHttpDataSource` adds every default request property with `addHeader` and, when
 * `setUserAgent` was used, appends one more `User-Agent` on top. A `User-Agent` in the properties map
 * therefore reached the server twice ("VLC/3.0.20 LibVLC/3.0.20, VLC/3.0.20 LibVLC/3.0.20"), and an
 * addon-supplied one in a different case never replaced the app's default.
 */
internal fun mergeRequestHeaders(
    base: Map<String, String>,
    overrides: Map<String, String> = emptyMap(),
): Map<String, String> {
    val merged = LinkedHashMap<String, String>()
    fun put(name: String, value: String) {
        merged.keys.firstOrNull { it.equals(name, ignoreCase = true) }?.let(merged::remove)
        merged[name] = value
    }
    base.forEach { (name, value) -> put(name, value) }
    overrides.forEach { (name, value) -> put(name, value) }
    return merged
}
