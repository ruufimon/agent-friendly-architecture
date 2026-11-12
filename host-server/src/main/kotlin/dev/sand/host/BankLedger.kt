package dev.sand.host

/**
 * In-memory stand-in for the core banking system, for one demo customer.
 * The server owns the balance; clients never send it (rule 3).
 */
class BankLedger(startingBalance: Long = 52_300L) {
    private var balance = startingBalance
    private val knownRecipients = setOf<String>()
    private val transfersByKey = mutableMapOf<String, Pair<TransferRequest, TransferResult>>()
    private var nextTransferNumber = 1

    @Synchronized
    fun fraudScore(request: FraudScoreRequest): FraudScore {
        val reasons = buildList {
            if (request.amount >= 20_000L) add(FraudReason.AMOUNT_UNUSUAL_FOR_ACCOUNT)
            if (request.to !in knownRecipients) add(FraudReason.NEW_RECIPIENT)
        }
        var score = 10
        if (FraudReason.AMOUNT_UNUSUAL_FOR_ACCOUNT in reasons) score += 60
        if (FraudReason.NEW_RECIPIENT in reasons) score += 15
        score = score.coerceAtMost(100)
        val level = when {
            score >= 70 -> RiskLevel.HIGH
            score >= 40 -> RiskLevel.MEDIUM
            else -> RiskLevel.LOW
        }
        return FraudScore(score, level, reasons)
    }

    @Synchronized
    fun loanEligibility(): LoanEligibility =
        if (balance >= 30_000L) LoanEligibility(eligible = true, productId = "personal-loan-standard")
        else LoanEligibility(eligible = false)

    @Synchronized
    fun transfer(idempotencyKey: String, request: TransferRequest): TransferResult {
        transfersByKey[idempotencyKey]?.let { (previous, result) ->
            if (previous == request) return result
            throw ApiProblem(Problems.idempotencyConflict())
        }
        if (request.amount > balance) throw ApiProblem(Problems.insufficientFunds(request.amount, balance))

        balance -= request.amount
        val result = TransferResult(
            transferId = "trf_%06d".format(nextTransferNumber++),
            status = TransferStatus.COMPLETED,
            newBalance = balance,
        )
        transfersByKey[idempotencyKey] = request to result
        return result
    }
}
