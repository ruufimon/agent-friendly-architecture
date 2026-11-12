import { Component, inject, resource, signal } from '@angular/core';
import { BankClient } from '../../bank/bank-client';
import { BankHost } from '../../bank/bank-host';

/**
 * Prompt P2: "Show a personal loan offer on the home screen."
 * Lives in its own folder, so it never collides with fraud-banner.
 */
@Component({
  selector: 'loan-offer',
  template: `
    @if (eligibility.hasValue() && eligibility.value().eligible) {
      <section class="offer" aria-label="Personal loan offer">
        <p><b>Personal loan offer</b></p>
        <p>You’re eligible for a personal loan.</p>
        @if (open()) {
          <p class="muted">Product: {{ eligibility.value().productId }}</p>
        } @else {
          <button class="link" type="button" (click)="open.set(true)">View offer →</button>
        }
      </section>
    }
  `,
})
export class LoanOffer {
  private readonly client = inject(BankClient);
  private readonly host = inject(BankHost);
  protected readonly open = signal(false);

  // Re-check whenever the balance changes; the server decides eligibility (rule 3).
  protected readonly eligibility = resource({
    params: () => this.client.balance(),
    loader: () => this.host.loanEligibility(),
  });
}
