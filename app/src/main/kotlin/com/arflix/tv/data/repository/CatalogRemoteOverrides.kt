package com.arflix.tv.data.repository

import com.arflix.tv.data.model.CatalogConfig
import com.arflix.tv.data.model.CatalogSourceType
import com.arflix.tv.data.model.CollectionGroupKind
import com.arflix.tv.data.model.CollectionSourceConfig
import com.arflix.tv.data.model.CollectionSourceKind
import com.arflix.tv.data.model.RemoteAddonOverride
import java.net.URI

private val MdblistSlugRegex = Regex("^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")

/** MDBList list URL as the admin writes it: https://mdblist.com/lists/{user}/{list}. */
internal fun isValidRemoteMdblistUrl(url: String?): Boolean {
    val value = url?.trim().orEmpty()
    if (value.isEmpty()) return false
    val uri = runCatching { URI(value) }.getOrNull() ?: return false
    val host = uri.host?.lowercase() ?: return false
    if (uri.scheme?.lowercase() != "https" || uri.userInfo != null) return false
    if (host != "mdblist.com" && !host.endsWith(".mdblist.com")) return false
    val parts = uri.path.orEmpty().split('/').filter { it.isNotBlank() }
    return parts.size == 3 && parts[0] == "lists"
}

/**
 * Applies the admin overrides of a stored catalog to its bundled definition. The bundled catalog
 * stays the source of truth for everything except the title, the enabled flag, the list URL of an
 * MDBList home row and the MDBList slugs of collection sources; anything else, and anything
 * malformed, falls back to the bundled value.
 */
internal fun applyRemoteCatalogOverrides(bundled: CatalogConfig, stored: CatalogConfig): CatalogConfig {
    // Added titles come from an admin-written field and are validated, so they do not need the
    // remoteManaged flag (which would also freeze the catalog's title and visibility).
    val withExtras = appendRemoteExtraRefs(bundled, stored.remoteExtraRefs)
    if (!stored.remoteManaged) {
        return withExtras.copy(
            remoteSourceUrl = stored.remoteSourceUrl,
            remoteSlugOverrides = stored.remoteSlugOverrides,
            remoteExtraRefs = stored.remoteExtraRefs,
            remoteAddonOverrides = stored.remoteAddonOverrides,
        )
    }
    val remoteUrl = stored.remoteSourceUrl?.trim()
        ?.takeIf { bundled.sourceType == CatalogSourceType.MDBLIST && isValidRemoteMdblistUrl(it) }
    return withExtras.copy(
        sourceUrl = remoteUrl ?: bundled.sourceUrl,
        sourceRef = if (remoteUrl != null) "mdblist:$remoteUrl" else bundled.sourceRef,
        collectionSources = overrideAddonSources(
            overrideMdblistSlugs(withExtras.collectionSources, stored.remoteSlugOverrides),
            stored.remoteAddonOverrides,
        ),
        remoteSourceUrl = stored.remoteSourceUrl,
        remoteSlugOverrides = stored.remoteSlugOverrides,
        remoteExtraRefs = stored.remoteExtraRefs,
        remoteAddonOverrides = stored.remoteAddonOverrides,
    )
}

private val AddonTokenRegex = Regex("^[A-Za-z0-9_.:-]{1,100}$")
private val AddonTypeRegex = Regex("^[a-z]{1,20}$")

internal fun addonOverrideKey(type: String?, catalogId: String?): String = "${type.orEmpty()}|${catalogId.orEmpty()}"

/** Replaces addon catalog sources by the admin's mapping (bundled "type|catalogId" -> new addon target). */
private fun overrideAddonSources(
    bundled: List<CollectionSourceConfig>,
    overrides: Map<String, RemoteAddonOverride>?,
): List<CollectionSourceConfig> {
    if (overrides.isNullOrEmpty()) return bundled
    return bundled.map { source ->
        if (source.kind != CollectionSourceKind.ADDON_CATALOG) return@map source
        val replacement = overrides[addonOverrideKey(source.addonCatalogType, source.addonCatalogId)]
            ?: return@map source
        val catalogId = replacement.addonCatalogId?.trim()?.takeIf(AddonTokenRegex::matches)
            ?: return@map source
        val type = replacement.addonCatalogType?.trim()?.takeIf(AddonTypeRegex::matches)
            ?: source.addonCatalogType
        val addonId = replacement.addonId?.trim()?.takeIf(AddonTokenRegex::matches) ?: source.addonId
        val manifestUrl = replacement.addonManifestUrl?.trim()?.takeIf(::isValidRemoteManifestUrl)
            ?: source.addonManifestUrl
        source.copy(
            addonId = addonId,
            addonManifestUrl = manifestUrl,
            addonCatalogType = type,
            addonCatalogId = catalogId,
        )
    }
}

/** Addon manifests are fetched from the URL, so only plain https links without credentials qualify. */
internal fun isValidRemoteManifestUrl(url: String?): Boolean {
    val value = url?.trim().orEmpty()
    if (value.isEmpty() || value.length > 500) return false
    val uri = runCatching { URI(value) }.getOrNull() ?: return false
    return uri.scheme?.lowercase() == "https" && uri.userInfo == null && !uri.host.isNullOrBlank() &&
        uri.path.orEmpty().endsWith("manifest.json")
}

private val TmdbRefRegex = Regex("^(movie|tv):[0-9]{1,9}$")
private const val MaxRemoteExtraRefs = 30

/** Franchise collections get the admin's TMDB titles as one more curated source. */
private fun appendRemoteExtraRefs(bundled: CatalogConfig, refs: List<String>?): CatalogConfig {
    if (bundled.collectionGroup != CollectionGroupKind.FRANCHISE) return bundled
    val valid = refs.orEmpty().map { it.trim().lowercase() }
        .filter(TmdbRefRegex::matches).distinct().take(MaxRemoteExtraRefs)
    if (valid.isEmpty()) return bundled
    return bundled.copy(
        collectionSources = bundled.collectionSources +
            CollectionSourceConfig(kind = CollectionSourceKind.CURATED_IDS, curatedRefs = valid)
    )
}

/** Replaces MDBList slugs by the admin's mapping (bundled slug -> new slug), independent of source order. */
private fun overrideMdblistSlugs(
    bundled: List<CollectionSourceConfig>,
    overrides: Map<String, String>?,
): List<CollectionSourceConfig> {
    if (overrides.isNullOrEmpty()) return bundled
    return bundled.map { source ->
        val replacement = overrides[source.mdblistSlug]?.trim()
        if (source.kind == CollectionSourceKind.MDBLIST_PUBLIC &&
            replacement != null && MdblistSlugRegex.matches(replacement)
        ) {
            source.copy(mdblistSlug = replacement)
        } else {
            source
        }
    }
}
