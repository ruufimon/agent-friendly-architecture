import { TestBed } from '@angular/core/testing';
import { BankClient } from './bank-client';
import { BankHost } from './bank-host';
import { TransferRequest } from './models';

describe('BankClient', () => {
  const calls: { request: TransferRequest; key: string }[] = [];
  const fakeHost = {
    transfer: async (request: TransferRequest, key: string) => {
      calls.push({ request, key });
      return { transferId: 'trf_000001', status: 'COMPLETED' as const, newBalance: 27_300 };
    },
  };

  beforeEach(() => {
    calls.length = 0;
    TestBed.configureTestingModule({ providers: [{ provide: BankHost, useValue: fakeHost }] });
  });

  it('takes the new balance from the server and clears the draft', async () => {
    const client = TestBed.inject(BankClient);
    await client.send({ kind: 'confirmTransfer' });

    expect(client.balance()).toBe(27_300);
    expect(client.draft()).toBeNull();
    expect(calls[0].request).toEqual({ to: 'Somsri K. ••7730', amount: 25_000 });
  });

  it('gives each new draft its own idempotency key', async () => {
    const client = TestBed.inject(BankClient);
    const first = client.draft()!.idempotencyKey;
    await client.send({ kind: 'editDraft', to: 'Somsri K. ••7730', amount: 100 });
    expect(client.draft()!.idempotencyKey).not.toBe(first);
  });
});
