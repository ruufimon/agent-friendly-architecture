import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BankClient } from '../../bank/bank-client';
import { baht } from '../../bank/money';
import { SlotOutlet } from '../../dune/slot-outlet';

/** Owns the home screen. Other features add to it through the banner and body slots. */
@Component({
  selector: 'home-screen',
  imports: [RouterLink, SlotOutlet],
  template: `
    <h1 class="screen-title">Sand Bank · Home</h1>

    <section class="balance-card" aria-label="Balance">
      <p class="muted-on-blue">Hi, Somchai</p>
      <p class="balance">{{ baht(client.balance()) }}</p>
      <p class="muted-on-blue">Savings ••4821</p>
    </section>

    @if (client.lastTransfer(); as sent) {
      <p class="notice" role="status">Sent · new balance {{ baht(sent.newBalance) }} · {{ sent.transferId }}</p>
    }

    <nav class="quick-actions" aria-label="Quick actions">
      <a routerLink="/transfer">Transfer</a>
      <span aria-disabled="true">Pay</span>
      <span aria-disabled="true">Top up</span>
    </nav>

    <dune-slot screen="home" slot="banner" />
    <dune-slot screen="home" slot="body" />

    <section class="recent" aria-label="Recent transactions">
      <p class="label">Recent</p>
      <p class="row"><span>7-Eleven</span><span>−฿85</span></p>
      <p class="row"><span>Salary</span><span>+฿45,000</span></p>
    </section>

    <dune-slot screen="home" slot="actions" />
  `,
})
export class HomeScreen {
  protected readonly client = inject(BankClient);
  protected readonly baht = baht;
}
