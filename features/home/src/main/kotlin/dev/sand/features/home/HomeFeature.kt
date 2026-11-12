package dev.sand.features.home

import dev.sand.bank.api.BankState
import dev.sand.bank.api.baht
import dev.sand.dune.Feature
import dev.sand.dune.Slot
import dev.sand.dune.entrypoint

/** Owns the home screen. Other features add to it through slots. */
class HomeFeature : Feature {
    override val id = "home"

    override fun entrypoints() = listOf(
        entrypoint("home", Slot.SCREEN) { ctx ->
            "Sand Bank · Home\nHi, Somchai\nBalance: ${baht(ctx.client.read(BankState.Balance))}"
        },
        entrypoint("home", Slot.ACTIONS) { "Transfer · Pay · Top up" },
    )
}
