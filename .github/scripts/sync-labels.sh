#!/usr/bin/env bash
# Create or update the repository labels from .github/labels.tsv. Never deletes labels. Needs gh logged in with write access (an owner runs it).
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
repo_args=()
if [ -n "${1:-}" ]; then repo_args=(--repo "$1"); fi

upsert() { # name color description
  gh label create "$1" --color "$2" --description "$3" --force "${repo_args[@]}" >/dev/null
  printf 'label %s\n' "$1"
}

while IFS=$'\t' read -r name color desc; do
  case "$name" in ''|'#'*) continue;; esac
  upsert "$name" "$color" "$desc"
done < .github/labels.tsv

