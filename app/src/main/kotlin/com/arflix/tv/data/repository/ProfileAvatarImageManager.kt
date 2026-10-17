package com.arflix.tv.data.repository

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.util.Base64
import com.arflix.tv.R
import com.arflix.tv.data.model.Profile
import com.arflix.tv.util.Constants
import com.arflix.tv.util.ProfileAvatarFiles
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.MediaType.Companion.toMediaType
import org.json.JSONObject
import org.json.JSONArray
import java.io.File
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.max
import kotlin.math.min

data class ImportedProfileAvatar(
    val version: Long,
    val storagePath: String?
)

internal fun selectInlineProfileAvatar(
    version: Long,
    localImage: String?,
    existingImage: String?,
    existingVersion: Long?
): String? = localImage?.takeIf { it.isNotBlank() }
    ?: existingImage?.takeIf { it.isNotBlank() && existingVersion == version }

@Singleton
class ProfileAvatarImageManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val authRepository: AuthRepository
) {
    private val httpClient = OkHttpClient()
    private val localAvatarRevisions = MutableStateFlow<Map<String, Long>>(emptyMap())

    fun observeLocalAvatarRevision(profileId: String): Flow<Long> =
        localAvatarRevisions.map { it[profileId] ?: 0L }.distinctUntilChanged()

    private fun notifyAvatarChanged(profileId: String) {
        localAvatarRevisions.update { revisions ->
            revisions + (profileId to ((revisions[profileId] ?: 0L) + 1L))
        }
    }

    suspend fun importAvatar(profileId: String, uriString: String): ImportedProfileAvatar =
        withContext(Dispatchers.IO) {
            val version = System.currentTimeMillis()
            val file = ProfileAvatarFiles.localFile(context, profileId, version)
            decodeSquareAvatar(Uri.parse(uriString))?.let { bitmap ->
                file.outputStream().use { out ->
                    bitmap.compress(Bitmap.CompressFormat.JPEG, 86, out)
                }
                bitmap.recycle()
            } ?: throw IllegalArgumentException(context.getString(R.string.avatar_decode_failed))

            ProfileAvatarFiles.cleanupProfile(context, profileId, keepVersion = version)
            notifyAvatarChanged(profileId)
            ImportedProfileAvatar(
                version = version,
                storagePath = uploadAvatar(profileId, version, file).getOrNull()
            )
        }

    suspend fun restoreAvatarIfNeeded(profile: Profile, inlineBase64: String? = null) =
        withContext(Dispatchers.IO) {
            if (profile.avatarImageVersion <= 0L) {
                // Avatar removal is handled explicitly by profile edit/delete.
                // Do not delete files during cloud restore: stale/older clients can
                // send profile objects without custom-avatar fields and would wipe
                // the cached photo before a newer payload can restore it.
                return@withContext
            }

            val file = ProfileAvatarFiles.localFile(context, profile) ?: return@withContext
            if (file.exists() && file.length() > 0L) return@withContext

            val resolvedInlineBase64 = inlineBase64
                ?.takeIf { it.isNotBlank() }
                ?: loadInlineAvatarFromCloud(profile)

            if (!resolvedInlineBase64.isNullOrBlank()) {
                try {
                    val bytes = Base64.decode(resolvedInlineBase64, Base64.NO_WRAP)
                    file.writeBytes(bytes)
                    ProfileAvatarFiles.cleanupProfile(context, profile.id, keepVersion = profile.avatarImageVersion)
                    notifyAvatarChanged(profile.id)
                    return@withContext
                } catch (e: IllegalArgumentException) {
                    com.arflix.tv.util.AppLogger.e("ProfileAvatar", "Base64 decode error: ${e.message}")
                } catch (e: java.io.IOException) {
                    com.arflix.tv.util.AppLogger.e("ProfileAvatar", "IO error writing avatar: ${e.message}")
                } catch (e: Exception) {
                    if (e is kotlinx.coroutines.CancellationException) throw e
                    com.arflix.tv.util.AppLogger.e("ProfileAvatar", "Unexpected error restoring avatar: ${e.message}")
                }
            }

            val storagePath = profile.avatarImageStoragePath?.trim().orEmpty()
            if (storagePath.isBlank()) return@withContext
            downloadAvatar(storagePath, file).onSuccess {
                ProfileAvatarFiles.cleanupProfile(context, profile.id, keepVersion = profile.avatarImageVersion)
                notifyAvatarChanged(profile.id)
            }
        }

    fun buildInlineAvatarImagesJson(
        profiles: List<Profile>,
        existingImagesById: JSONObject? = null,
        existingProfiles: JSONArray? = null
    ): JSONObject {
        val result = JSONObject()
        val existingVersions = (0 until (existingProfiles?.length() ?: 0)).mapNotNull { index ->
            val profile = existingProfiles?.optJSONObject(index) ?: return@mapNotNull null
            profile.optString("id").takeIf { it.isNotBlank() }?.let {
                it to profile.optLong("avatarImageVersion", 0L)
            }
        }.toMap()
        profiles
            .filter { it.avatarImageVersion > 0L }
            .forEach { profile ->
                val localImage = readInlineBase64(profile)
                val preservedImage = existingImagesById
                    ?.optString(profile.id)
                    ?.takeIf { it.isNotBlank() }
                val image = selectInlineProfileAvatar(
                    profile.avatarImageVersion, localImage, preservedImage, existingVersions[profile.id]
                )
                if (!image.isNullOrBlank()) {
                    result.put(profile.id, image)
                }
            }
        return result
    }

    fun readInlineBase64(profile: Profile): String? {
        val file = ProfileAvatarFiles.localFile(context, profile) ?: return null
        if (!file.exists() || file.length() <= 0L) return null
        return try { Base64.encodeToString(file.readBytes(), Base64.NO_WRAP) } catch (e: Exception) { null }
    }

    fun clearLocalAvatar(profileId: String) {
        ProfileAvatarFiles.cleanupProfile(context, profileId)
        notifyAvatarChanged(profileId)
    }

    private fun decodeSquareAvatar(uri: Uri): Bitmap? {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        context.contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, bounds) }
        if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null

        val sample = calculateSampleSize(bounds.outWidth, bounds.outHeight, 1024)
        val decodeOptions = BitmapFactory.Options().apply {
            inSampleSize = sample
            inPreferredConfig = Bitmap.Config.ARGB_8888
        }
        val decoded = context.contentResolver.openInputStream(uri)?.use {
            BitmapFactory.decodeStream(it, null, decodeOptions)
        } ?: return null

        val side = min(decoded.width, decoded.height)
        val x = max(0, (decoded.width - side) / 2)
        val y = max(0, (decoded.height - side) / 2)
        val cropped = Bitmap.createBitmap(decoded, x, y, side, side)
        if (cropped != decoded) decoded.recycle()

        val scaled = Bitmap.createScaledBitmap(cropped, 512, 512, true)
        if (scaled != cropped) cropped.recycle()
        return scaled
    }

    private fun calculateSampleSize(width: Int, height: Int, target: Int): Int {
        var sample = 1
        var halfWidth = width / 2
        var halfHeight = height / 2
        while (halfWidth / sample >= target && halfHeight / sample >= target) {
            sample *= 2
        }
        return sample.coerceAtLeast(1)
    }

    private suspend fun uploadAvatar(profileId: String, version: Long, file: File): Result<String> =
        withContext(Dispatchers.IO) {
            Result.failure(IllegalStateException("Remote avatar storage is disabled; use inline account sync"))
        }

    private suspend fun downloadAvatar(storagePath: String, destination: File): Result<Unit> =
        withContext(Dispatchers.IO) {
            Result.failure(IllegalStateException("Remote avatar storage is disabled; use inline account sync"))
        }

    private suspend fun loadInlineAvatarFromCloud(profile: Profile): String? {
        return authRepository.loadAccountSyncPayload().getOrNull()
            ?.takeIf { it.isNotBlank() }
            ?.let { payload ->
                try {
                    val root = JSONObject(payload)
                    val profiles = root.optJSONArray("profiles") ?: return@let null
                    val matching = (0 until profiles.length()).asSequence()
                        .mapNotNull { profiles.optJSONObject(it) }
                        .firstOrNull { it.optString("id") == profile.id }
                    if (matching?.optLong("avatarImageVersion", 0L) != profile.avatarImageVersion) return@let null
                    root.optJSONObject("profileAvatarImagesById")
                        ?.optString(profile.id)
                        ?.takeIf { it.isNotBlank() }
                } catch (e: org.json.JSONException) {
                    com.arflix.tv.util.AppLogger.e("ProfileAvatar", "Error parsing inline avatar JSON: ${e.message}")
                    null
                } catch (e: Exception) {
                    if (e is kotlinx.coroutines.CancellationException) throw e
                    com.arflix.tv.util.AppLogger.e("ProfileAvatar", "Unexpected error parsing inline avatar: ${e.message}")
                    null
                }
            }
    }

    private companion object {
        const val BUCKET = "profile-avatars"
    }
}
