package dev.sand.host

import kotlinx.serialization.Serializable

// Shapes from bank-api/openapi.yaml (components/schemas). Keep them in step with the spec.

@Serializable
data class FraudScoreRequest(val to: String, val amount: Long)

@Serializable
enum class RiskLevel { LOW, MEDIUM, HIGH }

@Serializable
enum class FraudReason { AMOUNT_UNUSUAL_FOR_ACCOUNT, NEW_RECIPIENT, UNUSUAL_TIME, UNUSUAL_DEVICE }

@Serializable
data class FraudScore(val score: Int, val level: RiskLevel, val reasons: List<FraudReason> = emptyList())

@Serializable
data class LoanEligibility(val eligible: Boolean, val productId: String? = null)

@Serializable
data class TransferRequest(val to: String, val amount: Long)

@Serializable
enum class TransferStatus { COMPLETED, PENDING_REVIEW }

@Serializable
data class TransferResult(val transferId: String, val status: TransferStatus, val newBalance: Long)

/** RFC 9457 Problem Details plus supportedPath: every refusal says what to do instead (rule 2). */
@Serializable
data class Problem(
    val type: String,
    val title: String,
    val status: Int,
    val detail: String? = null,
    val supportedPath: String,
)
