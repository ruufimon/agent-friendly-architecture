package dev.sand.host

/** Thrown anywhere in a route; StatusPages turns it into application/problem+json. */
class ApiProblem(val problem: Problem) : RuntimeException(problem.title)

object Problems {
    private const val BASE = "https://api.sandbank.example/problems/"

    fun invalidRequest(detail: String, supportedPath: String = "Check the request against bank-api/openapi.yaml.") =
        Problem(BASE + "invalid-request", "Invalid request", 400, detail, supportedPath)

    fun unauthorized() =
        Problem(BASE + "unauthorized", "Not signed in", 401, supportedPath = "Sign in again and retry with a fresh bearer token.")

    fun idempotencyConflict() =
        Problem(
            BASE + "idempotency-conflict", "Idempotency key reused", 409,
            "This key was already used for a different transfer.",
            "Generate a new Idempotency-Key for each new transfer. Reuse a key only to retry the same request.",
        )

    fun insufficientFunds(amount: Long, balance: Long) =
        Problem(
            BASE + "insufficient-funds", "Insufficient funds", 422,
            "Amount %,d is more than the balance of %,d.".format(amount, balance),
            "Lower the amount or choose another source account.",
        )
}
