package com.arflix.tv.data.telegram

import com.google.common.truth.Truth.assertThat
import org.drinkless.tdlib.TdApi
import org.junit.Test

class TelegramClientErrorPolicyTest {

    @Test
    fun requestAbortedIsTreatedAsExpectedCancellation() {
        val exception = TdApi.Error(500, " Request aborted ")
            .toTelegramApiExceptionOrNull()

        assertThat(exception).isNull()
    }

    @Test
    fun unrelatedAbortMessageRemainsAnError() {
        val exception = TdApi.Error(500, "Request aborted by peer")
            .toTelegramApiExceptionOrNull()

        assertThat(exception).isNotNull()
        assertThat(exception?.code).isEqualTo(500)
        assertThat(exception?.message).isEqualTo("Request aborted by peer")
    }

    @Test
    fun telegramApiErrorPreservesCodeAndMessage() {
        val exception = TdApi.Error(429, "FLOOD_WAIT_30")
            .toTelegramApiExceptionOrNull()

        assertThat(exception).isNotNull()
        assertThat(exception?.code).isEqualTo(429)
        assertThat(exception?.message).isEqualTo("FLOOD_WAIT_30")
    }
}
