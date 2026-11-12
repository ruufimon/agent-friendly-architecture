package dev.sand.features.transfer

import dev.sand.bank.api.BankState
import dev.sand.bank.api.baht
import dev.sand.dune.Feature
import dev.sand.dune.Slot
import dev.sand.dune.entrypoint

/** Owns the transfer screen. Other features add to it through slots. */
class TransferFeature : Feature {
    override val id = "transfer"

    override fun entrypoints() = listOf(
        entrypoint("transfer", Slot.SCREEN) { ctx ->
            val balance = ctx.client.read(BankState.Balance)
            val draft = ctx.client.read(BankState.DraftTransfer)
            buildString {
                appendLine("Sand Bank · Transfer")
                appendLine("From:   Savings ••4821 (${baht(balance)})")
                if (draft == null) {
                    append("No transfer in progress")
                } else {
                    appendLine("To:     ${draft.to}")
                    append("Amount: ${baht(draft.amount)}")
                }
            }
        },
        entrypoint("transfer", Slot.ACTIONS) { "[ Confirm transfer ]" },
    )
}
