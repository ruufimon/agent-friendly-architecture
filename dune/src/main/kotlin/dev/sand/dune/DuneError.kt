package dev.sand.dune

/** Every refusal says what went wrong and names the supported path. */
class DuneError(problem: String, supportedPath: String) :
    IllegalStateException("✗ $problem\n  → $supportedPath")
