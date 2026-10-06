package com.arflix.tv.ui.components

import com.arflix.tv.data.model.StreamSource
import com.arflix.tv.data.model.isStreamNetNzbSource

internal fun nzbSourceDetailLines(stream: StreamSource): List<String> {
    if (!stream.isStreamNetNzbSource()) return emptyList()
    val displayedFilename = stream.behaviorHints?.filename?.trim()?.takeIf { it.isNotBlank() }
        ?: stream.source.trim()
    val sensitiveLine = Regex("""https?://|magnet:|authorization|bearer\s""", RegexOption.IGNORE_CASE)
    return listOfNotNull(stream.addonTitle, stream.description)
        .flatMap { it.lines() }
        .map { it.trim() }
        .filter { line ->
            line.isNotBlank() && line != displayedFilename &&
                line.removePrefix("\uD83D\uDCC4").trim() != displayedFilename &&
                !sensitiveLine.containsMatchIn(line)
        }
        .distinct()
}
