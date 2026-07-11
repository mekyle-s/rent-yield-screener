<!-- SYNC IMPACT REPORT (2026-07-11, on Phase INFRA close):
     NEW ADR. Records the Rung-3 autonomous-execution infrastructure (Playbook Phase 3).
     Companion changes in the same phase: .claude/settings.json + .claude/hooks/** (committed
     hooks), scripts/loop/** (sandbox + driver), tests/hooks.test.ts (216-case guard matrix),
     .github/workflows/ci.yml (prettier --check step), CLAUDE.md (npm run check wording),
     ROADMAP.md § Phase INFRA (T1–T9 checkboxes). HQ: research/leads.md Phase 3 verdicts,
     research/phase-3/notes.md (verification evidence). Does not supersede any prior ADR. -->

# ADR-0005 — Autonomous Execution Infrastructure (Rung 3) — ACCEPTED 2026-07-11

## Context and Problem Statement

Phase B closed with the project at Rung 2 (attended `/goal` execution). The Playbook's
autonomy ladder targets **Rung 3**: an unattended local loop that runs one task per fresh
context, commits atomically, and exits — the Ralph pattern. Prompt rules are followed ~70%
of the time, so anything that must hold 100% (never push to trunk, never skip tests, never
edit its own guardrails, never leak a credential) has to be **mechanical**, not prose. This
ADR records the infrastructure that makes an unattended loop safe enough to trust, and the
verification that proved it before first use.

Environment constraints that shaped the design: Windows 11 host; Claude Code native OS
sandboxing is Linux/macOS-only (unavailable here); the product repo is public (GitHub branch
rulesets are free); trunk-based, no feature branches at Rung 2.

## Decision Outcome

**Deterministic hooks (committed) + a minimal branch ruleset + a single pinned Docker sandbox
that clones fresh each iteration with a least-privilege PAT + a host-side loop driver — every
guardrail enforced by code and proven with a live provocation, not asserted.**

### 1. Hooks layer — committed `.claude/settings.json` + `.claude/hooks/*.mjs`

Node scripts (hooks read JSON on stdin; `node script.mjs` runs identically on Windows, Git
Bash, and the Linux container — no bash dispatcher needed). Committed so they travel into
fresh clones and containers, and because hooks fire even under `--dangerously-skip-permissions`
— that is what makes the committed settings.json the container's real guardrail.

- **`pre-bash.mjs`** (PreToolUse, `Bash|PowerShell`): denies force-push/`+refspec`/`--mirror`
  to main; `--no-verify`/`--no-gpg-sign`; curl/wget/iwr/irm piped to a shell; recursive+force
  deletes outside the repo (incl. `\rm`, `/bin/rm`, pipe-fed targets); and in loop mode
  (`CLAUDE_LOOP=1`) any push whose refspec targets main/master (incl. `refs/heads/main`,
  `HEAD:main`, `--all`/`--branches`) plus any Bash write into `.claude/**`, `scripts/loop/**`,
  `.github/**`. Attended mode leaves trunk-based work free.
- **`pre-edit.mjs`** (PreToolUse, `Edit|Write`): in loop mode, denies edits to the guardrail
  dirs — hook _config_ is snapshotted at session start but hook _script files_ are read at
  execution time, so the loop must be unable to edit its own guardrails.
- **`post-edit.mjs`** (PostToolUse): Prettier-formats the edited file; the sole always-exit-0
  hook (a formatter failure must never block work).
- **`stop-tests.mjs`** (Stop): runs the suite when `src/scripts/tests/data` are dirty and
  blocks the stop on red; in loop mode also blocks a stop with a dirty tree (atomic-commit
  rule). `stop_hook_active` guard prevents infinite loops.
- **Fail-closed (A1):** every guard hook wraps its logic in try/catch and exits 2
  (`HOOK_ERROR: fail-closed`) on any internal error — a broken guard blocks, never silently
  allows. Quotes are stripped from every token once at tokenization so ordinary quoting can't
  dodge flag classification.

Enforced by `tests/hooks.test.ts` (216 cases, exit-code-exact) in CI, plus one-time live
provocations recorded in PROGRESS.md (T2).

### 2. Guardrails — minimal `main` ruleset (`protect-main`, id 18764742)

`non_fast_forward` + `deletion` blocks on `~DEFAULT_BRANCH`, via `gh api`. Deliberately **no
require-PR / required-checks** — those reject direct pushes and would kill trunk-based Rung 2.
The loop is fenced off trunk by the `CLAUDE_LOOP=1` push-to-main hook block + the PAT's lack of
any reason to touch main, not by a ruleset. Rung 2 (attended) still commits straight to main;
Rung 3 works only on `claude/<task>` and merges via morning PR review.

### 3. Rung 3 sandbox — plain Docker, single pinned image

- **Image:** `mcr.microsoft.com/playwright:v1.61.1-noble` (exact tag, anti-rug-pull; ships
  Node + Chromium + browser deps so C.1's Playwright E2E runs in-container) + `gh` +
  `@anthropic-ai/claude-code@2.1.206`, running as non-root `pwuser` (claude refuses
  `--dangerously-skip-permissions` as root). **PIN OF RECORD: `v1.61.1-noble` → Phase C.1's
  `@playwright/test` devDep MUST be `1.61.1`.**
- **Isolation:** the host working copy is **never mounted**. Each iteration clones fresh from
  GitHub, checks out `claude/<task>`, works, and the driver pushes — disk state lives only in
  committed PROGRESS.md (the Ralph contract). Container is `--rm --init --ipc=host`.
- **Minimum credentials** (host `~/.claude-loop.env`, `--env-file` only, never committed,
  never read into a session): `CLAUDE_CODE_OAUTH_TOKEN` (`claude setup-token`, subscription,
  no API billing) + `GH_TOKEN` (fine-grained PAT, single repo, Contents R/W + PRs R/W +
  Metadata R, 30-day expiry, **no `workflow` permission** — GitHub then rejects any push
  touching `.github/workflows/`, a free guard against the loop editing its own CI). The token
  is supplied to git via the `gh` credential helper (never in the clone URL or `.git/config`),
  and the model subprocess runs under `env -u GH_TOKEN` (least privilege).
- **Rejected alternatives:** container-use/Dagger (MCP + engine to solve what `docker run
--rm` already solves for a single-repo loop); WSL2-direct (`/mnt/c` exposes the whole host
  filesystem — not a sandbox); Claude Code native sandboxing (Linux/macOS only, N/A on
  Windows). Network egress firewalling deferred — credential scoping is the real boundary at
  this budget.

### 4. Loop driver — `scripts/loop/loop.sh` (host, Git Bash) + `entry.sh` (container)

Preflight (docker up, host tree clean, latest main CI = success, tokens valid in-container) →
capped iterations → between iterations read the halt signal from the **iteration's commit
subject** (`LOOP:HALT …` — a per-commit signal that never goes stale and can't collide with
prose) → stop on sentinel / cap / two consecutive failures → open a PR. Windows note: pass the
entrypoint as `//entry.sh` (MSYS rewrites a leading-slash arg into a Windows path).

### 5. Browser tooling

`@playwright/test` (runner + CLI), installed lazily at C.1 (version-matched to the image tag).
No Playwright MCP (killed Phase 0). Chrome DevTools MCP not adopted — conditional reopen only
if console/network/perf debugging is proven necessary.

### 6. Cost / model tiering

Planning, architecture, checkpoints, reviews, and judgment gates: strongest model. **Standing
default for execution and loop iterations: Sonnet** (`--model sonnet --max-turns 80`). First
overnight runs capped at 6 iterations; raise only after two clean overnights. Check `/usage`
(>40% weekly headroom) and start after a 5-hour-window reset before any overnight run.

## Verification (all green before first unattended use)

V1 hook unit matrix (216 in CI) · V2 live Windows provocations · V3 ruleset live (GH013 on
force-push + delete) · V4 container + auth + browser · V5 committed hook denies inside the
container under `--dangerously-skip-permissions` · V6 supervised 3-iteration dry-run: fresh
context each, one task, atomic commit, commit-subject halt, PR #1 opened + CI green, **main
untouched**. Full evidence in HQ `research/phase-3/notes.md`.

The T7.5 scoped review (2 rounds) found 9 defects — including a real credential-in-`.git/config`
leak and 2 guard bypasses the first fix pass introduced — all fixed test-first before the
dry-run. The T8 dry-run itself surfaced a Windows-host MSYS path bug the static review couldn't;
the 2-failure breaker caught it with no trunk impact.

## Appendix — "Do before bed" checklist (Rung 3/4 launches)

1. `gh run list --limit 1` → latest main CI = success (never launch onto a red trunk).
2. `git status --porcelain` empty in both repos.
3. PROGRESS.md `Next action` names exactly the loop's task; its ROADMAP AC is command +
   expected output (SUPERVISED tasks never loop).
4. `scripts/loop/PROMPT.md` present; task/branch correct.
5. Tokens alive: `gh api repos/mekyle-s/rent-yield-screener` → 200; one-shot container
   `claude -p "reply OK"` → OK. (PAT expires 30 days from creation — rotate before.)
6. `/usage` headroom OK (>40% weekly; start after a window reset).
7. `docker info` exits 0.
8. Launch `./scripts/loop/loop.sh claude/<task> 6`; **watch iteration 1 end-to-end** before
   walking away.
9. Morning: PROGRESS delta → PR diff → CI status → merge (`gh pr merge --rebase`) or triage.
   Never merge a red PR.

(Checklist items 1, 2, 5, 7 are automated by `loop.sh --preflight-only`.)
