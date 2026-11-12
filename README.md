# Agent-friendly architecture (Kotlin)

A small, runnable example of the Dune approach from the "Narrow Context" workshop game:
the Sand Bank app, built so that many contributors with narrow context, people or coding
agents, can add features in parallel without breaking each other.

Names such as `useBalance`, `client.command` and `entrypoint` are illustrations of the
idea, not the real Dune API.

## Docs

| Doc | What it covers |
|---|---|
| [docs/OVERVIEW.md](docs/OVERVIEW.md) | Why the architecture exists, how it's shaped, the five rules and how to add a feature |
| [docs/GUARDRAILS.md](docs/GUARDRAILS.md) | Every guardrail, its status (enforced, tested or gap) and how to see it fire |
| [AGENTS.md](AGENTS.md) | Where code goes, the add-a-feature recipe and every error message |
| [requirements/biller.md](requirements/biller.md) | The mock biller API and bill-payment feature from the Scala banking project |
| [web/README.md](web/README.md) | The Angular client and the same rules on the web side |

## Layout

```
dune/                 framework: Feature, Entrypoint, Client, Host. Never imports app code.
bank-api/             shared contracts: BankState, Transfer, BankHost
  openapi.yaml        HTTP form of BankHost (draft)
features/
  transfer/           owns the transfer screen
  home/               owns the home screen
  fraud-banner/       P1: adds a banner to the transfer screen
  loan-offer/         P2: adds an offer to the home screen
app/                  wiring: BankClient (the one writer), FakeBankHost, main()
host-server/          Ktor server implementing bank-api/openapi.yaml (separate deployable)
web/                  Angular client, same five rules (see web/README.md)
```

## How the five rules show up in code

| Rule | Where |
|---|---|
| 1. Conventional path is easiest | A feature folder needs no build file; copy one and rename |
| 2. Forbidden dependencies fail | Boundary check in `build.gradle.kts`; refusals in `DuneApp`, `StateOwner`, `Context` |
| 3. One writer | `StateOwner.write` is protected; only `app/BankClient` extends it |
| 4. New work adds files | `settings.gradle.kts` and `app/build.gradle.kts` discover `features/*`; features register via `META-INF/services` |
| 5. Exceptions are reviewed | Changes to `dune/`, `bank-api/`, `BankClient` are architecture changes (see AGENTS.md) |

Every guardrail, its status (enforced, tested or gap) and how to prove the claim with
coding agents: [docs/GUARDRAILS.md](docs/GUARDRAILS.md).

## Run

Requires JDK 21 (same as the Auction project).

```
./gradlew build
./gradlew :app:run
./gradlew :host-server:run     # serves the OpenAPI contract on http://localhost:8080/host/v1
```

Try the server (any non-empty bearer token works in this demo):

```
curl -s -X POST localhost:8080/host/v1/fraud-score \
  -H 'Authorization: Bearer demo' -H 'Content-Type: application/json' \
  -d '{"to":"Somsri K. ••7730","amount":25000}'

curl -s -X POST localhost:8080/host/v1/transfers \
  -H 'Authorization: Bearer demo' -H 'Idempotency-Key: key-00000001' \
  -H 'Content-Type: application/json' -d '{"to":"Somsri K. ••7730","amount":25000}'

curl -s localhost:8080/host/v1/loan-eligibility -H 'Authorization: Bearer demo'
```

Every error is `application/problem+json` with a `supportedPath` that says what to do instead.

Web client (with the server running): `cd web && npm install && npm start`, then open http://localhost:4200.

## Try breaking it

1. Make one feature import another: create `features/loan-offer/build.gradle.kts` with
   `dependencies { implementation(project(":features:fraud-banner")) }`, then run
   `./gradlew build`. The build stops and names the supported path.
2. Make two features own one screen: in `LoanOfferFeature`, change `Slot.BODY` to
   `Slot.SCREEN`. Run `./gradlew :app:run` and read the error.
3. Add a feature the conventional way: copy `features/fraud-banner` to
   `features/welcome-banner`, rename it, run `./gradlew :app:run`. No other file changes.
