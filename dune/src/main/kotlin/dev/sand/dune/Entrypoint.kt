package dev.sand.dune

/** Where on a screen an entrypoint appears, top to bottom. */
enum class Slot { SCREEN, BANNER, BODY, ACTIONS }

/**
 * How a feature puts something into the app.
 * Exactly one feature owns each screen (Slot.SCREEN); any feature may add to it.
 */
interface Entrypoint {
    val screen: String
    val slot: Slot

    /** Text to show, or null to show nothing right now. */
    fun render(ctx: Context): String?
}

/** The conventional way to write an entrypoint (rule 1: fewer decisions). */
fun entrypoint(screen: String, slot: Slot, content: (Context) -> String?): Entrypoint {
    val onScreen = screen
    val inSlot = slot
    return object : Entrypoint {
        override val screen = onScreen
        override val slot = inSlot
        override fun render(ctx: Context): String? = content(ctx)
    }
}
