import { Component, inject, resource } from '@angular/core';
import { BankClient } from '../../bank/bank-client';
import { BankHost } from '../../bank/bank-host';

/**
 * Prompt P1: "Add a fraud-alert banner to the transfer screen."
 * Everything for it lives in this folder. No shared file was edited.
 */
@Component({
  selector: 'fraud-banner',
  template: `
    @if (risk.hasValue() && risk.value().level === 'HIGH') {
      <div class="banner" role="alert">
        <span aria-hidden="true">⚠</span>
        Check the recipient. This transfer looks unusual for your account.
      </div>
    }
  `,
})
export class FraudBanner {
  private readonly client = inject(BankClient);
  private readonly host = inject(BankHost);

  protected readonly risk = resource({
    params: () => {
      const draft = this.client.draft();
      return draft && draft.amount >= 1 ? { to: draft.to, amount: draft.amount } : undefined;
    },
    loader: ({ params }) => this.host.fraudScore(params),
  });
}
