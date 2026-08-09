package com.arflix.tv.util

import android.content.Context
import android.content.res.Configuration
import android.os.Build
import android.os.LocaleList
import androidx.annotation.StringRes
import androidx.compose.runtime.Composable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.res.stringResource
import androidx.datastore.preferences.core.stringPreferencesKey
import com.arflix.tv.R
import java.util.Locale

val LocalAppLanguage = staticCompositionLocalOf { "de-DE" }
val LAST_APP_LANGUAGE_KEY = stringPreferencesKey("last_app_language")

fun normalizeAppLanguage(languageTag: String?): String =
    if (languageTag?.replace('_', '-')?.startsWith("en", ignoreCase = true) == true) "en-US" else "de-DE"

fun appLocale(languageTag: String): Locale {
    val normalized = languageTag.replace('_', '-')
    return Locale.forLanguageTag(normalized).takeUnless { it.language.isBlank() } ?: Locale.GERMANY
}

fun localizedAppContext(context: Context, languageTag: String): Context {
    val locale = appLocale(languageTag)
    Locale.setDefault(locale)
    val config = Configuration(context.resources.configuration)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
        config.setLocales(LocaleList(locale))
    } else {
        @Suppress("DEPRECATION")
        config.setLocale(locale)
    }
    return context.createConfigurationContext(config)
}

/**
 * Translate [text] using Android string resources (XML-backed).
 * Covers every key from the old AppTranslations map. Unknown strings fall back to
 * AppTranslations so existing call sites keep working during incremental migration.
 */
