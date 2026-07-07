<!-- LOADS: first thing, every autonomous loop iteration. State lives on disk because
     each iteration resets context. RULE: ONE task per iteration → update this file →
     atomic commit → exit. -->

# Progress — Rent-Yield Screener

## Active task
B.2 — Transform: CSV → canonical P2R latest.json (test-first) + committed golden snapshot

## Status
**PHASE B IN PROGRESS at Rung 1 (watched).** B.1 ✅ (2026-07-07). Phase B plan approved with 5 notes: (1) invalid fixtures → tests/fixtures/invalid/ [ROADMAP amended]; (2) B.2 CI AC via `gh run watch --exit-status` [amended]; (3) B.4 map:verify exact output contract `PATHS=<n> JOINED=<n> OK` / `MAP_VERIFY:` stderr [amended]; (4) crosswalk source + coverage stated to Mekyle BEFORE building, unmatched list shown, never silent drops; (5) /code-review on full phase diff before Phase B exit checkpoint.

## Last action & result
2026-07-07: B.1 done. All 4 Zillow URLs live + headers verified (incl. `mfr` ZORI names). Fixtures committed (18/17/15/14 rows), rule-based trimmer committed for regeneration. Edge cases verified present: SizeRank-0 national row (both metro files), 5 leading-zero ZIPs, ZHVI-only metros (394310, 394316) + ZORI-only metro (394603), ZHVI-only ZIP (399514), 3 blank-trailing-month rows. ACs: dry-run lists 4 URLs exit 0; fixture count = 4. Raw CSVs in gitignored .cache/ (constitution V — never committed).

## Next action
B.2 — write FAILING Vitest suite first (regex date-col detection metro=5/ZIP=9, melt, null preservation, leading-zero strings, SizeRank-0 exclusion, inner join, shared-latest-month, ratio ZHVI/(ZORI×12), div-by-zero, RegionID sort, fixed precision, lexical dates, LF). Then implement src/etl/, `npm run etl`, hand-reviewed golden → tests/golden/, CI golden-diff step. ACs: `npm test -- transform` pass; etl+diff vs golden empty; double-run diff empty; `gh run watch --exit-status` → 0.

## Learnings / guardrails
- ETL determinism is constitutional (VI): always compare double-run outputs with `diff -r` before claiming done.
- Attribution is CI-asserted, not remembered (constitution V).

## Blockers / open questions
- ~~gh CLI not installed~~ RESOLVED: gh 2.96.0 present (verified 2026-07-07).
- Task C.4 (SEO scale) blocked on Mekyle's Keywords Everywhere export → judged by pre-registered rule.
- B.4 crosswalk source must be stated to Mekyle before building (approval note 4).

## Loop control
Iteration: 1 / 25 · Stop condition: Phase B exit (pipeline green in CI on fixtures, byte-identical re-run) — /code-review on phase diff, then user checkpoint
