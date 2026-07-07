<!-- LOADS: first thing, every autonomous loop iteration. State lives on disk because
     each iteration resets context. RULE: ONE task per iteration → update this file →
     atomic commit → exit. -->

# Progress — Rent-Yield Screener

## Active task
A.2 — CI pipeline green on push (workflow file committed; needs GitHub remote)

## Status
A.1 DONE — evidence: `npm test` → 1 passed · `npm run build` → dist/index.html · `npm run check` → 0 errors

## Last action & result
2026-07-07: Astro skeleton hand-rolled (package.json, config, index page, smoke test, .gitattributes LF-enforcement, CI workflow incl. attribution-compliance gate). All A.1 ACs pass locally.

## Next action
Mekyle creates GitHub remote (gh CLI not installed) → push → verify green Actions run (A.2 AC) → connect Cloudflare Pages (A.3).

## Learnings / guardrails
- ETL determinism is constitutional (VI): always compare double-run outputs with `diff -r` before claiming done.
- Attribution is CI-asserted, not remembered (constitution V).

## Blockers / open questions
- Task A.3 + GitHub remote need Mekyle: GitHub repo creation (gh CLI not installed), Cloudflare account auth.
- Task C.4 (SEO scale) blocked on Mekyle's Keywords Everywhere export → judged by pre-registered rule.

## Loop control
Iteration: 0 / 25 · Stop condition: Phase A exit (skeleton live + green CI) — then user checkpoint
