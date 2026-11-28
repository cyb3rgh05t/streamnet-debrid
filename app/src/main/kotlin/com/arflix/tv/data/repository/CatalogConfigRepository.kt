package com.arflix.tv.data.repository

import android.content.Context
import android.util.Log
import com.arflix.tv.data.model.CatalogConfig
import com.arflix.tv.data.model.CatalogKind
import com.arflix.tv.data.model.CatalogSourceType
import com.arflix.tv.data.model.CollectionGroupKind
import com.arflix.tv.data.model.CollectionSourceConfig
import com.arflix.tv.data.model.CollectionSourceKind
import com.arflix.tv.data.model.CollectionTileShape
import com.arflix.tv.util.CatalogUrlParser
import com.arflix.tv.util.Constants
import com.arflix.tv.util.ParsedCatalogUrl
import com.google.gson.Gson
import com.google.gson.JsonArray
import com.google.gson.JsonObject
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.net.URI
import javax.inject.Inject
import javax.inject.Singleton

private val franchiseRefPattern = Regex("^(movie|tv):\\d{1,9}$")
private val franchiseIdPattern = Regex("^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$")
private val mdblistSlugPattern = Regex("^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")
private const val TAB_MOVIE = "movie"
private const val TAB_SERIES = "series"
private const val TAB_TIMELINE = "timeline"
private val franchiseTabs = setOf(TAB_MOVIE, TAB_SERIES, TAB_TIMELINE)

/** A curated tab list; only the timeline carries labels, because only it keeps repeated titles. */
internal fun franchiseListCuratedSource(entries: List<FranchiseListEntry>, tab: String) = CollectionSourceConfig(
    kind = CollectionSourceKind.CURATED_IDS,
    collectionTab = tab,
    curatedRefs = entries.map { it.ref },
    curatedTitles = if (tab == TAB_TIMELINE) entries.map { it.title.orEmpty() } else null
)

/** A franchise of the central configuration: one of the three built-in ones or an admin-created one. */
internal data class RemoteFranchise(
    val id: String,
    val title: String,
    val catalogId: String,
    val builtin: Boolean,
    val coverUrl: String?,
    val tabs: FranchiseListTabs,
    val tmdbCollections: List<Int>,
    val mdblist: List<String>
)

/** Replacement lists of a collection; null keeps the app's own list of that kind. */
internal data class CentralSources(
    val tmdbCollections: List<Int>? = null,
    val mdblist: List<String>? = null,
    // The titles the app ships outside the tab lists (e.g. the Harry Potter series); empty removes them.
    val curated: List<String>? = null
)

internal const val CENTRAL_ROW_PREFIX = "central_row_"

/** A Home row the admin added for everyone: an MDBList or Trakt list, optionally placed after another row. */
internal data class CentralRow(
    val id: String,
    val title: String,
    val url: String,
    val after: String,
    val source: CentralRowSource = CentralRowSource.MDBLIST
) {
    val catalogId: String get() = CENTRAL_ROW_PREFIX + id.replace('-', '_')
}

internal enum class CentralRowSource { MDBLIST, TRAKT }

/** A collection the admin added for everyone: a streaming service (TMDB watch providers, MDBList lists) or a decade (MDBList lists). */
internal data class CentralCollection(
    val id: String,
    val group: CollectionGroupKind,
    val title: String,
    val coverUrl: String?,
    val introUrl: String?,
    val providers: List<Int>,
    val mdblist: List<String>,
    val region: String = "US"
) {
    val catalogId: String get() = "collection_${group.name.lowercase()}_" + id.replace('-', '_')
}

/** Admin overrides of the standard catalogs, valid for every device. */
internal data class CentralOverrides(
    val rows: Map<String, String> = emptyMap(),
    val hidden: Set<String> = emptySet(),
    val newRows: List<CentralRow> = emptyList(),
    val covers: Map<String, String> = emptyMap(),
    val intros: Map<String, String> = emptyMap(),
    val titles: Map<String, String> = emptyMap(),
    val newCollections: List<CentralCollection> = emptyList(),
    val sources: Map<String, CentralSources> = emptyMap(),
    val extras: Map<String, List<String>> = emptyMap()
)

internal data class CentralCatalogConfig(
    val franchises: List<RemoteFranchise> = emptyList(),
    val overrides: CentralOverrides = CentralOverrides()
)

