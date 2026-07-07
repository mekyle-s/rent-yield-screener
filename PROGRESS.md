<!-- LOADS: first thing, every autonomous loop iteration. State lives on disk because
     each iteration resets context. RULE: ONE task per iteration → update this file →
     atomic commit → exit. -->

# Progress — Rent-Yield Screener

## Active task
A.1 — Astro scaffold + repo hygiene

## Status
in-progress — repo initialized, docs authored; scaffold next

## Last action & result
2026-07-07: product repo created; 7-doc set authored from HQ templates (constitution v1.0.0 incl. both ratification riders).

## Next action
Scaffold Astro (minimal template), placeholder test, `npm run build` green.

## Learnings / guardrails
- ETL determinism is constitutional (VI): always compare double-run outputs with `diff -r` before claiming done.
- Attribution is CI-asserted, not remembered (constitution V).

## Blockers / open questions
- Task A.3 + GitHub remote need Mekyle: GitHub repo creation (gh CLI not installed), Cloudflare account auth.
- Task C.4 (SEO scale) blocked on Mekyle's Keywords Everywhere export → judged by pre-registered rule.

## Loop control
Iteration: 0 / 25 · Stop condition: Phase A exit (skeleton live + green CI) — then user checkpoint
