package dev.sand.dune

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class DuneAppTest {
    private object NoCommands : Command

    private val owner = object : StateOwner() {
        override fun handle(command: Command) = false
    }
    private val ctx = Context(owner, emptyList())

    private fun feature(featureId: String, vararg entries: Entrypoint) = object : Feature {
        override val id = featureId
        override fun entrypoints() = entries.toList()
    }

    @Test
    fun `slots render top to bottom`() {
        val app = DuneApp(
            listOf(
                feature("home", entrypoint("home", Slot.ACTIONS) { "actions" }, entrypoint("home", Slot.SCREEN) { "title" }),
                feature("offer", entrypoint("home", Slot.BODY) { "offer" }),
            ),
            ctx,
        )
        assertEquals("title\noffer\nactions", app.render("home"))
    }

    @Test
    fun `a screen has one owner and the error names the supported path`() {
        val error = assertFailsWith<DuneError> {
            DuneApp(
                listOf(
                    feature("a", entrypoint("home", Slot.SCREEN) { "a" }),
                    feature("b", entrypoint("home", Slot.SCREEN) { "b" }),
                ),
                ctx,
            )
        }
        assertTrue("Slot.BANNER" in error.message.orEmpty())
    }

    @Test
    fun `adding to a missing screen lists the screens that exist`() {
        val error = assertFailsWith<DuneError> {
            DuneApp(
                listOf(
                    feature("home", entrypoint("home", Slot.SCREEN) { "home" }),
                    feature("banner", entrypoint("transfers", Slot.BANNER) { "!" }),
                ),
                ctx,
            )
        }
        assertTrue("Existing screens: home" in error.message.orEmpty())
    }

    @Test
    fun `unknown commands are refused with the supported path`() {
        val error = assertFailsWith<DuneError> { owner.send(NoCommands) }
        assertTrue("rule 5" in error.message.orEmpty())
    }
}
