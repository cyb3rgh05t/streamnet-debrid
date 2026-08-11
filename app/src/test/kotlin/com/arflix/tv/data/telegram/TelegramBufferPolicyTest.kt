package com.arflix.tv.data.telegram

import com.google.common.truth.Truth.assertThat
import org.junit.Test

class TelegramBufferPolicyTest {

    @Test
    fun lowStorageUsesTwoMegabyteWindow() {
        val prefetch = TelegramBufferPolicy.prefetchBytes(
            totalSize = 2L * 1024 * 1024 * 1024,
            usableSpace = TelegramBufferPolicy.LOW_STORAGE_THRESHOLD_BYTES - 1
        )

        assertThat(prefetch).isEqualTo(TelegramBufferPolicy.LOW_STORAGE_PREFETCH_BYTES)
    }

    @Test
    fun normalStorageNeverExceedsPreviousTwentyMegabyteWindow() {
        val prefetch = TelegramBufferPolicy.prefetchBytes(
            totalSize = 20L * 1024 * 1024 * 1024,
            usableSpace = Long.MAX_VALUE
        )

        assertThat(prefetch).isEqualTo(TelegramBufferPolicy.MAX_PREFETCH_BYTES)
    }

    @Test
    fun smallerVideoUsesReducedDynamicWindow() {
        val prefetch = TelegramBufferPolicy.prefetchBytes(
            totalSize = 900L * 1024 * 1024,
            usableSpace = Long.MAX_VALUE
        )

        assertThat(prefetch).isAtLeast(TelegramBufferPolicy.MIN_PREFETCH_BYTES)
        assertThat(prefetch).isLessThan(TelegramBufferPolicy.MAX_PREFETCH_BYTES)
    }

    @Test
    fun prefetchDoesNotExceedSmallFileSize() {
        val totalSize = 1024L * 1024

        assertThat(TelegramBufferPolicy.prefetchBytes(totalSize, Long.MAX_VALUE))
            .isEqualTo(totalSize)
    }
}
