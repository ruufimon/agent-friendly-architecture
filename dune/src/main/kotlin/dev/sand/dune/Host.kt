package dev.sand.dune

/**
 * Marker for a typed contract to server behavior.
 * The app wires the implementation; features ask for it with `ctx.host<YourHost>()`.
 */
interface Host
