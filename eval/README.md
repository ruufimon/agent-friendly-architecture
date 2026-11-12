# Measuring how agent-friendly the architecture is

This folder runs the same ticket-style tasks with a coding agent against two versions of
Sand Bank and compares the results:

| App | Repo | How it's organised |
|---|---|---|
| `dune` | this repo | One folder per feature, guardrails in the build (see [docs/OVERVIEW.md](../docs/OVERVIEW.md)) |
| `mvc` | [`sand-bank-mvc`](https://github.com/ruufimon/sand-bank-mvc), next to this repo | Traditional Model-View-Controller: `models/`, `views/`, `controllers/`, shared `Routes.kt`, `Menu.kt` and `AccountModel` |

Both apps have the same screens, the same server (`host-server`) and **identical console
output** from `./gradlew :app:run`. Each has its own `CLAUDE.md` and an equally detailed
`AGENTS.md`. Only the architecture differs.

This is the Level 2 experiment described in [docs/GUARDRAILS.md](../docs/GUARDRAILS.md#4-proving-it-with-agents-level-2-and-3).

## Layout

```
eval/
  tasks/<id>/prompt.md   the ticket, word for word the same for both apps
  tasks/<id>/check       which screen must show which text (see "Adding a task")
  run.sh                 fresh copy → run agent → score, N times
  score.sh               scores one finished run, prints one JSON line
  summary.sh             averages results per app and per task
  results/               results.jsonl plus one agent log per run (logs are git-ignored)
```

## Keeping the comparison fair

- **The agent never sees this folder.** `eval/` is marked `export-ignore` in `.gitattributes`,
  and `run.sh` copies each app with `git archive`, leaving out `eval/` and `web/`.
- **Every run starts clean.** Each run gets a new temporary folder holding a fresh git repo with
  one baseline commit, so `git diff` shows exactly what the agent changed.
- **Runs use the last commit.** Uncommitted changes in either repo aren't copied, and `run.sh`
  warns you when there are any.
- **No memory between runs.** The default agent command loads project settings only
  (`--setting-sources project`), skips MCP servers and doesn't save sessions. If you use a
  memory plugin or a global `CLAUDE.md`, check that it isn't active for these runs. Otherwise
  what the agent learns on one app can leak into the next run.
- **Same agent, same limits.** Use the same `AGENT_CMD`, model and `AGENT_TIMEOUT` for both apps.

## Running

Requires JDK 21, `jq`, `git` and the `claude` CLI, with both repos side by side:

```
~/Workspace/Kotlin/agent-friendly-architecture
~/Workspace/Kotlin/sand-bank-mvc
```

```
eval/run.sh dune 01-welcome-banner 5    # 5 runs of task 01 on the Dune app
eval/run.sh mvc  01-welcome-banner 5    # the same on the MVC app
eval/summary.sh
```

To run every task on both apps:

```
for task in $(ls eval/tasks); do
  for app in dune mvc; do eval/run.sh $app $task 5; done
done
```

That's 10 tasks × 2 apps × 5 runs = 100 agent runs. Start with one or two tasks to check
cost and timing.

| Variable | Default | Purpose |
|---|---|---|
| `MVC_REPO` | `../sand-bank-mvc` | Where the MVC twin is |
| `AGENT_CMD` | `claude -p …` (see `run.sh`) | The agent command; the prompt is added as its last argument |
| `AGENT_TIMEOUT` | `1800` | Seconds before the agent is stopped |

The default agent may edit files and run only `./gradlew` plus a few read-only and file-copy
shell commands. Add `--model <id>` to `AGENT_CMD` to pin a model.

## What gets measured

Each run adds one line to `results/results.jsonl`:

| Field | How it's measured | What you'd expect from the Dune app |
|---|---|---|
| `success` | `build_ok` and `behaviour_ok` are both true | Same or higher |
| `build_ok` | `./gradlew build` passes (compile, tests, boundary checks) | |
| `behaviour_ok` | `./gradlew :app:run` shows the expected text on the expected screen | |
| `files_existing_changed` | Existing files modified or deleted (`git diff`) | About 0 |
| `shared_files_changed` | Files every contributor depends on. Dune: `dune/`, `bank-api/`, `app/`, build files. MVC: `Routes.kt`, `Menu.kt`, `Main.kt`, `models/`, `services/`, build files | 0, except tasks that need new shared state |
| `existing_units_changed` | Existing feature folders (Dune) or existing controllers and views (MVC) edited | 0 |
| `files_added` | New files | Higher: work goes into new folders |
| `tests_touched` | Test files added or changed | |
| `guardrail_hits` | `✗ ` error messages in the agent log, a sign it hit a guardrail and had to recover | Some on Dune, none on MVC |
| `seconds` | How long the agent ran | |
| `changed_files`, `workdir` | The changed paths, and the folder kept for inspection | |

**Why edits to existing files matter:** two agents working in parallel collide when they edit
the same files. On the MVC app, both a welcome banner and a low-balance warning edit
`HomeView.kt` and `HomeController.kt`. On the Dune app, each goes into its own folder.

## The tasks

| Task | Screen | Notes |
|---|---|---|
| 01-welcome-banner | home | Display only |
| 02-cashback-promo | home | Display only |
| 03-transfer-fee | transfer | Logic from the draft amount |
| 04-low-balance-warning | home | Must appear only after the transfer (checked both ways) |
| 05-last-recipient | home | **Needs new shared state.** On Dune it's a rule 5 change (`bank-api` + `BankClient`), so expect friction |
| 06-bills-screen | bills | A new screen |
| 07-risk-score | transfer | Uses a server call (`fraudScore`) |
| 08-account-on-home | home | Display only |
| 09-daily-limit | transfer | **Needs new shared state** for transfers made today |
| 10-scan-qr-action | home | Adds to the action row |

Tasks 05 and 09 are included on purpose. GUARDRAILS.md asks for an honest report, including
tasks where Dune adds friction.

## Adding a task

Create `tasks/<NN-name>/prompt.md` with the ticket text. Write it as a product request, with
no hints about architecture or file names. Then create `tasks/<NN-name>/check`:

```
screen=home                # the "── <screen> ──" block in :app:run output
phase=first                # first: before the transfer; last: the final home screen after it
expect='Welcome back'      # text that must appear in that block
absent_in=first            # optional: the text must NOT appear in this phase
```

Check a task against both apps before you rely on it: implement it once by hand in each and
run `eval/score.sh` on that folder.

## Not measured yet

- **Review effort** (human comments per change) and **boundary violations that slipped
  through** still need a person to review the diffs, using `changed_files` and `workdir`.
- **Level 3, parallel agents:** run several tasks on separate branches of one copy, merge them
  all, and count conflicts and broken builds. `run.sh` doesn't do this yet.
