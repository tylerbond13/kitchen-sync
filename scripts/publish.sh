#!/usr/bin/env bash
# One-command GitHub publish: authenticates (browser device flow) if needed,
# creates a private repo, and pushes. Usage: ./scripts/publish.sh [--public]
set -euo pipefail
cd "$(dirname "$0")/.."

VISIBILITY="--private"
[ "${1:-}" = "--public" ] && VISIBILITY="--public"

if ! command -v gh >/dev/null; then
  echo "GitHub CLI not found. Install with: brew install gh" >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  gh auth login --hostname github.com --git-protocol https --web
fi

if git remote get-url origin >/dev/null 2>&1; then
  git push -u origin main
else
  gh repo create kitchen-sync "$VISIBILITY" \
    --description "Cook together, apart — real-time co-op cooking game for mobile web" \
    --source . --remote origin --push
fi

echo "Published: $(gh repo view --json url -q .url)"
