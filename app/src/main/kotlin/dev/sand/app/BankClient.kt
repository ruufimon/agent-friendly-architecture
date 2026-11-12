package dev.sand.app

import dev.sand.bank.api.BankHost
import dev.sand.bank.api.BankState
import dev.sand.bank.api.Transfer
import dev.sand.dune.Command
import dev.sand.dune.StateOwner

/**
 * Rule 3: the one writer of durable bank state on the client.
 * The balance it stores always comes from the host, the source of truth.
 * Adding a command here is an architecture change (rule 5): say so in the PR.
 */
class BankClient(private val host: BankHost) : StateOwner() {
    override fun handle(command: Command): Boolean = when (command) {
        is Transfer -> {
            val newBalance = host.transfer(command.to, command.amount)
            write(BankState.Balance, newBalance)
            write(BankState.DraftTransfer, null)
            true
        }
        else -> false
    }
}
