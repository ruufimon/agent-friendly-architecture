import { Injectable, inject, signal } from '@angular/core';
import { BankHost } from './bank-host';
import { TransferResult } from './models';

export interface TransferDraft {
  to: string;
  amount: number;
  /** Reused on retries so money is never sent twice. */
  idempotencyKey: string;
}

/** Commands features may send. Only BankClient acts on them. */
export type BankCommand =
  | { kind: 'editDraft'; to: string; amount: number }
  | { kind: 'confirmTransfer' };

/**
 * Rule 3: the one writer of bank state in the browser.
 * Features read the signals and send commands; there is no other way to change state.
 * Adding a command is an architecture change (rule 5).
 */
@Injectable({ providedIn: 'root' })
export class BankClient {
  private readonly host = inject(BankHost);

  // The spec has no balance endpoint yet, so this starts at the demo server's opening balance.
  private readonly balanceState = signal(52_300);
  private readonly draftState = signal<TransferDraft | null>(newDraft('Somsri K. ••7730', 25_000));
  private readonly lastTransferState = signal<TransferResult | null>(null);

  readonly balance = this.balanceState.asReadonly();
  readonly draft = this.draftState.asReadonly();
  readonly lastTransfer = this.lastTransferState.asReadonly();

  async send(command: BankCommand): Promise<void> {
    switch (command.kind) {
      case 'editDraft':
        this.draftState.set(newDraft(command.to, command.amount));
        return;
      case 'confirmTransfer': {
        const draft = this.draftState();
        if (!draft) return;
        const result = await this.host.transfer({ to: draft.to, amount: draft.amount }, draft.idempotencyKey);
        this.balanceState.set(result.newBalance); // the server is the source of truth
        this.lastTransferState.set(result);
        this.draftState.set(null);
        return;
      }
    }
  }
}

function newDraft(to: string, amount: number): TransferDraft {
  return { to, amount, idempotencyKey: crypto.randomUUID() };
}
