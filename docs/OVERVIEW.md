# Agent-friendly architecture: overview

This repo is a small, runnable banking app (Sand Bank) built to answer one question:

> How do you structure a codebase so that many contributors with **narrow context**
> (coding agents, or people new to the code) can add features in parallel without
> breaking each other?

The answer used here is called the **Dune approach**. Its central claim:

> **The locally obvious change is also the globally correct one.** If a shortcut is
> unsafe, the build or the app refuses it and says what to do instead.

## The problem it solves

A coding agent usually starts with a short prompt ("add a fraud banner to the transfer
screen") and a few nearby files. It has no model of the whole system. In a typical
layered codebase (controllers, models, a shared routes file) that agent will:

- edit shared files such as route lists, menus and models, which causes merge conflicts
  with other contributors;
- reach into code it shouldn't, such as another feature's classes or a raw HTTP client;
- keep its own copy of state such as the balance, which then drifts from the real value;
- break something far away without noticing until review or production.

Documentation alone doesn't stop this, because an agent with narrow context may not read it
or may not connect it to the task. The Dune approach puts the rules **into the structure and
the build**, so a wrong move fails right away with an error that names the right path.

## The shape of the system

```
                ┌───────────────────────────────────────────────┐
                │ features/            (product work goes here) │
                │   home/  transfer/  fraud-banner/  loan-offer/│
                └───────────┬───────────────────────────────────┘
                            │ may use only
               ┌────────────┴────────────┐
               ▼                         ▼
       ┌───────────────┐        ┌──────────────────┐
       │ dune/         │◄───────│ bank-api/        │
       │ framework     │        │ shared contracts │
       │ (no app code) │        │ BankState,       │
       └───────────────┘        │ Transfer,        │
               ▲                │ BankHost,        │
               │                │ openapi.yaml     │
       ┌───────┴────────────────┴──────┐
       │ app/   wiring                 │
       │  BankClient (the one writer)  │       HTTP       ┌──────────────┐
       │  loads features at runtime    │ ───────────────► │ host-server/ │
       └───────────────────────────────┘   (BankHost)     │ Ktor server  │
                                                          └──────────────┘
```

| Module | Role | May depend on |
|---|---|---|
| `dune/` | Framework: `Feature`, `Entrypoint`, `Slot`, `Client`, `StateOwner`, `Context`, `Host`, `DuneApp` | nothing |
| `bank-api/` | Shared contracts: state keys (`BankState`), commands (`Transfer`), the server contract (`BankHost`, `openapi.yaml`) | `dune` |
| `features/*` | One folder per feature. Owns a screen or adds to one | `dune`, `bank-api` (given automatically) |
| `app/` | Wires everything: `BankClient`, the host implementation, `main()`. Loads features at runtime only | `dune`, `bank-api`, features (runtime only) |
| `host-server/` | Separate deployable that implements `openapi.yaml`. Source of truth for the balance | nothing in the client modules |
| `web/` | Angular client that follows the same five rules | its own boundary script |

## Core concepts

**Feature.** A folder under `features/` with one class implementing `Feature`. Its `id`
is the folder name. It's registered by a reserved file,
`src/main/resources/META-INF/services/dev.sand.dune.Feature`, not by a shared list.

**Screen and slots.** A feature puts things on screen by returning entrypoints:

```kotlin
entrypoint("transfer", Slot.BANNER) { ctx -> "…text or null…" }
```

Each screen has exactly **one owner** (`Slot.SCREEN`). Any other feature can add to it
through `Slot.BANNER`, `Slot.BODY` or `Slot.ACTIONS` without touching the owner's code.

**Context.** The only things an entrypoint can reach:

- `ctx.client.read(BankState.Balance)` reads state;
- `ctx.client.send(Transfer(...))` asks for a change;
- `ctx.host<BankHost>()` calls the server through the typed contract.

**One writer.** Features get a read-only `Client`. Only `StateOwner` can write, its `write`
method is `protected`, and only `app/BankClient` extends it. The balance stored there always
comes back from the server, never from the client's own arithmetic.

### Example: a whole feature

`features/fraud-banner/` adds a warning to the transfer screen. It's the entire feature:

```kotlin
class FraudBannerFeature : Feature {
    override val id = "fraud-banner"

    override fun entrypoints() = listOf(
        entrypoint("transfer", Slot.BANNER) { ctx ->
            val draft = ctx.client.read(BankState.DraftTransfer) ?: return@entrypoint null
            val score = ctx.host<BankHost>().fraudScore(draft.to, draft.amount)
            if (score >= 70) "⚠ Check the recipient. This transfer looks unusual for your account." else null
        },
    )
}
```

It reads state, calls the server through `BankHost` and adds a banner. It doesn't edit the
transfer feature, a route list or a build file.

## The five rules

| # | Rule | How the code enforces it |
|---|---|---|
| 1 | **The conventional path needs fewer decisions than a shortcut.** | A feature folder needs no build file; the root build gives it `:dune` and `:bank-api`. One helper, `entrypoint(...)`, writes an entrypoint. Copy a folder and rename it. |
| 2 | **Forbidden dependencies fail mechanically.** | The root `build.gradle.kts` checks every project dependency and stops with `✗ A depends on B → what to do instead`. `DuneApp`, `StateOwner` and `Context` refuse bad wiring at startup with the same style of message. |
| 3 | **Every durable value has one obvious writer.** | `StateOwner.write` is protected; only `BankClient` extends it. Features only ever see `Client`, which has no write method. |
| 4 | **New product work adds a folder; it never edits a shared list.** | `settings.gradle.kts` and `app/build.gradle.kts` discover `features/*` by folder. `DuneApp.discover` finds features through `META-INF/services`. |
| 5 | **Exceptions are narrow, explicit and reviewed.** | Changing `dune/`, `bank-api/` (including `openapi.yaml`), `BankClient` or `host-server` is an architecture change and must say so in the PR. |

## Errors that teach

Every refusal says what went wrong **and** the supported path, so an agent can fix itself
without a human:

```
✗ :features:loan-offer depends on :features:fraud-banner.
  → Features never import each other. Share state through :bank-api (StateKey, Command)
    and server calls through BankHost.
```

| Shortcut tried | Where it fails | What it says to do |
|---|---|---|
| A feature imports another feature | Gradle build | Share through `bank-api` |
| A feature imports `app` | Gradle build | Use `ctx.client` and `ctx.host<BankHost>()` |
| Anything imports `host-server` | Gradle build | Reach it over HTTP through `BankHost` |
| Two features own one screen | App startup | Add through a slot instead |
| A feature adds to a screen nobody owns | App startup | Lists the screens that exist |
| A feature sends a command nobody handles | At send | Only `BankClient` handles commands (rule 5) |
| A feature asks for a host that isn't wired | At call | Use an existing host contract (rule 5) |

The server follows the same idea: every error is `application/problem+json` with a
`supportedPath` field.

## Adding a feature (the conventional path)

1. Copy `features/fraud-banner/` to `features/<your-feature>/`.
2. Rename the package folder, package, class and `id` (use the folder name).
3. Put the new class name in `src/main/resources/META-INF/services/dev.sand.dune.Feature`.
4. Return your entrypoints from `entrypoints()`.
5. Run `./gradlew build`.

No other file changes. Because every feature is its own folder, several agents can add
features on separate branches and merge them without conflicts.

## What takes a reviewed change

Some work can't be done inside a feature folder, on purpose:

- new shared state or a new command: `bank-api` plus a handler in `BankClient`;
- a new server call: `openapi.yaml`, `BankHost` and `host-server` together;
- framework changes: `dune/`.

Here the architecture deliberately adds friction. These changes affect every feature, so
they get an architecture review instead of slipping in with product work.

## How far the guarantees go today

[GUARDRAILS.md](GUARDRAILS.md) lists every guardrail as **enforced**, **tested** or a
**gap**. The main gaps:

- the Gradle boundary check and the missing-host check have no automated tests yet;
- there's no test that adding a feature changes files only inside its folder;
- rule 5 is documented, not enforced; a CODEOWNERS file would make those paths need an
  architecture reviewer.

GUARDRAILS.md also describes how to **prove** the approach works: run the same narrow tasks
with coding agents against this repo and a layered twin of the same app, then compare
success rate, files touched outside the feature folder, boundary violations and merge
conflicts.

## Running it

```
./gradlew build                # compile, test, check boundaries
./gradlew :app:run             # print the screens and run one transfer
./gradlew :host-server:run     # serve the API on http://localhost:8080/host/v1
cd web && npm install && npm start   # web client on http://localhost:4200
```

## Further reading

- [AGENTS.md](../AGENTS.md): where code goes, the add-a-feature recipe and every error message
- [README.md](../README.md): layout, run commands and "try breaking it" exercises
- [GUARDRAILS.md](GUARDRAILS.md): every guardrail, its status and how to see it fire
- [web/README.md](../web/README.md): the same rules in the Angular client
