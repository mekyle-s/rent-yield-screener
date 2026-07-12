<!-- LOADS: first thing, every autonomous loop iteration. State lives on disk because
     each iteration resets context. RULE: ONE task per iteration → update this file →
     atomic commit → exit. -->

# Progress — Rent-Yield Screener

## Active task

**PHASE C ACTIVE — plan v3 APPROVED by Mekyle 2026-07-11 (plan checkpoint gate PASSED; +1 approved amendment: C.1's Playwright AC prepends `npm run build &&` with webServer preview-only/`reuseExistingServer: true`).** Order: C.0 ✅ ea06aee → C.1 ✅ b3ac3d9 → C.2a ✅ (this commit) → C.2 (Rung-3 candidate, NEXT) → C.3 (Rung-3 candidate) → C.3b (ATTENDED CI edit); C.4 independent + BLOCKED on the GKP export. Tasks + exact ACs: ROADMAP.md § Phase C. Phase INFRA closed 2026-07-11 (Rung-3 infra-proven, `decisions/0005-autonomy-infra.md`); first overnight Rung-3 run requires the ADR-0005 bedtime checklist + watching iteration 1.

<!-- T8 RESULT (2026-07-11): dry-run PASSED all V6 criteria. Attempt-1 (2026-07-10) exposed+fixed a Git-Bash MSYS path-mangling bug (`/entry.sh`→`//entry.sh`, commit 72fd660); the 2-consecutive-failure breaker stopped it cleanly, no branch/PR/trunk touched — the Windows-host integration bug the static/Linux T7.5 review couldn't catch. Relaunch: 3 iterations on claude/dry-run, --model sonnet. Iter1 → #14 (dedupe splitCsvLine), atomic commit 2ab6ef6, one-task-only, updated Next-action to #19, exited; driver pushed+verified. Iter2 → #19 (Promise.all in fetch.ts), commit 7ec1d4e. Iter3 → empty queue, no code change, commit 5e5a1c5 subject `LOOP:HALT dry-run queue complete`; driver read the commit-subject sentinel and stopped. PR #1 opened; PR CI green (verify pass + Cloudflare Pages preview pass). main UNTOUCHED (still 72fd660). Both diffs reviewed correct. Fresh-context handoff via committed PROGRESS proven across all 3 iterations. -->

Task list + ACs live in ROADMAP.md § Phase INFRA (persisted first, commit 811465f). Model plan this week: attended T1–T7 + T7.5 review on strong model (headroom exception); ADR-0005 records Sonnet as standing default; T8 loop `--model sonnet` exactly as it runs overnight.

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

**PHASE C: C.0 ✅ (ea06aee, CI green) · C.1 ✅ (this commit) · C.2a next (attended).** Phase INFRA record (T1–T9, hooks 110→216 matrix, Rung-3 proven): `decisions/0005-autonomy-infra.md` + git history of this file.
<details><summary>Phase INFRA T1 record (superseded)</summary>
**PHASE INFRA T1 COMPLETE ✅ — hooks layer live in repo (not yet loaded in a session; T2 verifies wiring).** Test-first: 82-case matrix RED → 4 hooks implemented → GREEN; Mekyle's mid-task additions (bare-force push, PowerShell Remove-Item/aliases, iwr/irm→iex pipes) added RED (26 fail) → pre-bash.mjs extended → 110/110 GREEN. `.claude/settings.json` committed wiring pre-bash + pre-edit + stop-tests (post-edit wired at T3); settings.local.json pruned 55→12 durable patterns. Phase B record: closed 2026-07-08, CI green c9c9c16 (see git history of this file for the fix-pass ledger).

</details>

## Last action & result

2026-07-11: **C.1 SVG choropleth page + searchable metro index DONE (attended Rung 2), all ACs green with output shown in-session:**

1. `@playwright/test` pinned EXACTLY `1.61.1` (ADR-0005 image match); one-time `npx playwright install chromium` done on this machine; `playwright.config.ts` webServer preview-only (`npm run preview`, `reuseExistingServer: true` — plan amendment); `vitest.config.ts` excludes `tests/e2e/**`.
2. `npm run build && npx playwright test --reporter=line` → 2 passed, exit=0 (spec: exactly 15 `path[data-region-id]`; click reveals ratio in-page in `#metro-panel`; search filter narrows to 1 and restores 15).
3. **AC amendment (Mekyle-approved mid-task):** inline-SVG count AC now matches the attribute form `grep -o 'data-region-id="' dist/index.html | wc -l` → 15 — the bare string also appears 3× in legitimate page CSS/JS (hover selector, event delegation), which yielded 18. ROADMAP updated.
4. `npm test` → 216/216, exit=0 (vitest untouched by e2e specs); `npm run check` → 0 errors; `npx prettier --check .` → clean.
5. UI protocol: national-view screenshot captured by the spec (`test-results/national-view.png`, gitignored) + second FRESH-CONTEXT pass → **PASS, choropleth visibly colored** (5-bin ramp differentiation confirmed; minor notes: no basemap by design; ratios now displayed `.toFixed(2)` after the pass flagged mixed precision).
6. Page reads the committed fixture snapshot via `src/lib/data.ts` (single swap point → `data/latest.json` in Phase D, which is gitignored as the LIVE location); the B.4 SVG is inlined verbatim from `data/map/metro-map.svg`; skeleton's non-deterministic `new Date()` stamp removed; index links pre-create `/metro/<slug>/` hrefs via `src/lib/slug.ts` (C.2 reuses).

## Next action

**C.2a DONE (this commit) — next: C.2 metro page template (Rung-3 loop candidate; if run overnight it is the FIRST real Rung-3 run: ADR-0005 bedtime checklist + watch iteration 1 end-to-end; attended execution also fine).** Exact spec + ACs in ROADMAP § Phase C. After C.2: C.3 (Rung-3 candidate) → C.3b (ATTENDED). C.4 SUPERVISED SEO-scale runs on the free Google Keyword Planner export at `../Bus_Idea_Project/research/phase-2/gkp-export.csv` (lower-bound rule) — blocked until Mekyle produces that file. **C.2 executor note:** `dist/index.html` already contains EXACTLY ONE `data-snapshot-month="2026-05"` (the inlined SVG root attribute) — do NOT add a second; the C.2 AC counts exactly 1 (clarified in ROADMAP at C.1 execution). Findings 13,15–18,20,21 remain queued for Phase 5.

<details><summary>T9 close-out record (2026-07-11) — Phase INFRA done</summary>
Written: product `decisions/0005-autonomy-infra.md` (full design + pinned tag v1.61.1-noble + bedtime checklist + Sonnet-default cost table); HQ `research/leads.md` Phase 3 CLOSED (TDD Guard KILL, container-use KILL, Chrome DevTools MCP NOT ADOPTED-conditional, @playwright/test ADOPTED); HQ `research/phase-3/notes.md` (V1–V6 evidence + review + integration bugs + cost actuals); CLAUDE.md `npm run check` wording fixed (typecheck + separate prettier --check); ROADMAP T1–T9 checked; HQ PROGRESS.md updated at phase close.
</details>

<details><summary>T8 dry-run task records (#14, #19 — landed on main via merged PR #1)</summary>

1. ~~Finding #14~~ ✅ DONE (2026-07-11): `scripts/etl/trim-fixtures.ts` local `fields()` (verbatim copy of `splitCsvLine`) removed; now imports `splitCsvLine` from `../../src/etl/csv` (matches `build-crosswalk.ts` pattern) and calls it in `load()`. No behavior change. AC proof: `grep -n "function fields" scripts/etl/trim-fixtures.ts` → no match, exit 1; `npm test` → 216/216 passed, exit 0; `npm run check` → 0 errors, 0 warnings, exit 0.
2. ~~Finding #19~~ ✅ DONE (2026-07-11): `scripts/etl/fetch.ts` main()'s default-mode loop now fetches all 4 SOURCES concurrently via `Promise.all(SOURCES.map(...))`, then writes/logs in a `SOURCES.forEach` — `Promise.all` preserves input order in its results array regardless of completion order, so file writes and console output stay in SOURCES order even though the 4 requests race. `fail()` still calls `process.exit(1)` synchronously from inside `fetchOne`, so the single-`FETCH_INTEGRITY:`-token-then-exit contract (finding #9) is unchanged — the first rejection halts the process before a second can emit. No new test added: the existing finding-#9 CLI test (`tests/cli.test.ts`) forces its failure before the fetch loop even starts (mkdirSync ENOTDIR) so it's unaffected by this refactor and continues to cover the error-token contract; no test exercised the live-network success path before this change either (repo convention avoids real network in the suite — see finding #9's offline trick), so there is no coverage to preserve there, matching the finding #14 precedent (pure behavior-preserving refactor, no new test). AC proof: `npm test` → 216/216 passed, exit 0; `npm run check` → 0 errors, 0 warnings, exit 0; `npx prettier --check scripts/etl/fetch.ts` → "All matched files use Prettier code style!". Manual sanity run (not part of the committed suite) against live Zillow URLs: `npx tsx scripts/etl/fetch.ts --out <tmp>` → all 4 files fetched in 6.8s wall time (vs. sequential ~4x a single request), console output printed in exact SOURCES order (zhvi-metro, zhvi-zip, zori-metro, zori-zip), exit 0.
3. ✅ Queue confirmed empty (2026-07-11, this iteration) → halting per contract, no code changes. Commit subject begins `LOOP:HALT dry-run queue complete`.

These proved the loop MECHANICS (fresh context, ONE task, PROGRESS updated, atomic commit, clean exit, commit-subject halt, PR) on `--model sonnet`. PR #1 reviewed correct + merged to main (7e440c0). Findings 13,15–18,20,21 remain queued for Phase 5.
</details>

**T7.5 record — scoped review gate (A5), APPROVED by Mekyle, 2 rounds.** Round 1 (reviewer aaa9a7ec9268959c3, T1–T7 diff): 6 blocking + 1 below-cap. All 7 fixed test-first, 1 atomic commit each (02734be F1 Bash-side guardrail-write deny via shared protected.mjs; 4e1264d F2 refs/heads/main; a9ee625 F3 --mirror/--all; 069528f F4 quoted values; 71e2a3f F5 \\rm//bin/rm + pipe-fed delete; f45a7c2 F6 no PAT in git URL — gh helper + env -u GH_TOKEN, proven in-container; 2fc005b F7 halt sentinel → commit-subject). Round 2 re-review (reviewer aa8b5f16b5bb2b849, fix diff 1d38cc3..2fc005b): found 2 NEW blocking bugs the fix pass introduced — quotes stripped at value sites but NOT flag-classification sites (`git push "--force" origin main` slipped), and redirect check saw only the first `>` (`echo a>safe && echo b>.claude/x` slipped). Both fixed b8c84f2 test-first (strip quotes globally at tokenization; scan ALL redirects). npm test 216, prettier clean, CI green on b8c84f2. **Round-2 confirmation PASSED (same re-reviewer, 2026-07-10): both new blocking bugs VERIFIED-FIXED, no regression, 0 blocking — clean to proceed to T8.** T7.5 CLOSED. Net: 9 findings fixed test-first across 2 rounds, hook matrix 82→216 tests.

**T7 record — loop driver + smoke GREEN (2026-07-10).** `loop.sh` (preflight / capped iterations / LOOP:HALT sentinel via `git show FETCH_HEAD:PROGRESS.md` / 2-consecutive-failure stop / PR create) + `PROMPT.md` (one-task contract, halt conditions, hook-enforced boundaries), commit 49d1997. ACs: `--preflight-only` → ALL GREEN exit 0 (docker, env-file presence-only, host clean, main CI success, in-container gh+claude token ping). In-container smoke: hooks matrix 110/110 on Linux; `npx playwright screenshot` of `astro preview` → `/tmp/shot.png` exists; **V5 LIVE: `claude -p` under `--dangerously-skip-permissions` + `CLAUDE_LOOP=1` attempted `git push origin main` → denied pre-execution by committed settings.json** ("loop iterations may not push to main/master — claude/* branches only"). **FOUND+FIXED by smoke: Playwright image runs as root and claude refuses `--dangerously-skip-permissions` as root → Dockerfile now `USER pwuser` + chown'd `/work`; full smoke re-run green as pwuser.**

**T6 record — credentials LIVE (2026-07-10, supervised).** `~/.claude-loop.env` in place (fine-grained PAT single-repo Contents+PRs R/W, Metadata R, 30d, NO workflow perm + `claude setup-token` OAuth). **STANDING RULE (Mekyle): never print/cat/read that file into a session — `--env-file` pass-through only; on probe failure report the error only (saved to memory: env-file-never-read).** All 3 ACs green in one container run: `gh api -i repos/mekyle-s/rent-yield-screener` → HTTP/2.0 200 OK; `claude -p "reply with exactly: OK"` → OK (subscription OAuth headless-confirmed); clone via `gh auth setup-git` credential helper (never token-in-URL — no leak path in errors) + `claude/t6-probe` push OK + remote branch deleted (cleanup OK).

**T5 record — sandbox image BUILT (2026-07-10).** `scripts/loop/Dockerfile`: base **pinned `mcr.microsoft.com/playwright:v1.61.1-noble`** — verified current at T5 (plan expected v1.61.0; a patch landed; A4 rule applied). **PINNED TAG FOR ADR-0005: v1.61.1-noble → C.1's `@playwright/test` devDep must be 1.61.1.** Plus gh (apt repo, keyring method) + `@anthropic-ai/claude-code@2.1.206` (npm -g, exact). `entry.sh`: fresh clone via PAT → claude/* branch guard (FATAL on non-claude branch) → `npm ci` → `CLAUDE_LOOP=1` + `claude -p --model sonnet --max-turns 80 --dangerously-skip-permissions` → dirty-tree FATAL → deterministic driver-side push + verify. LF-only verified (CRLF count 0). AC: `docker build` exit 0; in-container versions: claude 2.1.206 / gh 2.96.0 / git 2.43.0 / playwright 1.61.1 (matches tag).

**T4 record — main ruleset LIVE (2026-07-10).** Ruleset `protect-main` id 18764742, enforcement active, rules `[{deletion},{non_fast_forward}]` on `~DEFAULT_BRANCH`, created via `gh api` POST. Enforcement PROVEN, not assumed: `git push origin :main` rejected (but that message is default-branch semantics, so:) probe branch temporarily included in the ruleset → force-push → **GH013 "Cannot force-push to this branch"**; deletion → **GH013 "Cannot delete this branch"**; ruleset restored to main-only, probe branch then deleted cleanly (restore-then-success re-attributes the block to the ruleset). No require-PR — trunk-based Rung 2 intact. Note: a stray empty probe commit briefly existed on local main (wrong-branch slip), reset before any push; local main == origin/main verified.

**T3 record — RUNG 2 TRIAL PASSED (2026-07-10, /goal session, Mekyle at desk).** Goal condition met exactly: `npx prettier --check .` → "All matched files use Prettier code style!", exit 0; CI run on 2340c28 green END-TO-END including golden-diff (✓ ETL determinism) and map-diff (✓ Map determinism) — the one-time reformat (40 files incl. Mekyle's editor diff to transform.ts) provably touched zero snapshot bytes. Local pre-push battery: 161 tests, check 0 errors, `diff -r /tmp/t3-out tests/golden/` clean, SVG rebuild byte-identical. prettier 3.9.5 + prettier-plugin-astro 0.14.1 exact-pinned (plugin = stated scope addition: `--check .` cannot pass on .astro files without it). post-edit.mjs wired + live-verified: ugly probe file came back Prettier-formatted on disk via PostToolUse.

- GUARDRAIL (Mekyle, 2026-07-08): before launching >5 subagents OR any full-codebase/full-phase review, state estimated scope and WAIT for approval (saved to memory: subagent-scope-approval).

## Learnings / guardrails

- ETL determinism is constitutional (VI): always compare double-run outputs with `diff -r` before claiming done.
- Attribution is CI-asserted, not remembered (constitution V).
- NEVER pipe verification commands through `tail`/`head` when claiming a pass — it hid 3 local typecheck errors that then failed CI (B.2). Always show the exit code (`${PIPESTATUS[0]}` if piped).
- ZIP-level Zillow data has legitimate extreme outliers (thin ZORI samples in luxury ZIPs) — hard range asserts on ZIP records will falsely fail live runs.
- Rung-3 loop (ADR-0005): host-side driver is `./scripts/loop/loop.sh claude/<task> <cap>` from Git Bash; run ADR-0005's bedtime checklist first. Anything needing 100% enforcement is a HOOK, not a prompt rule (prompt rules ~70%). Adversarial review + a supervised dry-run catch different bug classes — the review found a credential leak + guard bypasses; the dry-run found Windows-host MSYS mangling the review couldn't. Both are mandatory before trusting an unattended run.

## Blockers / open questions

- ~~gh CLI not installed~~ RESOLVED: gh 2.96.0 present (verified 2026-07-07).
- Task C.4 (SEO scale) blocked on the free Google Keyword Planner export at `../Bus_Idea_Project/research/phase-2/gkp-export.csv` → judged by the pre-registered lower-bound rule.
- B.4 crosswalk source must be stated to Mekyle before building (approval note 4).

## Loop control

**Phase C plan v3 APPROVED 2026-07-11 — plan gate PASSED.** Rung 3 is available for C.2 and C.3 ONLY, each launch preceded by the ADR-0005 bedtime checklist with iteration 1 watched end-to-end. C.1 is ATTENDED — never loop it (UI judgment call). SUPERVISED/attended tasks (C.2a, C.3b, C.4) never loop — CI edits are hook- and PAT-blocked in loop mode by construction. Next stop condition: **C-gate** — deployed site + screenshot verification + Mekyle review.
