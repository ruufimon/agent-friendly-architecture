// Shapes from bank-api/openapi.yaml in the Kotlin project. Keep them in step with the spec.

export interface FraudScoreRequest {
  to: string;
  amount: number;
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface FraudScore {
  score: number;
  level: RiskLevel;
  reasons?: string[];
}

export interface LoanEligibility {
  eligible: boolean;
  productId?: string;
}

export interface TransferRequest {
  to: string;
  amount: number;
}

export interface TransferResult {
  transferId: string;
  status: 'COMPLETED' | 'PENDING_REVIEW';
  newBalance: number;
}

/** RFC 9457 Problem Details plus supportedPath (rule 2). */
export interface Problem {
  type: string;
  title: string;
  status: number;
  detail?: string;
  supportedPath: string;
}
