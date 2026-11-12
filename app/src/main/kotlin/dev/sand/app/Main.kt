package dev.sand.app

import dev.sand.bank.api.BankState
import dev.sand.dune.Context
import dev.sand.dune.DuneApp

fun main() {
    val host = FakeBankHost()
    val client = BankClient(host)
    val app = DuneApp.discover(Context(client, listOf(host)))

    app.screens().forEach { screen -> show(screen, app.render(screen)) }

    val draft = client.read(BankState.DraftTransfer) ?: return
    println("Customer taps Confirm…")
    client.send(draft)
    println()

    show("home", app.render("home"))
}

private fun show(screen: String, text: String) {
    println("── $screen ──────────────────────────")
    println(text)
    println()
}
