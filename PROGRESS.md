<!-- LOADS: first thing, every autonomous loop iteration. State lives on disk because
     each iteration resets context. RULE: ONE task per iteration → update this file →
     atomic commit → exit. -->

# Progress — Rent-Yield Screener

## Active task
Phase B exit gate — /code-review on full phase diff, CI full-pipeline green, user checkpoint

## Status
**PHASE B IN PROGRESS at Rung 1 (watched).** B.1 ✅ (2026-07-07). Phase B plan approved with 5 notes: (1) invalid fixtures → tests/fixtures/invalid/ [ROADMAP amended]; (2) B.2 CI AC via `gh run watch --exit-status` [amended]; (3) B.4 map:verify exact output contract `PATHS=<n> JOINED=<n> OK` / `MAP_VERIFY:` stderr [amended]; (4) crosswalk source + coverage stated to Mekyle BEFORE building, unmatched list shown, never silent drops; (5) /code-review on full phase diff before Phase B exit checkpoint.

## Last action & result
2026-07-07: B.3 + B.4 done same session (all ACs green, CI green each push). B.3: validators test-first, RATIO_RANGE = distribution check (Mekyle-approved: metro hard [5,60], ZIP finite+positive with median in [5,60]). B.4: crosswalk from Zillow's own CountyCrossWalk_Zillow.csv (ID concordance, no name-matching, 894/894 live coverage, 0 unmatched — note-4 statement given); cb_2023 boundaries 935 features committed; map:build/map:verify meet the exact amended contract (PATHS=15 JOINED=15 OK; corruption test correctly named the missing metro). Security: mapshaper's file-type advisories killed via npm override file-type@22.0.1 — npm audit 0 vulns, conversion verified post-override.

## Next action
Phase B exit: CI now also rebuilds the SVG on ubuntu and diffs the committed copy (full-pipeline determinism). Then /code-review over 992019b..HEAD (approval note 5), findings to Mekyle, checkpoint.

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
