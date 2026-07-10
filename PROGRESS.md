<!-- LOADS: first thing, every autonomous loop iteration. State lives on disk because
     each iteration resets context. RULE: ONE task per iteration → update this file →
     atomic commit → exit. -->

# Progress — Rent-Yield Screener

## Active task

**PHASE INFRA (Playbook Phase 3) IN PROGRESS — plan APPROVED w/ amendments A1–A5 + full-send execution notes (Mekyle, 2026-07-10). T1 ✅ T2 ✅; next = T3 (Prettier = Rung 2 trial via /goal).** Task list + ACs live in ROADMAP.md § Phase INFRA (persisted first, commit 811465f). Model plan this week: attended T1–T7 + T7.5 review on strong model (headroom exception); ADR-0005 records Sonnet as standing default; T8 loop `--model sonnet` exactly as it runs overnight.

<details><summary>Phase B fix-pass record (all findings FIXED; test-first → fix → atomic commit each; git log fa78ca3..c9c9c16)</summary>
1. ✅ d424071 — winding fixed at source (build-boundaries.ts `-o gj2008` = CW/d3 rings) + map:verify geometry guard (no path bbox may span the viewBox) + tests/map.test.ts
2. ✅ 9f7d8a2 — validate default mode dies FETCH_INTEGRITY: on zero inputs (no vacuous pass)
3. ✅ ede3d0f — csv cells: trim, keep only finite Number, else null (" "→null, "NA"→null)
4. ✅ c4c15f4 — crosswalk generator enforces CBSA global uniqueness (1:1 both ways); --src/--out added
5. ✅ 71d36b2 — num() rejects NaN thresholds; flag() honors --flag=value
6. ✅ e64eb00 — median() throws on empty; distribution check skipped for zero zips
7. ✅ e47eb46 — parseCsv throws clear error on empty/headerless file
8. ✅ 7945d31 — map:verify latest.json read guarded → MAP_VERIFY: token
9. ✅ 39c5902 — fetch.ts res.text() guarded + main().catch(fail) → FETCH_INTEGRITY:
10. ✅ f472e71 — national row excluded by RegionID 102001 / RegionType country, not SizeRank

Below-cap, fixed alongside: 11 ✅ be62d8a (trim-fixtures lexical sort, not localeCompare); 12 ✅ 3653981 (fixture vs live map builds write DISTINCT files — committed metro-map.svg vs gitignored metro-map.live.svg; map:verify + CI + ROADMAP B.4 AC + .gitignore updated). Findings 13–21 remain queued (Phase 5 hardening / cheap cleanup) — see reviews/phase-b-code-review.md.

Re-review fix: c9c9c16 — finding-#5 `--flag=value` support let the csvPaths filter swallow a positional CSV path after an equals-form flag (`--min-metros=500 file.csv` → silent default mode, wrong files at exit 0). Regression test + one-line fix.
</details>

## Status

**PHASE INFRA T1 COMPLETE ✅ — hooks layer live in repo (not yet loaded in a session; T2 verifies wiring).** Test-first: 82-case matrix RED → 4 hooks implemented → GREEN; Mekyle's mid-task additions (bare-force push, PowerShell Remove-Item/aliases, iwr/irm→iex pipes) added RED (26 fail) → pre-bash.mjs extended → 110/110 GREEN. `.claude/settings.json` committed wiring pre-bash + pre-edit + stop-tests (post-edit wired at T3); settings.local.json pruned 55→12 durable patterns. Phase B record: closed 2026-07-08, CI green c9c9c16 (see git history of this file for the fix-pass ledger).

## Last action & result

2026-07-10: **T2 live hook verification PASSED — all provocations observed in the real session transcript** (correction to an earlier assumption: hooks in `.claude/settings.json` went live mid-session without a restart; `$CLAUDE_PROJECT_DIR` substitution works on Windows):
1. `rm -rf /nonexistent-hook-probe` (Bash tool) → `BLOCKED: recursive+force rm/Remove-Item pointed outside the repo`, tool call denied pre-execution.
2. `git push --force --dry-run origin main` → `BLOCKED: force-push targeting main/master` (probe carried `--dry-run` as a belt so even a hook failure couldn't publish).
3. `Remove-Item -Recurse -Force C:\nonexistent-hook-probe` via the **PowerShell tool** → same deny (matcher `Bash|PowerShell` wiring confirmed on both tools).
4. Deliberately red probe test (`tests/stop-probe.test.ts`) + stop attempt → **Stop hook refused the stop**: "Tests failing — fix before stopping (constitution: tests-must-pass)". Probe deleted (T2 artifact, not coverage), suite re-run: 161/161 green.
5. Organic bonus deny during T1's own AC run: pipe-to-shell pattern in an `echo`'d payload string → `BLOCKED: curl/wget/iwr/irm piped into a shell` (conservative string-matching, known+accepted behavior; hook-testing payloads go via files, not inline strings).
T1 (earlier same day): hooks layer test-first, 82 RED → GREEN, +28 Mekyle cases (bare-force push, PS Remove-Item aliases, iwr/irm→iex) 26 RED → 110/110 GREEN, committed ad0dd9e.

## Next action

**T3 — Prettier rollout = designated Rung 2 trial, via /goal, Mekyle at desk.** Goal condition: `npx prettier --check .` exits 0 AND CI green including golden-diff + map-diff steps. Scope: prettier devDep + `.prettierignore` (`data/`, `tests/golden/`, `tests/fixtures/`, `dist/`) + one-time reformat commit + CI check step + wire post-edit.mjs into settings.json. NOTE: an editor format-on-save diff to `src/etl/transform.ts` (pure formatting, Mekyle's editor) is sitting uncommitted in the working tree — T3's reformat commit absorbs it. Then T4 (ruleset), T5 (image), T6 (SUPERVISED credentials), T7 (loop.sh), T7.5 (scoped review gate, scope estimate + approval first), T8 (dry-run), T9 (close-out).

- GUARDRAIL (Mekyle, 2026-07-08): before launching >5 subagents OR any full-codebase/full-phase review, state estimated scope and WAIT for approval (saved to memory: subagent-scope-approval).

## Learnings / guardrails

- ETL determinism is constitutional (VI): always compare double-run outputs with `diff -r` before claiming done.
- Attribution is CI-asserted, not remembered (constitution V).
- NEVER pipe verification commands through `tail`/`head` when claiming a pass — it hid 3 local typecheck errors that then failed CI (B.2). Always show the exit code (`${PIPESTATUS[0]}` if piped).
- ZIP-level Zillow data has legitimate extreme outliers (thin ZORI samples in luxury ZIPs) — hard range asserts on ZIP records will falsely fail live runs.

## Blockers / open questions

- ~~gh CLI not installed~~ RESOLVED: gh 2.96.0 present (verified 2026-07-07).
- Task C.4 (SEO scale) blocked on Mekyle's Keywords Everywhere export → judged by pre-registered rule.
- B.4 crosswalk source must be stated to Mekyle before building (approval note 4).

## Loop control

Rung 2, Phase INFRA executing (plan approved 2026-07-10). Per-task rule: end with AC command + real output in chat, ONE atomic commit, PROGRESS.md updated. Stop conditions ahead: T6 SUPERVISED (Mekyle creates PAT + setup-token) · T7.5 scope estimate → WAIT for approval · T8 watched live · Phase INFRA exit = V1–V6 green + T7.5 passed, then Phase C plan checkpoint. First overnight run is a Phase C decision, never launched from this phase.