@Composable
fun tr(text: String): String {
    if (text.isBlank()) return text
    @StringRes val resId: Int? = when (text.trim()) {
        // Navigation
        "Home" -> R.string.home
        "Search",
        "Search or discover... try \"top 10 horror movies\"" -> R.string.search
        "Watchlist",
        "Add to Watchlist",
        "Remove from Watchlist" -> R.string.watchlist
        "Settings",
        "App Update",
        "App Updates" -> R.string.settings
        "General" -> R.string.general
        "Movies",
        "In Cinema" -> R.string.movies
        "Movie" -> R.string.movie
        "TV Shows" -> R.string.tv_shows
        "Shows" -> R.string.shows
        "Series" -> R.string.series
        "All Genres" -> R.string.all_genres
        "Any Language" -> R.string.any_language
        // Language & subtitles
        "Language & Subtitles" -> R.string.language_and_subtitles
        "App Language",
        "Content Language",
        "App text, titles, descriptions and metadata",
        "Titles, descriptions and metadata" -> R.string.app_language
        "Subtitles",
        "Default Subtitle",
        "Default Subtitles",
        "Auto-select subtitle language",
        "Subtitle Size",
        "Text size for subtitles",
        "Subtitle Color",
        "Text color for subtitles",
        "Subtitle Style",
        "Bold, Normal, or Background style for subtitles" -> R.string.subtitles
        "Audio",
        "Audio Track",
        "Default Audio",
        "Preferred audio track",
        "Volume Boost",
        "Amplify quiet sources (via system LoudnessEnhancer)",
        "No audio tracks available" -> R.string.audio
        // Playback
        "Playback",
        "Match Frame Rate" -> R.string.playback
        "Auto-Play Next",
        "Start next episode automatically",
        "Next Episode",
        "Next",
        "Next channel" -> R.string.next
        "Autoplay",
        "Auto-Play Min Quality",
        "Min quality for auto-play",
        "Auto" -> R.string.auto
        "Trailer Auto-Play",
        "Play trailers in hero banner",
        "Trailer",
        "Close trailer" -> R.string.trailer
        // Interface
        "Interface",
        "Card Layout",
        "Landscape or poster cards",
        "UI Mode",
        "Force TV, Tablet, or Phone",
        "Skip Profile Selection",
        "Auto-load last used profile",
        "Clock Format",
        "Choose 12-hour or 24-hour time" -> R.string.interface_label
        "Show Budget on Home",
        "Display the movie budget on the home hero banner",
        "Budget" -> R.string.budget
        // Network
        "Network",
        "DNS Provider",
        "Resolve API and stream requests" -> R.string.network
        // Catalogs / accounts
        "Catalogs",
        "Add Catalog",
        "Import a Trakt or MDBList catalog URL",
        "Trakt/MDBList URLs can be added manually. Addon catalogs appear automatically." -> R.string.catalogs
        "Accounts",
        "Linked Accounts",
        "Optional account for syncing profiles, addons, catalogs and IPTV settings" -> R.string.accounts
        // Sources
        "Sources",
        "Off opens the source picker on Play" -> R.string.sources
        "Available Sources" -> R.string.available_sources
        "Finding sources..." -> R.string.finding_sources
        "sources available" -> R.string.sources_available
        // IPTV
        "Add Playlist",
        "Create another IPTV list",
        "Add Catalog",
        "Add" -> R.string.add
        "Refresh IPTV Data",
        "Reload playlists now",
        "Reload playlist and EPG now",
        "Refresh" -> R.string.refresh
        "Refreshing channels and EPG...",
        "Waiting for authorization... (Press OK to cancel)" -> R.string.loading_label
        "Delete IPTV Playlists",
        "Remove playlists, EPG and favorites",
        "Remove from Continue Watching",
        "Remove",
        "Delete" -> R.string.delete
        "No playlists configured",
        "Empty" -> R.string.empty
        // Content
        "Details",
        "View Details" -> R.string.details
        "Play" -> R.string.play
        "Seasons" -> R.string.seasons
        "Season" -> R.string.season_label
        "Episodes" -> R.string.episodes
        "Cast" -> R.string.cast
        "Reviews" -> R.string.reviews
        "More Like This" -> R.string.more_like_this
        "Ongoing" -> R.string.ongoing
        // Watchlist
        "Your watchlist is empty" -> R.string.empty_watchlist
        "Add movies and shows to watch later" -> R.string.add_later
        "No results found",
        "Unable to load content",
        "ARVIO uses community streaming addons to find video sources. Without at least one streaming addon, content cannot be played." -> R.string.no_results
        "No results found for" -> R.string.no_results_for
        // Actions
        "Close",
        "Press BACK to close" -> R.string.close
        "Back",
        "Back to channel list",
        "Previous channel" -> R.string.back
        "Cancel" -> R.string.cancel
        "Confirm",
        "Mark as Watched",
        "Mark as Unwatched",
        "Create" -> R.string.confirm
        "Retry" -> R.string.retry
        "Sign In" -> R.string.sign_in
        "Log Out" -> R.string.log_out
        "Off" -> R.string.off
        "On" -> R.string.on
        "Live" -> R.string.live
        "Now" -> R.string.now
        "Later" -> R.string.later
        "Ends at" -> R.string.ends_at
        "selected",
        "Selected" -> R.string.selected
        else -> null
    }
    if (resId != null) return stringResource(resId)

    // Derived / composite strings
    return when (text.trim()) {
        "MY WATCHLIST" -> stringResource(R.string.watchlist).uppercase()
        "BUDGET" -> stringResource(R.string.budget).uppercase()
        "ONGOING" -> stringResource(R.string.ongoing).uppercase()
        "FILTER BY SOURCE" -> stringResource(R.string.sources).uppercase()
        "TRY AGAIN" -> stringResource(R.string.retry).uppercase()
        "GO BACK" -> stringResource(R.string.back).uppercase()
        "UP NEXT" -> stringResource(R.string.next).uppercase()
        "PLAY NOW" -> stringResource(R.string.play).uppercase()
        "CANCEL" -> stringResource(R.string.cancel).uppercase()
        "OK" -> stringResource(R.string.confirm).uppercase()
        "NOW" -> stringResource(R.string.now).uppercase()
        "NEXT" -> stringResource(R.string.next).uppercase()
        "LATER" -> stringResource(R.string.later).uppercase()
        "LIVE" -> stringResource(R.string.live).uppercase()
        "ADD" -> stringResource(R.string.add).uppercase()
        "LOADING" -> stringResource(R.string.loading_label).uppercase()
        "REFRESH" -> stringResource(R.string.refresh).uppercase()
        "EMPTY" -> stringResource(R.string.empty).uppercase()
        "DELETE" -> stringResource(R.string.delete).uppercase()
        "CONNECT" -> stringResource(R.string.sign_in).uppercase()
        "CONNECTED" -> stringResource(R.string.on).uppercase()
        "Subtitles & Audio" ->
            "${stringResource(R.string.subtitles)} / ${stringResource(R.string.audio)}"
        "Switch tabs • Navigate • BACK Close",
        "Switch tabs â¢ Navigate â¢ BACK Close" ->
            "${stringResource(R.string.subtitles)} • ${stringResource(R.string.back)} • ${stringResource(R.string.close)}"
        "Off, Seamless, or Always" ->
            "${stringResource(R.string.off)} / ${stringResource(R.string.auto)}"
        else -> AppTranslations.translate(text, LocalAppLanguage.current)
    }
}

