package dev.sand.features.fraudbanner

import dev.sand.bank.api.BankHost
import dev.sand.bank.api.BankState
import dev.sand.dune.Feature
import dev.sand.dune.Slot
import dev.sand.dune.entrypoint

/**
 * Prompt P1: "Add a fraud-alert banner to the transfer screen."
 * Everything for it lives in this folder. No shared file was edited.
 */
class FraudBannerFeature : Feature {
    override val id = "fraud-banner"

    override fun entrypoints() = listOf(
        entrypoint("transfer", Slot.BANNER) { ctx ->
            val draft = ctx.client.read(BankState.DraftTransfer) ?: return@entrypoint null
            val score = ctx.host<BankHost>().fraudScore(draft.to, draft.amount)
            if (score >= 70) "⚠ Check the recipient. This transfer looks unusual for your account." else null
        },
    )
}
