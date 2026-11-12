package dev.sand.bank.api

import dev.sand.dune.Host

/**
 * The one typed contract to server behavior. Its HTTP form is bank-api/openapi.yaml,
 * served by :host-server. Changing either is an architecture change (rule 5).
 */
interface BankHost : Host {
    /** POST /fraud-score → score (0–100). */
    fun fraudScore(to: String, amount: Long): Int

    /** GET /loan-eligibility → eligible. The server reads the balance itself (rule 3). */
    fun isEligibleForLoan(): Boolean

    /** POST /transfers → newBalance. The server is the source of truth for the balance. */
    fun transfer(to: String, amount: Long): Long
}
