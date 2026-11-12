import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { FraudScore, FraudScoreRequest, LoanEligibility, Problem, TransferRequest, TransferResult } from './models';

/** A refusal from the server, carrying what to do instead. */
export class HostProblem extends Error {
  constructor(readonly problem: Problem) {
    super(problem.detail ?? problem.title);
    this.name = 'HostProblem';
  }
}

/**
 * The one typed contract to the server: bank-api/openapi.yaml, served by :host-server.
 * Features call this; they never use HttpClient themselves (rule 2).
 */
@Injectable({ providedIn: 'root' })
export class BankHost {
  private readonly http = inject(HttpClient);
  private readonly base = '/host/v1';

  /** operationId: fraudScore */
  fraudScore(request: FraudScoreRequest): Promise<FraudScore> {
    return call(this.http.post<FraudScore>(`${this.base}/fraud-score`, request));
  }

  /** operationId: loanEligibility */
  loanEligibility(): Promise<LoanEligibility> {
    return call(this.http.get<LoanEligibility>(`${this.base}/loan-eligibility`));
  }

  /** operationId: createTransfer. Call only from BankClient. */
  transfer(request: TransferRequest, idempotencyKey: string): Promise<TransferResult> {
    return call(
      this.http.post<TransferResult>(`${this.base}/transfers`, request, {
        headers: { 'Idempotency-Key': idempotencyKey },
      }),
    );
  }
}

async function call<T>(request: Observable<T>): Promise<T> {
  try {
    return await firstValueFrom(request);
  } catch (error) {
    throw toHostProblem(error);
  }
}

function toHostProblem(error: unknown): Error {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as Partial<Problem> | null;
    if (body && typeof body === 'object' && body.supportedPath) {
      return new HostProblem(body as Problem);
    }
    return new HostProblem({
      type: 'about:blank',
      title: error.status === 0 ? 'Server not reachable' : `HTTP ${error.status}`,
      status: error.status,
      detail: error.status === 0 ? 'The Sand Bank host server did not answer.' : error.message,
      supportedPath: 'Start the server with ./gradlew :host-server:run, then try again.',
    });
  }
  return error instanceof Error ? error : new Error(String(error));
}

/** Demo only: the host accepts any non-empty bearer token. Replace with real sign-in. */
export const demoAuthInterceptor: HttpInterceptorFn = (req, next) =>
  next(req.url.startsWith('/host/') ? req.clone({ setHeaders: { Authorization: 'Bearer demo' } }) : req);
