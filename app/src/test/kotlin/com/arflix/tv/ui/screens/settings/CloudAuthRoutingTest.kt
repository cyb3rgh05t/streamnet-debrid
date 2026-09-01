package com.arflix.tv.ui.screens.settings

import com.arflix.tv.util.DeviceType
import com.google.common.truth.Truth.assertThat
import org.junit.Test

class CloudAuthRoutingTest {

    @Test
    fun touchDevicesUseDirectCloudAuthentication() {
        assertThat(shouldUseDirectCloudAuth(DeviceType.PHONE)).isTrue()
        assertThat(shouldUseDirectCloudAuth(DeviceType.TABLET)).isTrue()
    }

    @Test
    fun tvUsesDevicePairing() {
        assertThat(shouldUseDirectCloudAuth(DeviceType.TV)).isFalse()
    }
}