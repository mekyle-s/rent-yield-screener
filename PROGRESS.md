<!-- LOADS: first thing, every autonomous loop iteration. State lives on disk because
     each iteration resets context. RULE: ONE task per iteration → update this file →
     atomic commit → exit. -->

# Progress — Rent-Yield Screener

## Active task
B.3 — Fetch-integrity + validation gate (test-first)

## Status
**PHASE B IN PROGRESS at Rung 1 (watched).** B.1 ✅ (2026-07-07). Phase B plan approved with 5 notes: (1) invalid fixtures → tests/fixtures/invalid/ [ROADMAP amended]; (2) B.2 CI AC via `gh run watch --exit-status` [amended]; (3) B.4 map:verify exact output contract `PATHS=<n> JOINED=<n> OK` / `MAP_VERIFY:` stderr [amended]; (4) crosswalk source + coverage stated to Mekyle BEFORE building, unmatched list shown, never silent drops; (5) /code-review on full phase diff before Phase B exit checkpoint.

## Last action & result
2026-07-07: B.2 done (B.1 done earlier same day). 18 transform tests red→green; golden committed (15 metros, 14 zips, snapshotMonth 2026-05); double-run + golden diffs empty; CI green ON UBUNTU incl. golden-diff step (run 28903..., conclusion success) — cross-platform byte-identity proven. DATA FINDING: ZIP 92662 (Balboa Island) has legit P2R=182.9 (thin ZORI in luxury ZIPs) → ZIP-level RATIO_RANGE bounds are a B.3 design decision for Mekyle.

## Next action
B.3 — failing tests first for validators + error tokens (SCHEMA_VIOLATION:/ROWCOUNT_ANOMALY:/RATIO_RANGE:/FETCH_INTEGRITY: — exactly one per failure, stderr, exit 1). Invalid fixtures in tests/fixtures/invalid/ (amended path). DECISION NEEDED from Mekyle: RATIO_RANGE bounds — metro band tight, but ZIP-level must not fail on real outliers like 92662. ACs: etl:validate bad-schema → exit=1 + token; etl:fetch --url DOES-NOT-EXIST → exit 1 naming URL.

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
