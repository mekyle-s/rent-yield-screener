<!-- LOADS: at planning/spec/implement gates, pulled by the planner agent (NOT always-on).
     LOADED BY: any agent deriving specs or facing a tradeoff; human on amendment. -->

# Rent-Yield Screener Constitution
**Version:** 1.0.0 · **Ratified:** 2026-07-07 · **Last amended:** 2026-07-07

## Core Principles

### I. Simplicity First
If 200 lines could be 50, rewrite it. YAGNI until proven otherwise; complexity goes to DEFERRED.md, not into the code.

### II. Surgical Changes
Every changed line MUST trace directly to the current task. Do not edit unrelated code; preserve existing style even if suboptimal.

### III. State Assumptions Explicitly
State assumptions explicitly before executing; when confused or facing a tradeoff, stop and ask rather than guessing.

### IV. Goal-Driven Verification
Define success criteria (tests, commands, expected outputs) BEFORE implementing; loop until demonstrably met. Evidence, not assertions.

### V. Data Compliance (NON-NEGOTIABLE — ratification rider)
Every page that displays Zillow-derived data attributes "Data Provided by Zillow Group" per their terms — no logos, no implied relationship. We NEVER redistribute Zillow's raw downloadable datasets — only derived analytics (ratios, maps, rankings). If a paid tier is ever proposed, licensing gets re-verified FIRST, before any paid code is written. HUD/Census data is public domain but still cited.

### VI. Batch-Only Architecture (ratification rider)
This is a batch/monthly-refresh product matching Zillow's data cadence. NO realtime infrastructure — no websockets, no live queries, no per-request computation of metrics. The ETL is deterministic and testable per snapshot: same input CSVs → byte-identical output JSON.

## Testing (NON-NEGOTIABLE)
- **Layers tested (V1):** unit tests for every ETL transform (fixture CSVs → expected JSON); one integration test running the full pipeline on frozen fixture snapshots; E2E smoke on the deployed URL (page renders, map loads, attribution present); screenshot verification for map/page visual changes.
- **Coverage stance:** The only thing worse than a failing test is a reduction in test coverage.
- **What V1 explicitly does NOT test:** cross-browser matrix (Chromium only), load/perf testing, fuzzing, accessibility audit beyond semantic-HTML basics, visual-regression pixel-diffing. Their absence is a decision, not an accident — revisit at Phase 5 hardening.

## Additional Constraints
- Infra ≤$25/mo, target $0 for V1 (free tiers: Cloudflare Pages/R2, GitHub Actions).
- No client-side secrets; no API keys in the browser; data pipeline runs in CI only.
- SEO scale (400-metro vs top-50 vs pivot) is governed by the pre-registered decision rule in the HQ repo's Decision Doc — not by enthusiasm.

## Governance
- This constitution supersedes ad-hoc preferences. Plans cite which principles they honor.
- Amendment: propose diff → Mekyle ratifies → bump version (MAJOR = principle removed/redefined, MINOR = added, PATCH = wording) → prepend Sync Impact Report (HTML comment: old→new, what changed, which docs need re-alignment) → re-check ROADMAP/PRD/CLAUDE.md for consistency.
