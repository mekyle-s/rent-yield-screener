#!/usr/bin/env bash
# One Ralph iteration inside the sandbox container (Phase INFRA T5/T7, ADR-0005).
# Contract: fresh clone → checkout claude/<task> → claude -p (ONE task, updates
# PROGRESS.md, atomic commit — Stop hook enforces both) → deterministic push →
# container dies. Never sees the Windows working copy; credentials via --env-file.
set -euo pipefail

BRANCH="${1:?usage: entry.sh <claude/branch>}"
: "${GH_TOKEN:?GH_TOKEN missing (fine-grained PAT)}"
: "${CLAUDE_CODE_OAUTH_TOKEN:?CLAUDE_CODE_OAUTH_TOKEN missing (claude setup-token)}"
case "$BRANCH" in
  claude/*) ;;
  *) echo "FATAL: loop branch must be claude/* (got: $BRANCH)" >&2; exit 1 ;;
esac

REPO="mekyle-s/rent-yield-screener"
git clone --quiet "https://x-access-token:${GH_TOKEN}@github.com/${REPO}.git" /work
cd /work
git config user.name "${GIT_AUTHOR_NAME:-claude-loop}"
git config user.email "${GIT_AUTHOR_EMAIL:-claude-loop@users.noreply.github.com}"

# resume the loop branch if it exists on the remote, else fork it from main
git checkout --quiet "$BRANCH" 2>/dev/null || git checkout --quiet -b "$BRANCH" origin/main

npm ci --no-audit --no-fund

BEFORE=$(git rev-parse HEAD)

# CLAUDE_LOOP=1 arms the loop-only guards (pre-bash push-to-main block,
# pre-edit guardrail write block, stop-tests dirty-tree block)
export CLAUDE_LOOP=1
set +e
claude -p "$(cat scripts/loop/PROMPT.md)" \
  --model sonnet \
  --max-turns 80 \
  --dangerously-skip-permissions
CLAUDE_EXIT=$?
set -e
echo "claude exited: $CLAUDE_EXIT"

# atomic-commit contract check: the Stop hook should have forced a clean tree
if [ -n "$(git status --porcelain)" ]; then
  echo "FATAL: dirty tree after iteration — atomic commit contract violated" >&2
  git status --porcelain >&2
  exit 2
fi

AFTER=$(git rev-parse HEAD)
if [ "$AFTER" = "$BEFORE" ]; then
  echo "iteration produced no commit (HEAD unchanged at $BEFORE)"
else
  # deterministic push — the driver, not the model, publishes the iteration
  git push --quiet -u origin "$BRANCH"
  git fetch --quiet origin "$BRANCH"
  if [ "$(git rev-parse HEAD)" != "$(git rev-parse "origin/$BRANCH")" ]; then
    echo "FATAL: push verification failed (local $(git rev-parse --short HEAD) != remote)" >&2
    exit 2
  fi
  echo "pushed: $BEFORE..$AFTER on $BRANCH"
fi

exit "$CLAUDE_EXIT"
