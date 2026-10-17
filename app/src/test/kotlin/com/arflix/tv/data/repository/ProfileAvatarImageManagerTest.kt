package com.arflix.tv.data.repository

import android.content.Context
import android.util.Base64
import com.arflix.tv.data.model.Profile
import com.arflix.tv.util.ProfileAvatarFiles
import com.google.common.truth.Truth.assertThat
import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config
import java.util.UUID

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class ProfileAvatarImageManagerTest {
    private val context: Context = RuntimeEnvironment.getApplication()
    private val authRepository = mockk<AuthRepository>()

    @Test
    fun `restoring a missing photo notifies only its profile even when version is unchanged`() = runBlocking {
        val manager = ProfileAvatarImageManager(context, authRepository)
        val profile = Profile(id = UUID.randomUUID().toString(), name = "Photo", avatarImageVersion = 200L)
        val bytes = byteArrayOf(1, 2, 3, 4)
        assertThat(manager.observeLocalAvatarRevision(profile.id).first()).isEqualTo(0L)

        manager.restoreAvatarIfNeeded(profile, Base64.encodeToString(bytes, Base64.NO_WRAP))

        assertThat(ProfileAvatarFiles.localFile(context, profile)!!.readBytes()).isEqualTo(bytes)
        assertThat(manager.observeLocalAvatarRevision(profile.id).first()).isEqualTo(1L)
        assertThat(manager.observeLocalAvatarRevision("another-profile").first()).isEqualTo(0L)
        manager.restoreAvatarIfNeeded(profile)
        assertThat(manager.observeLocalAvatarRevision(profile.id).first()).isEqualTo(1L)
    }

    @Test
    fun `cloud fallback never writes older photo bytes under a newer local version`() = runBlocking {
        val profile = Profile(id = UUID.randomUUID().toString(), name = "Photo", avatarImageVersion = 200L)
        val photo = Base64.encodeToString(byteArrayOf(1, 2, 3), Base64.NO_WRAP)
        coEvery { authRepository.loadAccountSyncPayload() } returns Result.success(
            """{"profiles":[{"id":"${profile.id}","avatarImageVersion":100}],"profileAvatarImagesById":{"${profile.id}":"$photo"}}"""
        )
        val manager = ProfileAvatarImageManager(context, authRepository)

        manager.restoreAvatarIfNeeded(profile)

        assertThat(ProfileAvatarFiles.localFile(context, profile)!!.exists()).isFalse()
        assertThat(manager.observeLocalAvatarRevision(profile.id).first()).isEqualTo(0L)
    }
}