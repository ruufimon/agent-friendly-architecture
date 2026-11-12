package dev.sand.bank.api

import dev.sand.dune.StateKey

/** Durable state features may read. Only the app's BankClient writes it (rule 3). */
object BankState {
    val Balance = StateKey("balance", 52_300L)
    val DraftTransfer = StateKey<Transfer?>("draftTransfer", Transfer(to = "Somsri K. ••7730", amount = 25_000L))
}
