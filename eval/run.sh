#!/usr/bin/env bash
# Runs one task against one app, N times, each in a fresh copy, and appends a score line per run.
#
# Usage: eval/run.sh <dune|mvc> <task-id> [runs]
#   e.g. eval/run.sh dune 01-welcome-banner 5
#
# Environment:
#   MVC_REPO       path to the MVC twin (default: ../sand-bank-mvc next to this repo)
#   AGENT_CMD      command that runs the agent; the prompt is appended as the last argument
#   AGENT_TIMEOUT  seconds before the agent is stopped (default 1800)
set -euo pipefail

EVAL_DIR=$(cd "$(dirname "$0")" && pwd)
DUNE_REPO=$(cd "$EVAL_DIR/.." && pwd)
MVC_REPO=${MVC_REPO:-$(dirname "$DUNE_REPO")/sand-bank-mvc}
AGENT_TIMEOUT=${AGENT_TIMEOUT:-1800}
AGENT_CMD=${AGENT_CMD:-claude -p --output-format stream-json --verbose \
  --setting-sources project --strict-mcp-config --no-session-persistence \
  --permission-mode acceptEdits \
  --allowedTools 'Read,Edit,Write,Glob,Grep,Bash(./gradlew:*),Bash(ls:*),Bash(find:*),Bash(cat:*),Bash(mkdir:*),Bash(cp:*),Bash(mv:*)'}

usage() { sed -n '4,5p' "$0" | sed 's/^# //' >&2; exit 2; }

[ $# -ge 2 ] || usage
app=$1 task=$2 runs=${3:-1}
case $app in
  dune) repo=$DUNE_REPO ;;
  mvc)  repo=$MVC_REPO ;;
  *)    usage ;;
esac
task_dir=$EVAL_DIR/tasks/$task
[ -f "$task_dir/prompt.md" ] || { echo "No task '$task'. Tasks: $(ls "$EVAL_DIR/tasks" | tr '\n' ' ')" >&2; exit 2; }
[ -d "$repo/.git" ] || { echo "Not a git repo: $repo" >&2; exit 2; }
if [ -n "$(git -C "$repo" status --porcelain)" ]; then
  echo "Note: $repo has uncommitted changes. Runs use the last commit (HEAD) only." >&2
fi

results=$EVAL_DIR/results
mkdir -p "$results"
prompt=$(cat "$task_dir/prompt.md")

for i in $(seq 1 "$runs"); do
  run_id="$(date -u +%Y%m%dT%H%M%SZ)-$app-$task-$i"
  work="$(mktemp -d "${TMPDIR:-/tmp}/sandbank-eval.XXXXXX")/app"
  mkdir -p "$work"

  # A clean copy of the committed app, without the web client or this harness,
  # so the agent never sees the tasks, the scoring or the other app.
  git -C "$repo" archive HEAD -- . ':(exclude)web' ':(exclude)eval' | tar -x -C "$work"
  (cd "$work" && git init -q -b main && git add -A \
    && git -c user.name=eval -c user.email=eval@localhost commit -qm baseline)

  echo "▶ $run_id  ($work)" >&2
  start=$(date +%s)
  set +e
  (cd "$work" && perl -e 'alarm shift; exec @ARGV' "$AGENT_TIMEOUT" \
    bash -c "$AGENT_CMD \"\$1\"" _ "$prompt") > "$results/$run_id.log" 2>&1
  agent_exit=$?
  set -e
  secs=$(( $(date +%s) - start ))

  "$EVAL_DIR/score.sh" "$work" "$app" "$task_dir" "$run_id" "$agent_exit" "$secs" "$results/$run_id.log" \
    | tee -a "$results/results.jsonl"
done