@Composable
fun trUpper(text: String): String = tr(text).uppercase(appLocale(LocalAppLanguage.current))

object AppTranslations {
    fun translate(text: String, languageTag: String): String {
        if (text.isBlank()) return text
        val locale = appLocale(languageTag)
        val language = locale.language.lowercase(Locale.US)
        if (language != "de") return text

        val normalized = text.trim().replace("â€¢", "•")
        val table = localeKeys(locale).firstNotNullOfOrNull { translations[it] } ?: return text
        translateDynamic(normalized, table)?.let { return it }
        return table[normalized] ?: text
    }

    private fun localeKeys(locale: Locale): List<String> {
        val language = locale.language.lowercase(Locale.US)
        val country = locale.country.uppercase(Locale.US)
        return if (country.isBlank()) {
            listOf(language)
        } else {
            listOf("$language-$country", language)
        }
    }

private object AppLanguageRegexes {
    val MOVIES = Regex("""Movies \((\d+)\)""")
    val TV_SHOWS = Regex("""TV Shows \((\d+)\)""")
    val NO_RESULTS = Regex("No results found for \"(.+)\"")
    val SOURCES = Regex("""(\d+) sources available""")
    val NEXT = Regex("""Next: (.+)""")
    val ENDS_AT = Regex("""Ends at (.+)""")
}

    private fun translateDynamic(text: String, table: Map<String, String>): String? {
        AppLanguageRegexes.MOVIES.matchEntire(text)?.let {
            return "${table.word("Movies")} (${it.groupValues[1]})"
        }
        AppLanguageRegexes.TV_SHOWS.matchEntire(text)?.let {
            return "${table.word("TV Shows")} (${it.groupValues[1]})"
        }
        AppLanguageRegexes.NO_RESULTS.matchEntire(text)?.let {
            return "${table.word("No results found for")} \"${it.groupValues[1]}\""
        }
        AppLanguageRegexes.SOURCES.matchEntire(text)?.let {
            return "${it.groupValues[1]} ${table.word("sources available")}"
        }
        AppLanguageRegexes.NEXT.matchEntire(text)?.let {
            return "${table.word("Next")}: ${it.groupValues[1]}"
        }
        AppLanguageRegexes.ENDS_AT.matchEntire(text)?.let {
            return "${table.word("Ends at")} ${it.groupValues[1]}"
        }
        return null
    }

    private fun Map<String, String>.word(key: String): String = this[key] ?: key

    private val translations: Map<String, Map<String, String>> = mapOf(
        "de" to commonUi("Start", "Suche", "Merkliste", "Einstellungen", "Allgemein", "Filme", "Film", "Serien", "Serien", "Serie", "Alle Genres", "Jede Sprache", "App-Sprache", "Sprache und Untertitel", "Untertitel", "Audio", "Wiedergabe", "Oberfläche", "Netzwerk", "Kataloge", "Konten", "Quellen", "Details", "Abspielen", "Trailer", "Staffeln", "Staffel", "Episoden", "Besetzung", "Rezensionen", "Mehr davon", "Schließen", "Zurück", "Abbrechen", "Bestätigen", "Erneut versuchen", "Laden", "Leer", "Löschen", "Hinzufügen", "Aktualisieren", "ausgewählt", "Anmelden", "Abmelden", "Weiter", "Live", "Jetzt", "Später", "Aus", "Ein", "Auto", "Budget", "Läuft", "Quellen werden gesucht...", "Verfügbare Quellen", "Keine Ergebnisse gefunden", "Keine Ergebnisse gefunden für", "Deine Merkliste ist leer", "Füge Filme und Serien für später hinzu", "Quellen verfügbar", "Endet um"),
    )

