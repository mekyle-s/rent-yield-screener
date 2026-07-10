#!/usr/bin/env bash
# Rung 3 loop driver (Phase INFRA T7, ADR-0005). Runs on the HOST from Git Bash.
# Usage:
#   ./scripts/loop/loop.sh --preflight-only
#   ./scripts/loop/loop.sh claude/<task> [cap]        (default cap 6)
# Each iteration = one --rm container (fresh clone inside; host working copy
# never mounted). Stops on LOOP:HALT sentinel, iteration cap, or 2 consecutive
# container failures. Opens a PR if the branch has commits beyond main.
set -euo pipefail

REPO="mekyle-s/rent-yield-screener"
IMG="rys-loop"
ENV_FILE="${CLAUDE_LOOP_ENV:-$HOME/.claude-loop.env}"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

log() { printf '[loop] %s\n' "$*"; }
fail() { printf '[loop] FATAL: %s\n' "$*" >&2; exit 1; }

preflight() {
  log "preflight: docker"
  docker info >/dev/null 2>&1 || fail "docker not running"
  log "preflight: env file present (contents never read)"
  [ -f "$ENV_FILE" ] || fail "missing $ENV_FILE"
  log "preflight: host repo clean"
  [ -z "$(git -C "$REPO_DIR" status --porcelain)" ] || fail "host working tree dirty — commit or stash first"
  log "preflight: latest main CI green"
  local ci
  ci=$(gh run list --repo "$REPO" --branch main --limit 1 --json conclusion -q '.[0].conclusion')
  [ "$ci" = "success" ] || fail "latest main CI conclusion: ${ci:-none} — never launch onto a red trunk"
  log "preflight: tokens valid in-container (gh api + claude ping)"
  docker run --rm --env-file "$ENV_FILE" "$IMG" bash -lc \
    "gh api repos/$REPO --silent && claude -p 'reply with exactly: OK'" \
    | grep -q "OK" || fail "token validation failed"
  log "preflight: ALL GREEN"
}

if [ "${1:-}" = "--preflight-only" ]; then
  preflight
  exit 0
fi

BRANCH="${1:?usage: loop.sh <claude/branch> [cap] | --preflight-only}"
CAP="${2:-6}"
case "$BRANCH" in
  claude/*) ;;
  *) fail "loop branch must be claude/* (got: $BRANCH)" ;;
esac

preflight

halted=""
consecutive_failures=0
for i in $(seq 1 "$CAP"); do
  log "=== iteration $i/$CAP on $BRANCH ==="
  set +e
  docker run --rm --init --ipc=host \
    --env-file "$ENV_FILE" \
    -e CLAUDE_LOOP=1 \
    "$IMG" /entry.sh "$BRANCH"
  rc=$?
  set -e
  if [ "$rc" -ne 0 ]; then
    consecutive_failures=$((consecutive_failures + 1))
    log "iteration $i exited $rc (consecutive failures: $consecutive_failures)"
    [ "$consecutive_failures" -ge 2 ] && { log "2 consecutive failures — stopping"; break; }
  else
    consecutive_failures=0
  fi
  # F7 (T7.5): sentinel lives in the ITERATION'S COMMIT MESSAGE, not PROGRESS.md
  # content. A per-commit signal can't go stale across resumes and can't collide
  # with prose that merely mentions the token. Match only a message whose FIRST
  # line begins with the sentinel.
  if git -C "$REPO_DIR" fetch --quiet origin "$BRANCH" 2>/dev/null; then
    msg=$(git -C "$REPO_DIR" show -s --format=%s FETCH_HEAD 2>/dev/null || true)
    case "$msg" in
      LOOP:HALT*) log "sentinel: $msg — stopping"; halted="$msg"; break ;;
    esac
  fi
done

# open a PR if the branch exists remotely with commits beyond main
if git -C "$REPO_DIR" fetch --quiet origin "$BRANCH" 2>/dev/null; then
  ahead=$(git -C "$REPO_DIR" rev-list --count "origin/main..FETCH_HEAD")
  if [ "$ahead" -gt 0 ]; then
    log "$BRANCH is $ahead commit(s) ahead of main — ensuring PR exists"
    gh pr create --repo "$REPO" --head "$BRANCH" --base main \
      --title "Loop: $BRANCH" \
      --body "Automated Rung 3 loop output. Review PROGRESS.md delta first, then the diff. Never merge red CI." \
      2>/dev/null || log "PR already exists (or create failed — check manually)"
  else
    log "no commits beyond main on $BRANCH — no PR"
  fi
fi
log "done. Morning review: PROGRESS delta -> PR diff -> CI -> merge or triage."
