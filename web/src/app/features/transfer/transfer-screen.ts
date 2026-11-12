import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { BankClient } from '../../bank/bank-client';
import { HostProblem } from '../../bank/bank-host';
import { Problem } from '../../bank/models';
import { baht } from '../../bank/money';
import { SlotOutlet } from '../../dune/slot-outlet';

/** Owns the transfer screen. Other features add to it through the banner slot. */
@Component({
  selector: 'transfer-screen',
  imports: [SlotOutlet],
  template: `
    <h1 class="screen-title">Sand Bank · Transfer</h1>

    @if (client.draft(); as draft) {
      <div class="field-card">
        <p class="label">From</p>
        <p>Savings ••4821 · {{ baht(client.balance()) }}</p>
      </div>
      <div class="field-card">
        <p class="label">To</p>
        <p>{{ draft.to }}</p>
      </div>
      <label class="amount">
        <span class="label">Amount (฿)</span>
        <input
          type="number"
          min="1"
          step="1"
          inputmode="numeric"
          [value]="draft.amount"
          (change)="setAmount(draft.to, $any($event.target).value)"
        />
      </label>

      <dune-slot screen="transfer" slot="banner" />

      @if (problem(); as p) {
        <div class="problem" role="alert">
          <p><b>{{ p.title }}.</b> {{ p.detail }}</p>
          <p class="supported-path">→ {{ p.supportedPath }}</p>
        </div>
      }

      <button class="primary" type="button" [disabled]="sending()" (click)="confirm()">
        {{ sending() ? 'Sending…' : 'Confirm transfer' }}
      </button>
    } @else {
      <p class="empty">No transfer in progress.</p>
      <button class="primary" type="button" (click)="setAmount('Somsri K. ••7730', 1000)">New transfer</button>
    }

    <dune-slot screen="transfer" slot="actions" />
  `,
})
export class TransferScreen {
  protected readonly client = inject(BankClient);
  private readonly router = inject(Router);
  protected readonly baht = baht;
  protected readonly sending = signal(false);
  protected readonly problem = signal<Problem | null>(null);

  protected setAmount(to: string, value: string | number): void {
    const amount = Math.floor(Number(value));
    this.problem.set(null);
    void this.client.send({ kind: 'editDraft', to, amount });
  }

  protected async confirm(): Promise<void> {
    this.sending.set(true);
    this.problem.set(null);
    try {
      await this.client.send({ kind: 'confirmTransfer' });
      await this.router.navigateByUrl('/home');
    } catch (error) {
      this.problem.set(
        error instanceof HostProblem
          ? error.problem
          : { type: 'about:blank', title: 'Something went wrong', status: 0, detail: String(error), supportedPath: 'Try again.' },
      );
    } finally {
      this.sending.set(false);
    }
  }
}
