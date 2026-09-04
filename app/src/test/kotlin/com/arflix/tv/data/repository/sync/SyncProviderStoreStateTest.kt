package com.arflix.tv.data.repository.sync

import com.google.common.truth.Truth.assertThat
import org.junit.Test

class SyncProviderStoreStateTest {
    @Test
    fun `connecting a second tracker preserves the preferred tracker`() {
        assertThat(defaultTrackingReadMode(true, true, false, SyncProvider.TRAKT))
            .isEqualTo(TrackingReadMode.TRAKT)
    }

    @Test
    fun `legacy cloud selection does not overwrite a local choice`() {
        assertThat(shouldApplyCloudTrackingSelection(null, null, hasLocalSelection = true)).isFalse()
        assertThat(shouldApplyCloudTrackingSelection(null, null, hasLocalSelection = false)).isTrue()
    }

    @Test
    fun `newer tracking selection wins`() {
        assertThat(shouldApplyCloudTrackingSelection(200L, 100L, true)).isTrue()
        assertThat(shouldApplyCloudTrackingSelection(100L, 200L, true)).isFalse()
    }

    @Test
    fun `legacy credential restore is additive`() {
        assertThat(shouldApplyCloudCredential(null, null, false, true)).isFalse()
        assertThat(shouldApplyCloudCredential(null, null, true, false)).isTrue()
    }

    @Test
    fun `newer credential tombstone wins`() {
        assertThat(shouldApplyCloudCredential(200L, 100L, false, true)).isTrue()
        assertThat(shouldApplyCloudCredential(100L, 200L, false, true)).isFalse()
    }
}