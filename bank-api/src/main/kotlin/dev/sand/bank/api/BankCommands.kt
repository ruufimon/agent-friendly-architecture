package dev.sand.bank.api

import dev.sand.dune.Command

/** Commands features may send. Handled only by the app's BankClient. */
data class Transfer(val to: String, val amount: Long) : Command
