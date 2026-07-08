<!-- LOADS: first thing, every autonomous loop iteration. State lives on disk because
     each iteration resets context. RULE: ONE task per iteration → update this file →
     atomic commit → exit. -->

# Progress — Rent-Yield Screener

## Active task
**PHASE B EXIT — FIXES DONE, RE-REVIEWED, CI GREEN, AWAITING CHECKPOINT.** All 10 blocking review findings + 2 flagged below-cap items fixed (test-first, one atomic commit each). A single-pass correctness re-review of the fix diff (40cae46..HEAD, no swarm) found ONE new gap — now fixed (c9c9c16): the finding-#5 `--flag=value` support let the csvPaths filter swallow a positional CSV path after an equals-form flag (e.g. `--min-metros=500 file.csv`), silently entering default mode and validating the wrong files at exit 0. Regression test + one-line fix. Full AC suite + npm test (51) + check (0/0/0) + double-run determinism green; CI green (run 28923538522, exit 0, sha c9c9c16). Stopped before the exit checkpoint per instructions.

Findings — all FIXED (regression test → fix → atomic commit each; see git log fa78ca3..HEAD):
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

## Status
**PHASE B IN PROGRESS at Rung 1 (watched).** B.1 ✅ (2026-07-07). Phase B plan approved with 5 notes: (1) invalid fixtures → tests/fixtures/invalid/ [ROADMAP amended]; (2) B.2 CI AC via `gh run watch --exit-status` [amended]; (3) B.4 map:verify exact output contract `PATHS=<n> JOINED=<n> OK` / `MAP_VERIFY:` stderr [amended]; (4) crosswalk source + coverage stated to Mekyle BEFORE building, unmatched list shown, never silent drops; (5) /code-review on full phase diff before Phase B exit checkpoint.

## Last action & result
2026-07-07: B.3 + B.4 done same session (all ACs green, CI green each push). B.3: validators test-first, RATIO_RANGE = distribution check (Mekyle-approved: metro hard [5,60], ZIP finite+positive with median in [5,60]). B.4: crosswalk from Zillow's own CountyCrossWalk_Zillow.csv (ID concordance, no name-matching, 894/894 live coverage, 0 unmatched — note-4 statement given); cb_2023 boundaries 935 features committed; map:build/map:verify meet the exact amended contract (PATHS=15 JOINED=15 OK; corruption test correctly named the missing metro). Security: mapshaper's file-type advisories killed via npm override file-type@22.0.1 — npm audit 0 vulns, conversion verified post-override.

## Next action
Present the Phase B exit checkpoint to Mekyle (fix pass + re-review both complete). Evidence: all B.1–B.4 ACs pass locally (fetch --dry-run 4 URLs; fixture count 4; transform 21 tests; golden diff clean; bad-schema → SCHEMA_VIOLATION: exit 1; fetch 404 → FETCH_INTEGRITY: exit 1; map PATHS=15 JOINED=15 OK), npm test 51 pass, npm run check 0/0/0, double-run ETL + map byte-identical, CI run 28923538522 green (--exit-status 0, sha c9c9c16). On approval → Phase C (C.1 blocked by B.2+B.4, now unblocked).
- NEW GUARDRAIL (Mekyle, 2026-07-08): before launching >5 subagents OR any full-codebase/full-phase review, state estimated scope and WAIT for approval (saved to memory: subagent-scope-approval).

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
Iteration: 1 / 25 · Stop condition: Phase B exit (pipeline green in CI on fixtures, byte-identical re-run) — /code-review on phase diff, then user checkpoint
