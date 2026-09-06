package com.arflix.tv.ui.screens.tv.live

import com.google.common.truth.Truth.assertThat
import org.junit.Test

class LivePlaybackQualityTest {

    @Test
    fun missingMetadataRemainsUnknown() {
        assertThat(qualityFromText("Das Erste")).isEqualTo(Quality.UNKNOWN)
        assertThat(qualityFromText("German Entertainment")).isEqualTo(Quality.UNKNOWN)
    }

    @Test
    fun explicitSdMetadataRemainsSd() {
        assertThat(qualityFromText("News SD")).isEqualTo(Quality.SD)
        assertThat(qualityFromText("Sports 576p")).isEqualTo(Quality.SD)
    }

    @Test
    fun videoDimensionsResolveQuality() {
        assertThat(qualityFromVideoSize(0, 0)).isEqualTo(Quality.UNKNOWN)
        assertThat(qualityFromVideoSize(720, 576)).isEqualTo(Quality.SD)
        assertThat(qualityFromVideoSize(1280, 720)).isEqualTo(Quality.HD)
        assertThat(qualityFromVideoSize(1920, 1080)).isEqualTo(Quality.FHD)
        assertThat(qualityFromVideoSize(3840, 2160)).isEqualTo(Quality.K4)
    }
}