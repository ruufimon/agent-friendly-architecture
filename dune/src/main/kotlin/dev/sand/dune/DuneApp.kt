package dev.sand.dune

import java.util.ServiceLoader

/** Assembles discovered features into screens. */
class DuneApp(features: List<Feature>, private val ctx: Context) {

    private val contributions: List<Pair<String, Entrypoint>>

    init {
        val duplicateIds = features.groupBy { it.id }.filterValues { it.size > 1 }.keys
        if (duplicateIds.isNotEmpty()) {
            throw DuneError(
                "Feature id used twice: ${duplicateIds.joinToString()}.",
                "Each feature owns one folder. Use your folder name under features/ as the id.",
            )
        }

        contributions = features.flatMap { feature -> feature.entrypoints().map { feature.id to it } }

        val screenOwners = contributions
            .filter { (_, e) -> e.slot == Slot.SCREEN }
            .groupBy({ (_, e) -> e.screen }, { (id, _) -> id })

        screenOwners.filterValues { it.size > 1 }.forEach { (screen, owners) ->
            throw DuneError(
                "Screen '$screen' is provided by ${owners.joinToString(" and ")}.",
                "A screen has one owner. To add to '$screen', return an entrypoint with " +
                    "Slot.BANNER, Slot.BODY or Slot.ACTIONS from your own feature.",
            )
        }

        contributions
            .filter { (_, e) -> e.slot != Slot.SCREEN && e.screen !in screenOwners }
            .forEach { (id, e) ->
                throw DuneError(
                    "Feature '$id' adds to screen '${e.screen}', which no feature provides.",
                    "Existing screens: ${screenOwners.keys.sorted().joinToString()}. " +
                        "Use one of them, or create a new feature that owns the screen.",
                )
            }
    }

    fun screens(): List<String> =
        contributions.filter { (_, e) -> e.slot == Slot.SCREEN }.map { (_, e) -> e.screen }.sorted()

    fun render(screen: String): String {
        val onScreen = contributions.map { it.second }.filter { it.screen == screen }
        if (onScreen.none { it.slot == Slot.SCREEN }) {
            throw DuneError("No screen called '$screen'.", "Existing screens: ${screens().joinToString()}.")
        }
        return Slot.entries
            .flatMap { slot -> onScreen.filter { it.slot == slot } }
            .mapNotNull { it.render(ctx) }
            .joinToString("\n")
    }

    companion object {
        /** Features are discovered from reserved files (META-INF/services), never from a shared list. */
        fun discover(ctx: Context): DuneApp =
            DuneApp(ServiceLoader.load(Feature::class.java).toList(), ctx)
    }
}
