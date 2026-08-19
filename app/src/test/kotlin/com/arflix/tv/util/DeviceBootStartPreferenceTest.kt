package com.arflix.tv.util

import org.junit.Assert.assertEquals
import org.junit.Test

class DeviceBootStartPreferenceTest {
    @Test
    fun bootStartPreferenceUsesStableKeyName() {
        assertEquals("start_on_device_boot", START_ON_DEVICE_BOOT_KEY.name)
    }
}
