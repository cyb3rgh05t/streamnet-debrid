package com.arflix.tv.shrinker

import com.google.common.truth.Truth.assertThat
import java.io.File
import org.junit.Test

/**
 * Release builds run R8 and the JVM tests do not, so a missing keep rule only shows up on a device.
 * 2.6.000 shipped without a rule for the generic XtreamDiskCache<T>: R8 dropped its type parameter,
 * Gson threw "requires 0 type arguments, but got 1" and the IPTV VOD library never loaded.
 *
 * These tests read the sources and proguard-rules.pro directly and fail when that class of mistake
 * is reintroduced.
 */
class R8KeepRulesGuardTest {

    private val moduleDir: File = listOf(File("."), File("app")).first { File(it, "proguard-rules.pro").exists() }
    private val sourceFiles: List<File> = File(moduleDir, "src")
        .listFiles { f -> f.isDirectory && f.name != "test" && f.name != "androidTest" && f.name != "testPlay" }
        .orEmpty()
        .flatMap { dir -> dir.walkTopDown().filter { it.isFile && it.extension == "kt" }.toList() }
    private val sourceTexts: List<String> = sourceFiles.map { it.readText() }
    private val rules: List<String> = File(moduleDir, "proguard-rules.pro").readLines()
        .map { it.trim() }
        .filter { it.startsWith("-keep") }

    private val genericClassRegex = Regex("""\bclass\s+(\w+)\s*<""")
    private val parameterizedRegex = Regex("""getParameterized\(\s*([\w.]+)::class\.java""")
    private val typeTokenRegex = Regex("""TypeToken<\s*([\w.]+)\s*<""")

    private fun String.simpleName(): String = substringAfterLast('.')

    /** Generic classes declared in the app, by simple name. */
    private fun appGenericClasses(): Set<String> =
        sourceTexts.flatMap { text -> genericClassRegex.findAll(text).map { it.groupValues[1] }.toList() }.toSet()

    /** Raw classes Gson is asked to parameterize, by simple name. */
    private fun gsonParameterizedRawTypes(): Set<String> =
        sourceTexts.flatMap { text ->
            parameterizedRegex.findAll(text).map { it.groupValues[1].simpleName() }.toList() +
                typeTokenRegex.findAll(text).map { it.groupValues[1].simpleName() }.toList()
        }.toSet()

    @Test
    fun `sources and rules are found`() {
        assertThat(sourceFiles).isNotEmpty()
        assertThat(rules).isNotEmpty()
    }

    @Test
    fun `app generic classes that Gson parameterizes have a keep rule`() {
        val needKeep = appGenericClasses().intersect(gsonParameterizedRawTypes())

        // The scan must still see the class that broke 2.6.000, or the regexes have gone stale.
        assertThat(needKeep).contains("XtreamDiskCache")

        val missing = needKeep.filter { name -> rules.none { rule -> rule.contains(name) } }
        assertThat(missing).isEmpty()
    }

    @Test
    fun `the XtreamDiskCache rule keeps the type parameter and its fields`() {
        val rule = rules.firstOrNull { it.contains("XtreamDiskCache") }
        assertThat(rule).isNotNull()
        // allowobfuscation without allowshrinking keeps the class and its generic signature.
        assertThat(rule).doesNotContain("allowshrinking")
        assertThat(rule).contains("<fields>")
    }

    @Test
    fun `no blanket keep for the whole app package is reintroduced`() {
        // Such a rule disabled shrinking and optimisation for all app code (DEX 49.6 MB vs 27 MB).
        val blanket = rules.filter { rule ->
            rule.contains("com.arflix.tv.**") && rule.startsWith("-keep ") && rule.contains("{ *; }")
        }
        assertThat(blanket).isEmpty()
        assertThat(rules.none { it.contains("androidx.compose.**") && it.startsWith("-keep ") }).isTrue()
    }
}
