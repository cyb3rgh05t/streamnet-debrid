package com.arflix.tv.data.repository

import com.google.common.truth.Truth.assertThat
import org.junit.Test

class IptvTitleNormalizerTest {

    @Test
    fun `normalization preserves words containing non ascii letters`() {
        assertThat(IptvTitleNormalizer.normalize("Doğu")).isEqualTo("dogu")
        assertThat(IptvTitleNormalizer.normalize("Für alle Fälle")).isEqualTo("fur alle falle")
        assertThat(IptvTitleNormalizer.normalize("Łódź")).isEqualTo("lodz")
        assertThat(IptvTitleNormalizer.normalize("Straße der Träume")).isEqualTo("strasse der traume")
        assertThat(IptvTitleNormalizer.normalize("Kırmızı Oda")).isEqualTo("kirmizi oda")
        assertThat(IptvTitleNormalizer.normalize("Æon Flux")).isEqualTo("aeon flux")
    }

    @Test
    fun `normalization keeps existing title cleanup behavior`() {
        assertThat(IptvTitleNormalizer.normalize("Game of Thrones (2011)")).isEqualTo("game of thrones")
        assertThat(IptvTitleNormalizer.normalize("The Office 1080p WEB-DL")).isEqualTo("the office")
        assertThat(IptvTitleNormalizer.normalize("Stranger Things [Multi]")).isEqualTo("stranger things")
    }

    @Test
    fun `provider umlaut transcription matches folded query`() {
        val query = IptvTitleNormalizer.normalize("Für alle Fälle")
        val provider = IptvTitleNormalizer.normalize("Fuer alle Faelle")

        assertThat(IptvTitleNormalizer.foldUmlautTranscription(provider)).isEqualTo(query)
    }
}