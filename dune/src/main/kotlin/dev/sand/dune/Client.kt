package dev.sand.dune

import kotlin.collections.mutableMapOf

/** A request to change durable state. Only the state owner acts on it. */
interface Command

/** A named piece of durable state with a starting value. */
class StateKey<T>(val name: String, val initial: T) {
    override fun toString() = "StateKey($name)"
}

/**
 * What features see: read state, send commands. There is no write method here.
 */
interface Client {
    fun <T> read(key: StateKey<T>): T
    fun send(command: Command)
}

/**
 * Rule 3: every durable value has one obvious writer.
 * The app extends this exactly once. Features only ever receive a [Client].
 */
abstract class StateOwner : Client {
    private val state = mutableMapOf<StateKey<*>, Any?>()

    @Suppress("UNCHECKED_CAST")
    final override fun <T> read(key: StateKey<T>): T =
        if (state.containsKey(key)) state[key] as T else key.initial

    protected fun <T> write(key: StateKey<T>, value: T) {
        state[key] = value
    }

    final override fun send(command: Command) {
        if (!handle(command)) {
            throw DuneError(
                "No handler for command ${command::class.simpleName}.",
                "Commands are handled only by the app's StateOwner, the one writer. " +
                    "Adding a handler is an architecture change (AGENTS.md, rule 5).",
            )
        }
    }

    /** Return true if the command was handled. */
    protected abstract fun handle(command: Command): Boolean
}
