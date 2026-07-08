<!-- LOADS: first thing, every autonomous loop iteration. State lives on disk because
     each iteration resets context. RULE: ONE task per iteration → update this file →
     atomic commit → exit. -->

# Progress — Rent-Yield Screener

## Active task
**PHASE B EXIT BLOCKED** — code review (reviews/phase-b-code-review.md) returned 10 blocking findings; fixes 1–10 required before the exit checkpoint.

Blocking findings (full detail + failure scenarios in reviews/phase-b-code-review.md):
1. scripts/map/build.ts:41 — BLOCKER: SVG polygons rendered as spherical complements (RFC 7946 winding vs d3-geo); committed map is visually garbage; map:verify blind to geometry
2. scripts/etl/validate.ts:39 — default validate mode exits 0 with zero inputs (vacuous pass)
3. src/etl/csv.ts:49 — Number(" ")→0 / Number("NA")→NaN breaks nulls-stay-null + latest-month selection
4. scripts/etl/build-crosswalk.ts:27 — generator invariant weaker than crosswalk test (CBSA global uniqueness)
5. scripts/etl/validate.ts:16 — NaN thresholds silently disable ROWCOUNT_ANOMALY; --flag=value form ignored
6. src/etl/validate.ts:70 — median([]) = NaN silently passes the ZIP distribution check
7. src/etl/csv.ts:39 — 0-byte CSV crashes parseCsv with opaque TypeError, no error token
8. scripts/map/verify.ts:25 — unguarded latest.json read breaks the MAP_VERIFY: token contract
9. scripts/etl/fetch.ts:90 — floating main() promise escapes the FETCH_INTEGRITY: contract
10. src/etl/transform.ts:43 — national-row filter keys on SizeRank not RegionID/RegionType (hardening)

Also fix alongside (below-cap but determinism/CI-relevant): trim-fixtures.ts:75 localeCompare sort; build.ts:16 fixture/live builds share the CI-diffed output path.

## Status
**PHASE B IN PROGRESS at Rung 1 (watched).** B.1 ✅ (2026-07-07). Phase B plan approved with 5 notes: (1) invalid fixtures → tests/fixtures/invalid/ [ROADMAP amended]; (2) B.2 CI AC via `gh run watch --exit-status` [amended]; (3) B.4 map:verify exact output contract `PATHS=<n> JOINED=<n> OK` / `MAP_VERIFY:` stderr [amended]; (4) crosswalk source + coverage stated to Mekyle BEFORE building, unmatched list shown, never silent drops; (5) /code-review on full phase diff before Phase B exit checkpoint.

## Last action & result
2026-07-07: B.3 + B.4 done same session (all ACs green, CI green each push). B.3: validators test-first, RATIO_RANGE = distribution check (Mekyle-approved: metro hard [5,60], ZIP finite+positive with median in [5,60]). B.4: crosswalk from Zillow's own CountyCrossWalk_Zillow.csv (ID concordance, no name-matching, 894/894 live coverage, 0 unmatched — note-4 statement given); cb_2023 boundaries 935 features committed; map:build/map:verify meet the exact amended contract (PATHS=15 JOINED=15 OK; corruption test correctly named the missing metro). Security: mapshaper's file-type advisories killed via npm override file-type@22.0.1 — npm audit 0 vulns, conversion verified post-override.

## Next action
Fix review findings 1–10 (+ the two flagged below-cap items), test-first where a failing test can encode the bug (esp. #1: map:verify geometry guard — no path bbox may span the full viewBox — must fail BEFORE the winding fix and pass after). Re-run all Phase B ACs + full CI, then present the exit checkpoint to Mekyle.

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
