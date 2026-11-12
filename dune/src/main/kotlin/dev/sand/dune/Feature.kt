package dev.sand.dune

/**
 * A Feature owns one folder under `features/`.
 *
 * It is discovered from a reserved file, never from a shared list:
 * `src/main/resources/META-INF/services/dev.sand.dune.Feature`
 * contains the fully qualified class name of the feature.
 */
interface Feature {
    /** Same as the folder name, e.g. "fraud-banner". */
    val id: String

    fun entrypoints(): List<Entrypoint>
}
