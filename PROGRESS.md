<!-- LOADS: first thing, every autonomous loop iteration. State lives on disk because
     each iteration resets context. RULE: ONE task per iteration → update this file →
     atomic commit → exit. -->

# Progress — Rent-Yield Screener

## Active task
**PHASE B CLOSED — exit checkpoint APPROVED by Mekyle 2026-07-08. Rung 2 unlocked. Next gate = Phase 3 plan checkpoint.** All B.1–B.4 ACs green, full code review + fix pass + re-review complete, CI green (run 28923538522, sha c9c9c16), double-run byte-identical. No work in flight; next iteration opens with the Phase 3 plan (present plan → Mekyle checkpoint BEFORE building).

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
**PHASE B COMPLETE ✅ (closed 2026-07-08). Now at Rung 2.** B.1–B.4 all done; exit condition met (pipeline green in CI on fixtures, byte-identical re-run) and Mekyle's exit checkpoint approved. Phase B plan's 5 approval notes all satisfied. Next gate before any Phase 3 build = **Phase 3 plan checkpoint** (present plan → wait for approval).

## Last action & result
2026-07-08: Phase B exit checkpoint APPROVED. Full /code-review of the phase diff → 10 blocking + 2 below-cap findings, all fixed test-first (12 commits); single-pass re-review of the fix diff found + fixed 1 more gap (c9c9c16). Closing evidence all green: npm test 51, check 0/0/0, B.1–B.4 ACs, double-run ETL+map byte-identical, CI run 28923538522 (sha c9c9c16, exit 0).

## Next action
Open the Phase 3 planning session: draft the Phase 3 plan (per ROADMAP — Phase C: Map + Pages, C.1 SVG choropleth page unblocked now that B.2+B.4 are done) and present it to Mekyle for the plan checkpoint BEFORE building anything. Findings 13–21 (below-cap cleanup/hardening) remain queued for Phase 5, not this gate.
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
Rung 2 (Phase B closed 2026-07-08). Next stop condition: **Phase 3 plan checkpoint** — draft the Phase C plan, present to Mekyle, WAIT for approval before building. No autonomous build past the plan gate.
