package dev.sand.features.loanoffer

import dev.sand.bank.api.BankHost
import dev.sand.dune.Feature
import dev.sand.dune.Slot
import dev.sand.dune.entrypoint

/**
 * Prompt P2: "Show a personal loan offer on the home screen."
 * Lives in its own folder, so it never collides with fraud-banner.
 */
class LoanOfferFeature : Feature {
    override val id = "loan-offer"

    override fun entrypoints() = listOf(
        entrypoint("home", Slot.BODY) { ctx ->
            if (ctx.host<BankHost>().isEligibleForLoan()) "Personal loan offer → [ View offer ]" else null
        },
    )
}
