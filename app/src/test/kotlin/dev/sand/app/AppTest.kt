package dev.sand.app

import dev.sand.bank.api.BankState
import dev.sand.dune.Context
import dev.sand.dune.DuneApp
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class AppTest {
    private val host = FakeBankHost()
    private val client = BankClient(host)
    private val app = DuneApp.discover(Context(client, listOf(host)))

    @Test
    fun `features are discovered from their folders`() {
        assertEquals(listOf("home", "transfer"), app.screens())
    }

    @Test
    fun `fraud banner and loan offer appear on their screens`() {
        assertTrue("⚠" in app.render("transfer"))
        assertTrue("Personal loan offer" in app.render("home"))
    }

    @Test
    fun `only the client changes the balance`() {
        client.send(client.read(BankState.DraftTransfer)!!)
        assertEquals(27_300L, client.read(BankState.Balance))
        assertFalse("⚠" in app.render("transfer"))
        assertFalse("Personal loan offer" in app.render("home"))
    }
}