/** Catalog ids of admin-created franchises; the manifest only knows the bundled ones. */
internal object RemoteFranchiseIds {
    @Volatile var ids: Set<String> = emptySet()
}

/** The configuration currently in effect, readable without the repository (e.g. when stored catalogs are refreshed). */
internal object CurrentCentralConfig {
    @Volatile var value: CentralCatalogConfig = CentralCatalogConfig()
}

/**
 * The catalog configuration the admin maintains for all devices: the Marvel, DC and Star Wars lists, extra
 * franchises and overrides of the standard rows. The app ships a copy of the lists ([BundledFranchiseLists]);
 * the backend's copy replaces it once fetched. A failed fetch or a backend outage keeps the last good copy.
 * New data shows up with the next Home sync after the fetch.
 */
@Singleton
class CatalogConfigRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val okHttpClient: OkHttpClient
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val cacheFile by lazy { File(context.filesDir, "catalog_config_v2.json") }

    @Volatile private var config: CentralCatalogConfig = CentralCatalogConfig()
    @Volatile private var lastAttemptAt = 0L

    init {
        readCache()?.let(::publish)
    }

    /** The bundled catalogs with the central lists and overrides applied, plus the admin-created franchises. */
    fun applyToDefaults(defaults: List<CatalogConfig>): List<CatalogConfig> {
        refreshIfDue()
        return applyCentralConfig(defaults, config)
    }

    /** Swaps the tab lists of a Marvel/DC/Star Wars collection for the central ones; anything else is returned as is. */
    fun apply(catalog: CatalogConfig): CatalogConfig {
        if (BundledFranchiseLists.byCatalogId[catalog.id] == null) return catalog
        refreshIfDue()
        val franchise = config.franchises.firstOrNull { it.catalogId == catalog.id } ?: return catalog
        return catalog.copy(collectionSources = withLists(catalog.collectionSources, franchise.tabs))
    }

    private fun publish(parsed: CentralCatalogConfig) {
        config = parsed
        CurrentCentralConfig.value = parsed
        RemoteFranchiseIds.ids = parsed.franchises.filterNot { it.builtin }.mapTo(HashSet()) { it.catalogId } +
            parsed.overrides.newCollections.map { it.catalogId }
    }

    private fun refreshIfDue() {
        val now = System.currentTimeMillis()
        if (now - lastAttemptAt < REFRESH_INTERVAL_MS || !Constants.CLOUD_SYNC_ENABLED) return
        lastAttemptAt = now
        scope.launch { refresh() }
    }

    private fun refresh() {
        val url = "${Constants.CLOUD_BACKEND_URL}/catalog-config"
        val body = try {
            okHttpClient.newCall(Request.Builder().url(url).header("Accept", "application/json").build()).execute().use { response ->
                if (!response.isSuccessful) return
                response.body?.string().orEmpty()
            }
        } catch (e: Exception) {
            Log.w(TAG, "Catalog config unavailable, keeping the current copy", e)
            return
        }
        val parsed = parseCatalogConfig(body) ?: return
        publish(parsed)
        runCatching { cacheFile.writeText(body) }
    }

    private fun readCache(): CentralCatalogConfig? = try {
        if (cacheFile.exists()) parseCatalogConfig(cacheFile.readText()) else null
    } catch (e: Exception) {
        null
    }

    companion object {
        private const val TAG = "CatalogConfig"
        private const val REFRESH_INTERVAL_MS = 10 * 60 * 1000L
        private const val MAX_TITLE_LENGTH = 120

        /** Parses the `/catalog-config` response; null when it is not a usable configuration. */
        internal fun parseCatalogConfig(json: String): CentralCatalogConfig? {
            val root = try {
                Gson().fromJson(json, JsonObject::class.java)
            } catch (e: Exception) {
                null
            } ?: return null
            val franchises = root.getAsJsonArray("franchises") ?: return null
            val reserved = CollectionTemplateManifest.entries.mapTo(HashSet()) { it.id }
            val parsed = LinkedHashMap<String, RemoteFranchise>()
            for (element in franchises) {
                val franchise = runCatching { parseFranchise(element.asJsonObject, reserved) }.getOrNull() ?: continue
                parsed.putIfAbsent(franchise.catalogId, franchise)
            }
            if (parsed.isEmpty() && franchises.size() > 0) return null
            return CentralCatalogConfig(
                franchises = parsed.values.toList(),
                overrides = parseOverrides(root.getAsJsonObject("overrides"))
            )
        }

        private fun parseFranchise(item: JsonObject, reserved: Set<String>): RemoteFranchise? {
            val id = item.get("id")?.asString?.trim().orEmpty()
            val builtin = item.get("builtin")?.asBoolean == true
            val catalogId = if (builtin) {
                item.get("catalogId")?.asString?.takeIf { BundledFranchiseLists.byCatalogId.containsKey(it) } ?: return null
            } else {
                if (!franchiseIdPattern.matches(id)) return null
                "collection_franchise_" + id.replace('-', '_')
            }
            if (!builtin && catalogId in reserved) return null
            val title = item.get("title")?.asString?.trim().orEmpty().take(MAX_TITLE_LENGTH)
            if (title.isBlank()) return null
            val tabs = item.getAsJsonObject("tabs")
            return RemoteFranchise(
                id = id,
                title = title,
                catalogId = catalogId,
                builtin = builtin,
                coverUrl = item.get("coverUrl")?.takeIf { !it.isJsonNull }?.asString?.trim()?.takeIf(::isPlainHttps),
                tabs = FranchiseListTabs(
                    movie = entries(tabs, TAB_MOVIE, keepRepeats = false),
                    series = entries(tabs, TAB_SERIES, keepRepeats = false),
                    timeline = entries(tabs, TAB_TIMELINE, keepRepeats = true)
                ),
                tmdbCollections = item.getAsJsonArray("tmdbCollections").orEmpty()
                    .mapNotNull { runCatching { it.asInt }.getOrNull()?.takeIf { id -> id > 0 } }.distinct().take(10),
                mdblist = item.getAsJsonArray("mdblist").orEmpty()
                    .mapNotNull { runCatching { it.asString.trim() }.getOrNull()?.takeIf(mdblistSlugPattern::matches) }
                    .distinct().take(10)
            )
        }

        private fun entries(tabs: JsonObject?, tab: String, keepRepeats: Boolean): List<FranchiseListEntry> {
            val parsed = tabs?.getAsJsonArray(tab).orEmpty().mapNotNull { element ->
                val entry = runCatching { element.asJsonObject }.getOrNull() ?: return@mapNotNull null
                val ref = entry.get("ref")?.asString?.trim()?.lowercase()?.takeIf(franchiseRefPattern::matches)
                    ?: return@mapNotNull null
                val title = if (tab == TAB_TIMELINE) {
                    entry.get("title")?.takeIf { !it.isJsonNull }?.asString?.trim()?.take(MAX_TITLE_LENGTH)?.ifBlank { null }
                } else null
                FranchiseListEntry(ref, title)
            }
            return if (keepRepeats) parsed else parsed.distinctBy { it.ref }
        }

        private fun parseOverrides(overrides: JsonObject?): CentralOverrides {
            if (overrides == null) return CentralOverrides()
            fun strings(name: String): Map<String, String> = overrides.getAsJsonObject(name)?.entrySet()
                ?.mapNotNull { (key, value) -> runCatching { key to value.asString }.getOrNull() }?.toMap().orEmpty()
            return CentralOverrides(
                rows = strings("rows"),
                hidden = overrides.getAsJsonArray("hidden").orEmpty().mapNotNull { runCatching { it.asString }.getOrNull() }.toSet(),
                newRows = overrides.getAsJsonArray("newRows").orEmpty().mapNotNull { element ->
                    val row = runCatching { element.asJsonObject }.getOrNull() ?: return@mapNotNull null
                    val id = row.get("id")?.asString?.trim().orEmpty()
                    val title = row.get("title")?.asString?.trim().orEmpty().take(MAX_TITLE_LENGTH)
                    val url = row.get("url")?.asString?.trim().orEmpty()
                    // No `source` means MDBList (older backends); a source this app does not know drops the row.
                    val source = when (row.get("source")?.takeIf { !it.isJsonNull }?.asString?.trim()?.lowercase()) {
                        null, "", "mdblist" -> CentralRowSource.MDBLIST
                        "trakt" -> CentralRowSource.TRAKT
                        else -> return@mapNotNull null
                    }
                    val validUrl = when (source) {
                        CentralRowSource.MDBLIST -> isValidRemoteMdblistUrl(url)
                        CentralRowSource.TRAKT -> isValidRemoteTraktUrl(url)
                    }
                    if (!franchiseIdPattern.matches(id) || title.isBlank() || !validUrl) return@mapNotNull null
                    CentralRow(id, title, url, row.get("after")?.takeIf { !it.isJsonNull }?.asString?.trim().orEmpty(), source)
                }.take(20),
                covers = strings("covers"),
                intros = strings("intros"),
                titles = strings("titles"),
                newCollections = overrides.getAsJsonArray("newCollections").orEmpty().mapNotNull { element ->
                    val entry = runCatching { element.asJsonObject }.getOrNull() ?: return@mapNotNull null
                    val group = when (entry.get("group")?.takeIf { !it.isJsonNull }?.asString?.trim()?.uppercase() ?: "SERVICE") {
                        "SERVICE" -> CollectionGroupKind.SERVICE
                        "DECADE" -> CollectionGroupKind.DECADE
                        else -> return@mapNotNull null
                    }
                    val id = entry.get("id")?.asString?.trim().orEmpty()
                    val title = entry.get("title")?.asString?.trim().orEmpty().take(MAX_TITLE_LENGTH)
                    val providers = entry.getAsJsonArray("providers").orEmpty()
                        .mapNotNull { runCatching { it.asInt }.getOrNull()?.takeIf { value -> value > 0 } }.distinct().take(10)
                    val lists = entry.getAsJsonArray("mdblist").orEmpty()
                        .mapNotNull { runCatching { it.asString.trim() }.getOrNull()?.takeIf(mdblistSlugPattern::matches) }
                        .distinct().take(5)
                    val hasSources = if (group == CollectionGroupKind.DECADE) lists.isNotEmpty() else providers.isNotEmpty() || lists.isNotEmpty()
                    if (!franchiseIdPattern.matches(id) || title.isBlank() || !hasSources) return@mapNotNull null
                    CentralCollection(
                        id = id,
                        group = group,
                        title = title,
                        coverUrl = entry.get("coverUrl")?.takeIf { !it.isJsonNull }?.asString?.trim()?.takeIf(::isPlainHttps),
                        introUrl = if (group == CollectionGroupKind.SERVICE) {
                            entry.get("introUrl")?.takeIf { !it.isJsonNull }?.asString?.trim()?.takeIf(::isPlainHttps)
                        } else null,
                        providers = if (group == CollectionGroupKind.SERVICE) providers else emptyList(),
                        mdblist = lists,
                        region = entry.get("region")?.takeIf { !it.isJsonNull }?.asString?.trim()?.uppercase()
                            ?.takeIf { it.matches(Regex("^[A-Z]{2}$")) } ?: "US"
                    )
                }.distinctBy { it.catalogId }.take(20),
                sources = overrides.getAsJsonObject("sources")?.entrySet()?.mapNotNull { (catalogId, value) ->
                    val item = runCatching { value.asJsonObject }.getOrNull() ?: return@mapNotNull null
                    val tmdb = item.getAsJsonArray("tmdbCollections")?.mapNotNull { runCatching { it.asInt }.getOrNull()?.takeIf { id -> id > 0 } }
                        ?.distinct()?.take(10)?.takeIf { it.isNotEmpty() }
                    val mdblist = item.getAsJsonArray("mdblist")?.mapNotNull { runCatching { it.asString.trim() }.getOrNull()?.takeIf(mdblistSlugPattern::matches) }
                        ?.distinct()?.take(10)?.takeIf { it.isNotEmpty() }
                    val curated = item.getAsJsonArray("curated")?.mapNotNull { runCatching { it.asString.trim().lowercase() }.getOrNull()?.takeIf(franchiseRefPattern::matches) }
                        ?.distinct()?.take(30)
                    if (tmdb == null && mdblist == null && curated == null) null else catalogId to CentralSources(tmdb, mdblist, curated)
                }?.toMap().orEmpty(),
                extras = overrides.getAsJsonObject("extras")?.entrySet()?.mapNotNull { (catalogId, value) ->
                    val refs = runCatching { value.asJsonArray.map { it.asString } }.getOrNull() ?: return@mapNotNull null
                    catalogId to refs
                }?.toMap().orEmpty()
            )
        }

        private fun JsonArray?.orEmpty(): List<com.google.gson.JsonElement> = this?.toList().orEmpty()

        private fun isPlainHttps(url: String): Boolean {
            if (url.isEmpty() || url.length > 500) return false
            val uri = runCatching { URI(url) }.getOrNull() ?: return false
            return uri.scheme?.lowercase() == "https" && uri.userInfo == null && !uri.host.isNullOrBlank()
        }

        /** Applies the central lists and overrides to the bundled catalogs and adds the admin-created franchises. */
        internal fun applyCentralConfig(defaults: List<CatalogConfig>, config: CentralCatalogConfig): List<CatalogConfig> {
            val adjusted = defaults.filterNot { it.id in config.overrides.hidden }.map { applyToBundled(it, config) }
                .let { withCentralRows(it, config.overrides.newRows) }
            val addedCollections = config.overrides.newCollections
                .filter { entry -> adjusted.none { it.id == entry.catalogId } }
                .map { applyCentralOverrides(collectionCatalog(it), config.overrides) }
            val created = config.franchises.filterNot { it.builtin }
                .filter { franchise -> adjusted.none { it.id == franchise.catalogId } }
                .map { applyCentralOverrides(franchiseCatalog(it), config.overrides) }
            val withCollections = listOf(CollectionGroupKind.SERVICE, CollectionGroupKind.DECADE).fold(adjusted) { list, group ->
                insertAfterGroup(list, group, addedCollections.filter { it.collectionGroup == group })
            }
            return insertAfterGroup(withCollections, CollectionGroupKind.FRANCHISE, created)
        }

        /** Places [added] behind the last collection of [group], or at the end when the group has none. */
        private fun insertAfterGroup(
            catalogs: List<CatalogConfig>,
            group: CollectionGroupKind,
            added: List<CatalogConfig>
        ): List<CatalogConfig> {
            if (added.isEmpty()) return catalogs
            val last = catalogs.indexOfLast { it.kind == CatalogKind.COLLECTION && it.collectionGroup == group }
            val insertAt = if (last >= 0) last + 1 else catalogs.size
            return catalogs.take(insertAt) + added + catalogs.drop(insertAt)
        }

        private fun collectionCatalog(service: CentralCollection): CatalogConfig {
            val sources = buildList {
                service.providers.forEach { provider ->
                    for (type in listOf("movie", "series")) {
                        add(
                            CollectionSourceConfig(
                                kind = CollectionSourceKind.TMDB_WATCH_PROVIDER,
                                mediaType = type,
                                tmdbWatchProviderId = provider,
                                watchRegion = service.region,
                                sortBy = "popularity.desc"
                            )
                        )
                    }
                }
                service.mdblist.forEach { add(CollectionSourceConfig(kind = CollectionSourceKind.MDBLIST_PUBLIC, mdblistSlug = it)) }
            }
            return CatalogConfig(
                id = service.catalogId,
                title = service.title,
                sourceType = CatalogSourceType.PREINSTALLED,
                isPreinstalled = true,
                kind = CatalogKind.COLLECTION,
                collectionGroup = service.group,
                collectionDescription = if (service.group == CollectionGroupKind.SERVICE) "Trending movies and series on ${service.title}." else null,
                collectionCoverImageUrl = service.coverUrl,
                collectionFocusGifUrl = service.coverUrl,
                collectionHeroImageUrl = service.coverUrl,
                collectionHeroGifUrl = service.coverUrl,
                collectionHeroVideoUrl = service.introUrl,
                collectionTileShape = CollectionTileShape.LANDSCAPE,
                collectionHideTitle = service.coverUrl != null,
                collectionSources = sources
            )
        }

        /** Adds the rows the admin created, each after the row it names (or at the end). */
        private fun withCentralRows(catalogs: List<CatalogConfig>, rows: List<CentralRow>): List<CatalogConfig> {
            val result = catalogs.toMutableList()
            for (row in rows) {
                if (result.any { it.id == row.catalogId }) continue
                val catalog = centralRowCatalog(row) ?: continue
                val anchor = result.indexOfFirst { it.id == row.after || it.id == CENTRAL_ROW_PREFIX + row.after.replace('-', '_') }
                if (row.after.isNotBlank() && anchor >= 0) result.add(anchor + 1, catalog) else result.add(catalog)
            }
            return result
        }

        /** The catalog of a central row; null when a Trakt link cannot be read (the parser already vetted the URL). */
        internal fun centralRowCatalog(row: CentralRow): CatalogConfig? = when (row.source) {
            CentralRowSource.MDBLIST -> CatalogConfig(
                id = row.catalogId,
                title = row.title,
                sourceType = CatalogSourceType.MDBLIST,
                sourceUrl = row.url,
                sourceRef = "mdblist:${row.url}",
                isPreinstalled = true
            )
            CentralRowSource.TRAKT -> {
                // Same references the app stores for a Trakt list a user adds himself.
                val sourceRef = when (val parsed = CatalogUrlParser.parseTrakt(row.url)) {
                    is ParsedCatalogUrl.TraktUserList -> "trakt_user:${parsed.username}:${parsed.listId}"
                    is ParsedCatalogUrl.TraktList -> "trakt_list:${parsed.listId}"
                    else -> null
                }
                sourceRef?.let {
                    CatalogConfig(
                        id = row.catalogId,
                        title = row.title,
                        sourceType = CatalogSourceType.TRAKT,
                        sourceUrl = row.url,
                        sourceRef = it,
                        isPreinstalled = true
                    )
                }
            }
        }

        /** One bundled catalog with the central tab lists and overrides applied. */
        internal fun applyToBundled(catalog: CatalogConfig, config: CentralCatalogConfig): CatalogConfig {
            val lists = config.franchises.firstOrNull { it.builtin && it.catalogId == catalog.id }?.tabs
            val withTabs = if (lists != null) catalog.copy(collectionSources = withLists(catalog.collectionSources, lists)) else catalog
            return applyCentralOverrides(withTabs, config.overrides)
        }

        private fun franchiseCatalog(franchise: RemoteFranchise): CatalogConfig {
            val sources = buildList {
                if (franchise.tabs.movie.isNotEmpty()) add(franchiseListCuratedSource(franchise.tabs.movie, TAB_MOVIE))
                if (franchise.tabs.series.isNotEmpty()) add(franchiseListCuratedSource(franchise.tabs.series, TAB_SERIES))
                if (franchise.tabs.timeline.isNotEmpty()) add(franchiseListCuratedSource(franchise.tabs.timeline, TAB_TIMELINE))
                franchise.tmdbCollections.forEach {
                    add(CollectionSourceConfig(kind = CollectionSourceKind.TMDB_COLLECTION, tmdbCollectionId = it))
                }
                franchise.mdblist.forEach {
                    add(CollectionSourceConfig(kind = CollectionSourceKind.MDBLIST_PUBLIC, mdblistSlug = it))
                }
            }
            return CatalogConfig(
                id = franchise.catalogId,
                title = franchise.title,
                sourceType = CatalogSourceType.PREINSTALLED,
                isPreinstalled = true,
                kind = CatalogKind.COLLECTION,
                collectionGroup = CollectionGroupKind.FRANCHISE,
                collectionCoverImageUrl = franchise.coverUrl,
                collectionFocusGifUrl = franchise.coverUrl,
                collectionHeroImageUrl = franchise.coverUrl,
                collectionHeroGifUrl = franchise.coverUrl,
                collectionTileShape = CollectionTileShape.LANDSCAPE,
                collectionHideTitle = franchise.coverUrl != null,
                collectionSources = sources
            )
        }

        /**
         * Swaps the curated source of each tab for [lists]; an emptied tab disappears. Only sources that
         * carry a tab are touched: the admin's added titles are curated sources without one and stay.
         */
        internal fun withLists(sources: List<CollectionSourceConfig>, lists: FranchiseListTabs): List<CollectionSourceConfig> {
            val byTab = mapOf(TAB_MOVIE to lists.movie, TAB_SERIES to lists.series, TAB_TIMELINE to lists.timeline)
            return sources.mapNotNull { source ->
                val tab = source.collectionTab
                if (source.kind == CollectionSourceKind.CURATED_IDS && tab in franchiseTabs) {
                    byTab.getValue(tab!!).takeIf { it.isNotEmpty() }?.let { franchiseListCuratedSource(it, tab) }
                } else source
            }
        }
    }
}