    private fun commonUi(
        home: String,
        search: String,
        watchlist: String,
        settings: String,
        general: String,
        movies: String,
        movie: String,
        tvShows: String,
        shows: String,
        series: String,
        allGenres: String,
        anyLanguage: String,
        appLanguage: String,
        languageAndSubtitles: String,
        subtitles: String,
        audio: String,
        playback: String,
        interfaceText: String,
        network: String,
        catalogs: String,
        accounts: String,
        sources: String,
        details: String,
        play: String,
        trailer: String,
        seasons: String,
        season: String,
        episodes: String,
        cast: String,
        reviews: String,
        moreLikeThis: String,
        close: String,
        back: String,
        cancel: String,
        confirm: String,
        retry: String,
        loading: String,
        empty: String,
        delete: String,
        add: String,
        refresh: String,
        selected: String,
        signIn: String,
        logOut: String,
        next: String,
        live: String,
        now: String,
        later: String,
        off: String,
        on: String,
        auto: String,
        budget: String,
        ongoing: String,
        findingSources: String,
        availableSources: String,
        noResults: String,
        noResultsFor: String,
        emptyWatchlist: String,
        addLater: String,
        sourcesAvailable: String,
        endsAt: String,
        extras: Map<String, String> = emptyMap()
    ): Map<String, String> = mapOf(
        "Home" to home,
        "Search" to search,
        "Watchlist" to watchlist,
        "TV" to "TV",
        "Settings" to settings,
        "General" to general,
        "IPTV" to "IPTV",
        "Iptv" to "IPTV",
        "Catalogs" to catalogs,
        "Stremio" to "Addons",
        "Accounts" to accounts,
        "MY WATCHLIST" to watchlist.uppercase(Locale.ROOT),
        "Your watchlist is empty" to emptyWatchlist,
        "Add movies and shows to watch later" to addLater,
        "Movies" to movies,
        "Movie" to movie,
        "TV Shows" to tvShows,
        "Shows" to shows,
        "Series" to series,
        "All Genres" to allGenres,
        "Any Language" to anyLanguage,
        "Search or discover... try \"top 10 horror movies\"" to search,
        "No results found" to noResults,
        "No results found for" to noResultsFor,
        "Language & Subtitles" to languageAndSubtitles,
        "App Language" to appLanguage,
        "Content Language" to appLanguage,
        "App text, titles, descriptions and metadata" to appLanguage,
        "Titles, descriptions and metadata" to appLanguage,
        "Default Subtitle" to subtitles,
        "Default Subtitles" to subtitles,
        "Auto-select subtitle language" to subtitles,
        "Default Audio" to audio,
        "Preferred audio track" to audio,
        "Subtitle Size" to subtitles,
        "Text size for subtitles" to subtitles,
        "Subtitle Color" to subtitles,
        "Text color for subtitles" to subtitles,
        "Subtitle Style" to subtitles,
        "Bold, Normal, or Background style for subtitles" to subtitles,
        "Playback" to playback,
        "Auto-Play Next" to next,
        "Start next episode automatically" to next,
        "Autoplay" to auto,
        "Off opens the source picker on Play" to sources,
        "Auto-Play Min Quality" to auto,
        "Min quality for auto-play" to auto,
        "Trailer Auto-Play" to trailer,
        "Play trailers in hero banner" to trailer,
        "Match Frame Rate" to playback,
        "Off, Seamless, or Always" to "$off / $auto",
        "Quality Regex Filters" to "Regex",
        "Exclude quality tiers on this device" to "Regex",
        "Interface" to interfaceText,
        "Card Layout" to interfaceText,
        "Landscape or poster cards" to interfaceText,
        "UI Mode" to interfaceText,
        "Force TV, Tablet, or Phone" to interfaceText,
        "Skip Profile Selection" to interfaceText,
        "Auto-load last used profile" to interfaceText,
        "Clock Format" to interfaceText,
        "Choose 12-hour or 24-hour time" to interfaceText,
        "Show Budget on Home" to budget,
        "Display the movie budget on the home hero banner" to budget,
        "Network" to network,
        "DNS Provider" to network,
        "Resolve API and stream requests" to network,
        "Audio" to audio,
        "Volume Boost" to audio,
        "Amplify quiet sources (via system LoudnessEnhancer)" to audio,
        "Add Playlist" to add,
        "Add up to 3 M3U / Xtream IPTV lists with names" to "IPTV",
        "Create another IPTV list" to add,
        "Refresh IPTV Data" to refresh,
        "Refreshing channels and EPG..." to loading,
        "Reload playlists now" to refresh,
        "Reload playlist and EPG now" to refresh,
        "Delete IPTV Playlists" to delete,
        "No playlists configured" to empty,
        "Remove playlists, EPG and favorites" to delete,
        "Add Catalog" to add,
        "Import a Trakt or MDBList catalog URL" to catalogs,
        "Trakt/MDBList URLs can be added manually. Addon catalogs appear automatically." to catalogs,
        "Linked Accounts" to accounts,
        "ARVIO Cloud" to "ARVIO Cloud",
        "Optional account for syncing profiles, addons, catalogs and IPTV settings" to accounts,
        "App Update" to settings,
        "App Updates" to settings,
        "Unable to load content" to noResults,
        "Retry" to retry,
        "In Cinema" to movies,
        "Details" to details,
        "Included with Prime" to "Prime",
        "View Details" to details,
        "Add to Watchlist" to watchlist,
        "Remove from Watchlist" to watchlist,
        "Mark as Watched" to confirm,
        "Mark as Unwatched" to confirm,
        "Remove from Continue Watching" to delete,
        "Press BACK to close" to close,
        "Trailer" to trailer,
        "Close trailer" to close,
        "Seasons" to seasons,
        "Season" to season,
        "Episodes" to episodes,
        "Cast" to cast,
        "Reviews" to reviews,
        "More Like This" to moreLikeThis,
        "Budget" to budget,
        "BUDGET" to budget.uppercase(Locale.ROOT),
        "ONGOING" to ongoing.uppercase(Locale.ROOT),
        "Sources" to sources,
        "FILTER BY SOURCE" to sources.uppercase(Locale.ROOT),
        "Available Sources" to availableSources,
        "Finding sources..." to findingSources,
        "sources available" to sourcesAvailable,
        "Close" to close,
        "Back" to back,
        "Selected" to selected,
        "Play" to play,
        "Subtitles" to subtitles,
        "Subtitles & Audio" to "$subtitles / $audio",
        "Audio Track" to audio,
        "Next Episode" to next,
        "Switch tabs • Navigate • BACK Close" to "$subtitles • $back • $close",
        "Switch tabs â€¢ Navigate â€¢ BACK Close" to "$subtitles • $back • $close",
        "ARVIO uses community streaming addons to find video sources. Without at least one streaming addon, content cannot be played." to noResults,
        "No audio tracks available" to audio,
        "TRY AGAIN" to retry.uppercase(Locale.ROOT),
        "GO BACK" to back.uppercase(Locale.ROOT),
        "UP NEXT" to next.uppercase(Locale.ROOT),
        "PLAY NOW" to play.uppercase(Locale.ROOT),
        "CANCEL" to cancel.uppercase(Locale.ROOT),
        "OK" to confirm.uppercase(Locale.ROOT),
        "NOW" to now.uppercase(Locale.ROOT),
        "NEXT" to next.uppercase(Locale.ROOT),
        "Next" to next,
        "LATER" to later.uppercase(Locale.ROOT),
        "LIVE" to live.uppercase(Locale.ROOT),
        "IPTV is not configured" to "IPTV",
        "Back to channel list" to back,
        "Previous channel" to back,
        "Next channel" to next,
        "Off" to off,
        "On" to on,
        "Auto" to auto,
        "Tablet" to "Tablet",
        "Phone" to "Phone",
        "Landscape" to "Landscape",
        "Poster" to "Poster",
        "Medium" to "Medium",
        "White" to "White",
        "Yellow" to "Yellow",
        "Green" to "Green",
        "Cyan" to "Cyan",
        "ADD" to add.uppercase(Locale.ROOT),
        "FULL" to "FULL",
        "LOADING" to loading.uppercase(Locale.ROOT),
        "REFRESH" to refresh.uppercase(Locale.ROOT),
        "EMPTY" to empty.uppercase(Locale.ROOT),
        "DELETE" to delete.uppercase(Locale.ROOT),
        "CONNECTED" to on.uppercase(Locale.ROOT),
        "CONNECT" to signIn.uppercase(Locale.ROOT),
        "Cancel" to cancel,
        "Confirm" to confirm,
        "Create" to add,
        "Remove" to delete,
        "Email" to "Email",
        "Password" to "Password",
        "Sign In" to signIn,
        "Log Out" to logOut,
        "Delete" to delete,
        "selected" to selected,
        "Enter code:" to "Code:",
        "Waiting for authorization... (Press OK to cancel)" to loading,
        "Ends at" to endsAt
    ) + extras
}
