package com.arflix.tv.updater

import com.google.common.truth.Truth.assertThat
import org.junit.Test

class UpdateStatusManagerTest {
    @Test
    fun automaticCheckShowsNewUnignoredUpdate() {
        assertThat(
            shouldShowAppUpdateDialog(
                force = false,
                updateTag = "2.2.0",
                persistedIgnoredTag = null,
                sessionIgnoredTag = null,
            )
        ).isTrue()
    }

    @Test
    fun automaticCheckKeepsIgnoredUpdateClosed() {
        assertThat(
            shouldShowAppUpdateDialog(
                force = false,
                updateTag = "2.2.0",
                persistedIgnoredTag = "2.2.0",
                sessionIgnoredTag = null,
            )
        ).isFalse()
    }

    @Test
    fun manualCheckCanOpenIgnoredUpdate() {
        assertThat(
            shouldShowAppUpdateDialog(
                force = true,
                updateTag = "2.2.0",
                persistedIgnoredTag = "2.2.0",
                sessionIgnoredTag = "2.2.0",
            )
        ).isTrue()
    }
}