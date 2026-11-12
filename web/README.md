# Sand Bank web (Angular)

The web client for the Dune bank demo. It follows the two phone screens from the
"Narrow Context" workshop slide (Transfer and Home) in the ODT look, and calls
`host-server` through the contract in `../bank-api/openapi.yaml`.

## Run

```
# terminal 1, in the project root
./gradlew :host-server:run

# terminal 2, in web/
npm install
npm start            # http://localhost:4200, /host/** is proxied to localhost:8080
```

`npm test` runs the unit tests. `npm run build` makes a production build
(it downloads and inlines the IBM Plex Sans Thai font, so it needs internet).

## End-to-end UI tests (Playwright)

```
npx playwright install chromium   # first time only
npm run e2e          # full stack: starts host-server (Gradle) and the app, then clicks through
npm run e2e:mocked   # API faked in the browser: error cases, no Java needed
npm run e2e:report   # open the HTML report of the last run
```

| File | What it covers |
|---|---|
| `e2e/bank.e2e.spec.ts` | Real app + real server: balance and loan offer, fraud banner follows the amount, transfer updates the balance and hides the offer, tab navigation |
| `e2e/errors.mocked.spec.ts` | Refused transfer shows the server's `supportedPath`, server down, banner only for HIGH, offer hidden when not eligible, phone layout |

`npm run e2e` always starts a fresh server so the balance begins at ฿52,300.
Stop any server already running on port 8080 first.

## Layout (the same five rules as the Kotlin side)

```
src/app/
  dune/            framework: Feature, Entrypoint, slots, route building. Imports nothing from the app.
  bank/            shared contracts: BankClient (the one writer), BankHost (the only HTTP caller), models
  features/
    home/          owns the home screen
    transfer/      owns the transfer screen
    fraud-banner/  P1: adds a banner to the transfer screen
    loan-offer/    P2: adds an offer to the home screen
  app.ts           phone-shaped shell; tabs come from screen owners
```

| Rule | Where |
|---|---|
| 1. Conventional path is easiest | Copy a feature folder and rename; nothing else changes |
| 2. Forbidden imports fail | `scripts/check-boundaries.mjs` runs before start, build and test, and names the supported path |
| 3. One writer | `BankClient` exposes read-only signals; state changes only through `send(command)` |
| 4. New work adds files | `scripts/discover-features.mjs` finds every `features/*/feature.ts`; routes and tabs come from screen owners |
| 5. Exceptions are reviewed | Changes to `dune/` or `bank/` are architecture changes (see ../AGENTS.md) |

## Add a feature

1. Copy `src/app/features/fraud-banner/` to `src/app/features/<name>/`.
2. Rename the component and set `id: '<name>'` in `feature.ts`.
3. Choose where it appears: `{ screen: 'home' | 'transfer', slot: 'banner' | 'body' | 'actions' }`.
4. Run `npm start`. You did not edit any shared file.

## Notes

- The OpenAPI spec has no balance endpoint yet, so the balance starts at the demo server's
  ฿52,300 and is then taken from each transfer's `newBalance`.
- Sign-in is demo only: every request sends `Authorization: Bearer demo`.
- Sand Bank is fictional; names and figures are made up.
