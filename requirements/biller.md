# Mock biller and bill payment

The mock biller is a fake external bill company. The banking API calls it so bill payments
can be shown end to end, including failures.

The code is not in this repo. It lives in the Scala project at `~/Workspace/Scala/scalatra`.

## Where it lives

| Piece | Location |
|---|---|
| Fake biller server | `src/main/scala/com/example/biller/` (`FakeBillerServer`, `FakeBillerServlet`, `FakeBillerStore`) |
| Bill-payment feature in the banking API | `src/main/scala/com/example/billpayment/` (domain, application, ports, infrastructure, http) |
| Container image | `Dockerfile.biller`: a plain JVM image, skipping the GraalVM native build the API uses because it's demo-only |
| Kubernetes | `k8s/base/biller.yaml`: a `biller` Deployment plus a ClusterIP Service on port 8090 |

On the `banking-k8s` cluster it runs once each in the `prod` and `preprod` namespaces. It is
not in the ingress rules, so it has no public URL. Only the banking API reaches it, at
`BILLER_URL=http://biller:8090`.

## Mock biller API (port 8090)

### Endpoints the banking API calls

| Method and path | Purpose |
|---|---|
| `GET /ping` | Health check, returns `pong` |
| `GET /billers/{billerCode}/bills?referenceCode1=…&referenceCode2=…` | Looks up a bill. Returns amount, `paid`/`unpaid` status and scenario |
| `POST /billers/{billerCode}/payments` | Pays a bill. Body: `{paymentId, referenceCode1, referenceCode2, amount, paidAt?}`. Returns `{receiptCode, paidAt}` |

### Admin endpoints for demos and tests

| Method and path | Purpose |
|---|---|
| `GET /admin/bills` | List all bills |
| `PUT /admin/bills` | Create or replace a bill (`scenario`, `latencyMs` and `paid` are optional) |
| `DELETE /admin/bills/{biller}/{ref1}/{ref2}` | Remove a bill |
| `POST /admin/reset` | Restore the starting bills and clear receipts |
| `GET`/`PUT /admin/config` | Read or set a global delay (`latencyMs`) on every request |

### Payment rules

- The amount must match the debt exactly, otherwise it returns 422 `amount_mismatch`.
- A paid bill can't be paid again: 409 `bill_not_payable`.
- Retrying with the same `paymentId` returns the original receipt, so retries are safe.
- The receipt code is `<billerCode>-<paymentId>`.

Other errors: 404 `biller_not_found` or `bill_not_found`, and 400 `invalid_request`.

Data is in memory only. A pod restart (redeploy, crash) resets every bill to unpaid.

## Starting bills and failure scenarios

Every starting bill uses biller `demo-biller` and reference 1 `customer-001`:

| Reference 2 | Amount (THB) | What happens |
|---|---|---|
| `invoice-001` | 100.00 | Paid successfully |
| `invoice-002` | 25.00 | Paid successfully |
| `invoice-decline` | 40.00 | Payment declined: 422 `payment_declined` |
| `invoice-error` | 40.00 | Payment fails with a server error: 500 `biller_error` |
| `invoice-timeout` | 40.00 | Waits 30 seconds, then 504. The API gives up after 5 seconds |
| `invoice-slow` | 60.00 | Paid successfully after a 3-second delay |

The admin endpoint can also set an `inquiry_error` scenario, which makes the lookup itself
fail with a 500.

## The bill-payment feature in the banking API

It's a two-step flow, then the payment finishes in the background:

1. **Inquiry:** `POST /accounts/{id}/bill-payments/inquiries` with
   `{billerCode, referenceCode1, referenceCode2}`. The API looks up the bill and stores a
   quote that expires after 5 minutes. No money moves, and the account doesn't need to exist yet.
2. **Confirm:** `POST /accounts/{id}/bill-payments/{inquiryId}/confirm`. It returns 202
   `awaiting_account_charge` right away, and the rest happens in the background.
3. **Poll:** `GET /accounts/{id}/bill-payments/{paymentId}` to see the status.

### What happens in the background

```
confirm → awaiting_account_charge
   ├─ balance too low or no account → failed (nothing recorded; the quote can be confirmed again)
   └─ charge recorded: debit customer, credit BillerClearing → settling
         ├─ biller pays the bill → completed (receipt stored)
         └─ biller fails, declines or times out → reversing
               ├─ charge undone, original marked reversed → failed
               └─ undo fails → manual_review
```

Statuses: `awaiting_account_charge`, `settling`, `reversing`, `completed`, `failed`,
`manual_review`. There's no public endpoint to reverse a payment; a reversal only happens
when paying the biller fails.

### Banking API errors

| Case | Response |
|---|---|
| Unknown bill references | 404 `bill_not_found` |
| Unknown biller | 404 `biller_not_found` |
| Bill already paid (at inquiry) | 409 `bill_not_payable` |
| Missing inquiry | 404 `bill_payment_inquiry_not_found` |
| Expired inquiry | 410 `bill_payment_inquiry_expired` |
| Payment in progress | 409 `bill_payment_in_progress` |
| Payment already completed | 409 `bill_payment_already_completed` |
| Invalid inquiry fields | 400 `invalid_bill_payment_inquiry`, one `details` entry per field |

### Code layout

`BillerGateway` defines what the API needs from any biller (`fetchDebt`, `settle`). There
are two versions:

- `HttpBillerGateway` calls the mock over HTTP when `BILLER_URL` is set. The timeout comes
  from `BILLER_TIMEOUT_MS`, default 5000.
- `InMemoryBillerGateway` runs inside the API when no URL is set. It has only
  `invoice-001`, which can be paid once.

`BillPaymentProcessManager` runs the background steps, using an in-process queue.

### Known limitation

In `invoice-timeout` the biller never records the payment, so undoing the charge is
correct. A real biller that times out might have taken the payment anyway. The current
design would then undo the charge while the biller holds the money.

## Running it locally

```bash
cd ~/Workspace/Scala/scalatra
sbt runBiller                                   # mock biller on :8090
BILLER_URL=http://localhost:8090 sbt run        # banking API on :8080
```

To try it on the cluster, `kubectl -n preprod port-forward svc/biller 8090` gives you the
admin endpoints.
