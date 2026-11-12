# Guardrails

The claim: in this repo, **the locally obvious change is the globally correct one**, and an
unsafe shortcut fails with an error that names the supported path. This file lists every
guardrail that backs the claim, how to see it fire, what is still missing, and how to prove
the claim with real coding agents.

Status key: **Enforced** = a check stops the shortcut. **Tested** = an automated test proves the
check fires. **Gap** = not there yet.

## 1. Guardrails in place

### Rule 1 · The conventional path needs fewer decisions than a shortcut

| Guardrail | Where | Status |
|---|---|---|
| A Kotlin feature folder needs no build file; it gets `:dune` and `:bank-api` automatically | `build.gradle.kts` (root) | Enforced |
| One helper to write an entrypoint | `dune/…/Entrypoint.kt` (`entrypoint(…)`) | Enforced |
| Copy-and-rename recipe for a new feature | `AGENTS.md`, `web/README.md` | Documented |

### Rule 2 · Forbidden dependencies fail mechanically, and say where to go

| Guardrail | Where | Status |
|---|---|---|
| Feature → feature, feature → app, `:dune` → anything, `:bank-api` → anything but `:dune`, anything → `:host-server`, app → feature at compile time: build stops with `✗ … →` | `build.gradle.kts` (root, `afterEvaluate` check) | Enforced · **Gap: no test** |
| Web: feature → feature, feature → shell, feature → `@angular/common/http`, `dune/` → app, `bank/` → features: `npm start/build/test` stops with `✗ … →` | `web/scripts/check-boundaries.mjs` | Enforced · checked by hand |
| Two owners for one screen, adding to a missing screen, duplicate feature id | `dune/…/DuneApp.kt`, `web/src/app/dune/assemble.ts` | Enforced · Tested (`DuneAppTest`, `assemble.spec.ts`) |
| Unknown command refused | `dune/…/Client.kt` (`StateOwner.send`) | Enforced · Tested (`DuneAppTest`) |
| Missing host refused | `dune/…/Context.kt` (`host<H>()`) | Enforced · **Gap: no test** |
| Every server error is Problem Details with `supportedPath` | `host-server/…/Problems.kt`, `bank-api/openapi.yaml` | Enforced · Tested (`HostApiTest`, mocked e2e) |

### Rule 3 · Every durable value has one obvious writer

| Guardrail | Where | Status |
|---|---|---|
| Features receive a read-only `Client`; `write` is protected in `StateOwner`; only `BankClient` extends it | `dune/…/Client.kt`, `app/…/BankClient.kt` | Enforced by the type system |
| Web: `BankClient` exposes read-only signals; state changes only through `send(command)` | `web/src/app/bank/bank-client.ts` | Enforced · Tested (`bank-client.spec.ts`) |
| The balance comes from the server (`newBalance`); clients never send it | `bank-api/openapi.yaml`, `BankClient` | Enforced · Tested (`HostApiTest`, full-stack e2e) |

### Rule 4 · New product work adds isolated files, not branches in shared roots

| Guardrail | Where | Status |
|---|---|---|
| Kotlin features found by folder; registered via `META-INF/services` | `settings.gradle.kts`, `app/build.gradle.kts`, `DuneApp.discover` | Enforced · Tested (`AppTest`) · **Gap: no "zero edits outside the folder" test** |
| Web features found by `features/*/feature.ts`; generated list is git-ignored, so it can't conflict | `web/scripts/discover-features.mjs` | Enforced · Tested (`app.spec.ts`) |
| Routes and tabs come from screen owners, not a hand-kept list | `web/src/app/dune/assemble.ts` | Enforced · Tested (`assemble.spec.ts`, e2e tabs) |

### Rule 5 · Exceptions are narrow, explicit, and reviewed as architecture changes

| Guardrail | Where | Status |
|---|---|---|
| Changes to `dune/`, `bank-api/` (incl. `openapi.yaml`), `BankClient`, `host-server`, `web/src/app/dune`, `web/src/app/bank` are architecture changes | `AGENTS.md` | Documented · **Gap: not enforced** (add a CODEOWNERS file so these paths need an architecture reviewer) |

## 2. How to see the guardrails fire

```
# Kotlin: feature importing another feature
echo 'dependencies { implementation(project(":features:fraud-banner")) }' > features/loan-offer/build.gradle.kts
./gradlew build            # stops: ✗ :features:loan-offer depends on :features:fraud-banner → …
rm features/loan-offer/build.gradle.kts

# Kotlin: two owners for one screen
# In LoanOfferFeature, change Slot.BODY to Slot.SCREEN, then:
./gradlew :app:run         # stops: ✗ Screen 'home' is provided by home and loan-offer → …

# Web: feature importing another feature or HTTP
# Add `import { HttpClient } from '@angular/common/http';` to a feature, then:
cd web && npm run check    # stops: ✗ … imports '@angular/common/http' → Use BankHost …
```

## 3. Gaps to close (Level 1 proof)

1. Gradle boundary test: a test build with a forbidden dependency must fail with `✗ … →`.
2. Context test: asking for an unwired host must fail with the supported path.
3. "Add a feature" test: copy a feature folder, build, and assert the new feature appears and
   `git diff` shows changes **only** inside that folder (Kotlin and web).
4. Error-message test: every error type in `dune` and `host-server` carries a supported path.
5. CODEOWNERS for the rule 5 paths.
6. Run `web/scripts/check-boundaries.mjs` against fixture files in a test, not only by hand.

## 4. Proving it with agents (Level 2 and 3)

The guardrails existing is not the same as agents doing better with them. To show that:

- **Two versions of the same app:** a legacy MVC twin (organised by layer, shared `routes`,
  `AccountModel`, …) and this Dune version, both with an equally good `AGENTS.md`.
- **About 10 narrow tasks** phrased like real tickets, run 5+ times each with the same agent
  and the same limits (narrow prompt, a few nearby files).
- **Score each run from `git diff` and the build:**

| Metric | How it is measured | Expected on Dune |
|---|---|---|
| Task success | Build and tests pass; the new behaviour appears | Higher |
| Files touched outside the feature folder | `git diff --name-only` | About 0 |
| Boundary violations that got through | Check or review finds forbidden imports | 0 |
| Self-recovery | Agent fixes a `✗ … →` error without help | Most runs |
| Review effort | Human comments per change | Lower |

- **Scale (Level 3):** give 5–10 agents different tasks at once on separate branches, merge
  them all, and count merge conflicts and post-merge breakages.

The claim is relative: *safer than the MVC version under the same conditions*. Report the
numbers, including tasks where Dune adds friction on purpose (for example, a new shared
command is a rule 5 change).
