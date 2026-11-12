#!/usr/bin/env bash
# Scores one finished run from its working copy. Prints one JSON line.
#
# Usage: eval/score.sh <workdir> <dune|mvc> <task-dir> <run-id> <agent-exit> <seconds> [agent-log]
set -uo pipefail

work=$1 app=$2 task_dir=$3 run_id=$4 agent_exit=$5 secs=$6 log=${7:-/dev/null}
task=$(basename "$task_dir")
screen='' phase=first expect='' absent_in=''
# shellcheck source=/dev/null
. "$task_dir/check"

cd "$work" || exit 1
git add -A >/dev/null 2>&1
changes=$(git diff --cached --name-status --no-renames HEAD)
paths=$(cut -f2 <<<"$changes" | sed '/^$/d')
count() { grep -c . <<<"$1" || true; }

files_added=$(awk -F'\t' '$1=="A"' <<<"$changes" | grep -c . || true)
files_existing_changed=$(awk -F'\t' '$1=="M"||$1=="D"' <<<"$changes" | grep -c . || true)
tests_touched=$(grep -c '/src/test/' <<<"$paths" || true)

# Files that every other contributor also depends on. Editing them is where parallel work collides.
case $app in
  dune) shared_re='^(dune/|bank-api/|app/|host-server/|settings\.gradle\.kts|build\.gradle\.kts|gradle/)' ;;
  mvc)  shared_re='^(app/src/main/kotlin/dev/sand/mvc/(Routes|Menu|Main)\.kt|app/src/main/kotlin/dev/sand/mvc/models/|app/src/main/kotlin/dev/sand/mvc/services/|host-server/|api/|settings\.gradle\.kts|build\.gradle\.kts|app/build\.gradle\.kts|gradle/)' ;;
esac
shared_files_changed=$(grep -cE "$shared_re" <<<"$paths" || true)

# Existing feature folders or page files edited (Dune: other feature folders; MVC: existing controllers/views).
case $app in
  dune) existing_units=$(git ls-tree --name-only HEAD features/ | sed 's#$#/#') ;;
  mvc)  existing_units=$(git ls-tree -r --name-only HEAD app/src/main/kotlin/dev/sand/mvc/controllers app/src/main/kotlin/dev/sand/mvc/views) ;;
esac
existing_units_changed=0
while IFS=$'\t' read -r status path; do
  [ "$status" = M ] || [ "$status" = D ] || continue
  while read -r unit; do
    [ -n "$unit" ] && [[ $path == "$unit"* ]] && { existing_units_changed=$((existing_units_changed + 1)); break; }
  done <<<"$existing_units"
done <<<"$changes"

limit() { perl -e 'alarm shift; exec @ARGV' "$@"; }

build_ok=false
limit 900 ./gradlew -q build >/dev/null 2>&1 && build_ok=true

behaviour_ok=false
output=$(limit 300 ./gradlew -q :app:run 2>/dev/null)
# Text of one screen: the block under "── <screen> ──" up to the next blank line.
section() {
  awk -v s="$screen" -v want="$1" '
    $0 ~ "^── " s " ─" { n++; take = (want == "first" ? n == 1 : 1); if (take) buf = ""; next }
    take && /^$/ { take = 0 }
    take { buf = buf $0 "\n" }
    END { printf "%s", buf }' <<<"$output"
}
if grep -qF -- "$expect" <<<"$(section "$phase")"; then
  behaviour_ok=true
  if [ -n "$absent_in" ] && grep -qF -- "$expect" <<<"$(section "$absent_in")"; then
    behaviour_ok=false
  fi
fi

# Times the agent hit a guardrail message (Dune's "✗ … →" errors) during the run.
guardrail_hits=$(grep -o '✗ ' "$log" 2>/dev/null | grep -c . || true)

jq -cn \
  --arg run_id "$run_id" --arg app "$app" --arg task "$task" \
  --argjson agent_exit "$agent_exit" --argjson seconds "$secs" \
  --argjson build_ok "$build_ok" --argjson behaviour_ok "$behaviour_ok" \
  --argjson files_added "$files_added" --argjson files_existing_changed "$files_existing_changed" \
  --argjson shared_files_changed "$shared_files_changed" --argjson existing_units_changed "$existing_units_changed" \
  --argjson tests_touched "$tests_touched" --argjson guardrail_hits "$guardrail_hits" \
  --arg changed_files "$paths" --arg workdir "$work" \
  '{run_id:$run_id, app:$app, task:$task,
    success:($build_ok and $behaviour_ok), build_ok:$build_ok, behaviour_ok:$behaviour_ok,
    files_added:$files_added, files_existing_changed:$files_existing_changed,
    shared_files_changed:$shared_files_changed, existing_units_changed:$existing_units_changed,
    tests_touched:$tests_touched, guardrail_hits:$guardrail_hits,
    agent_exit:$agent_exit, seconds:$seconds,
    changed_files:($changed_files | split("\n") | map(select(. != ""))), workdir:$workdir}'
