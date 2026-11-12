#!/usr/bin/env bash
# Summarises eval/results/results.jsonl per app, and per app and task.
#
# Usage: eval/summary.sh [results.jsonl]
set -euo pipefail

file=${1:-$(cd "$(dirname "$0")" && pwd)/results/results.jsonl}
[ -s "$file" ] || { echo "No results yet: $file" >&2; exit 1; }

table() {
  jq -rs --arg by "$1" '
    def avg(f): (map(f) | add) / length | . * 100 | round / 100;
    def rate(f): (map(select(f)) | length) * 100 / length | round;
    def key: if $by == "app" then [.app] else [.app, .task] end;
    (($by | split(",")) + ["runs", "success_%", "existing_files_changed", "shared_files_changed",
      "existing_pages_or_features_changed", "files_added", "guardrail_hits", "seconds"] | @tsv),
    (group_by(key)[] | (.[0] | key) + [length, rate(.success), avg(.files_existing_changed),
      avg(.shared_files_changed), avg(.existing_units_changed), avg(.files_added),
      avg(.guardrail_hits), avg(.seconds)] | @tsv)
  ' "$file" | column -t -s $'\t'
}

echo "Per app"
table app
echo
echo "Per app and task"
table app,task
