package dev.sand.dune

/** Everything an entrypoint may use. Nothing else is reachable. */
class Context(val client: Client, val hosts: List<Host>) {
    inline fun <reified H : Host> host(): H =
        hosts.filterIsInstance<H>().singleOrNull() ?: throw DuneError(
            "No ${H::class.simpleName} is wired.",
            "Hosts are provided by :app at startup. Use an existing Host contract; " +
                "a new one is an architecture change (AGENTS.md, rule 5).",
        )
}
