package dev.sand.host

import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.Application
import io.ktor.server.application.ApplicationCall
import io.ktor.server.application.install
import io.ktor.server.plugins.BadRequestException
import io.ktor.server.plugins.ContentTransformationException
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.plugins.statuspages.StatusPages
import io.ktor.server.request.header
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.response.respondText
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.Json

val ApiJson = Json { explicitNulls = false }

/** Implements bank-api/openapi.yaml. Base path: /host/v1 */
fun Application.hostModule(ledger: BankLedger = BankLedger()) {
    install(ContentNegotiation) { json(ApiJson) }
    install(StatusPages) {
        exception<ApiProblem> { call, e -> call.respondProblem(e.problem) }
        exception<BadRequestException> { call, _ -> call.respondProblem(malformedBody()) }
        exception<ContentTransformationException> { call, _ -> call.respondProblem(malformedBody()) }
        exception<SerializationException> { call, _ -> call.respondProblem(malformedBody()) }
    }

    routing {
        route("/host/v1") {
            // operationId: fraudScore
            post("/fraud-score") {
                call.requireBearer()
                val request = call.receive<FraudScoreRequest>()
                requireRecipient(request.to)
                requireAmount(request.amount)
                call.respond(ledger.fraudScore(request))
            }

            // operationId: loanEligibility
            get("/loan-eligibility") {
                call.requireBearer()
                call.respond(ledger.loanEligibility())
            }

            // operationId: createTransfer
            post("/transfers") {
                call.requireBearer()
                val key = call.requireIdempotencyKey()
                val request = call.receive<TransferRequest>()
                requireRecipient(request.to)
                requireAmount(request.amount)
                call.respond(HttpStatusCode.Created, ledger.transfer(key, request))
            }
        }
    }
}

private fun malformedBody() = Problems.invalidRequest(
    "The request body is not valid JSON for this endpoint.",
    "Send the fields listed for this operation in bank-api/openapi.yaml.",
)

private fun requireAmount(amount: Long) {
    if (amount < 1) {
        throw ApiProblem(
            Problems.invalidRequest("amount must be a whole number of baht, 1 or more.", "Send amount as an integer number of baht."),
        )
    }
}

private fun requireRecipient(to: String) {
    if (to.isBlank()) throw ApiProblem(Problems.invalidRequest("to must not be empty.", "Send the masked recipient shown on screen."))
}

/** Demo only: accepts any non-empty bearer token. Replace with JWT validation before real use. */
private fun ApplicationCall.requireBearer() {
    val token = request.header(HttpHeaders.Authorization)?.takeIf { it.startsWith("Bearer ") }?.removePrefix("Bearer ")
    if (token.isNullOrBlank()) throw ApiProblem(Problems.unauthorized())
}

private fun ApplicationCall.requireIdempotencyKey(): String {
    val key = request.header("Idempotency-Key")
    if (key == null || key.length !in 8..64) {
        throw ApiProblem(
            Problems.invalidRequest(
                "The Idempotency-Key header is required and must be 8 to 64 characters.",
                "Generate a new key (for example a UUID) for each new transfer, and reuse it only to retry.",
            ),
        )
    }
    return key
}

suspend fun ApplicationCall.respondProblem(problem: Problem) =
    respondText(
        ApiJson.encodeToString(Problem.serializer(), problem),
        ContentType("application", "problem+json"),
        HttpStatusCode.fromValue(problem.status),
    )
