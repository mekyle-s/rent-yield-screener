# Founding test strategy: fixtures-first, determinism-asserted, screenshot-verified UI

## Context and Problem Statement

The build will run partly unattended (autonomy ladder Rung 2+). Whatever a machine can't verify silently rots — so every ROADMAP task carries executable acceptance criteria, and the test pyramid must make those criteria cheap to assert. Constitution VI additionally makes ETL determinism a _testable law_.

## Considered Options

- Vitest (unit/integration) + Playwright (E2E) + fixture snapshots (chosen)
- Jest + Cypress
- Test-after (write tests once features settle)

## Decision Outcome

Chosen option: **Vitest + Playwright + frozen fixtures, test-first per Superpowers TDD**, because Vitest is Astro-native and fast; Playwright covers both E2E asserts and the screenshot-verification protocol; and frozen fixture CSVs make the ETL a pure function under test.

Layer map (how ROADMAP ACs land):

- **Unit (Vitest):** every ETL transform — joins, ratio math, edge cases (missing rent/value, div-by-zero), crosswalk lookups. AC pattern: `npm test -- <name>` → pass.
- **Integration (Vitest + fixtures):** full pipeline on frozen snapshots; **determinism assert**: run twice, `diff -r` outputs → empty (constitution VI as a test).
- **E2E (Playwright, Chromium only in V1):** deployed-URL smoke (page 200s, map canvas renders, metro click shows data, attribution string present on every data page).
- **Screenshot protocol (UI tasks):** capture affected views; a second fresh-context pass confirms before the completion promise (tests passing ≠ UI rendering correctly).
- **CI compliance asserts:** attribution grep (constitution V), SEO checker script, coverage non-decrease.

### Consequences

- Good: every phase exit is a command, not a judgment call; unattended runs have hard gates.
- Bad: fixture drift vs live Zillow schema is a real risk — mitigated by the validation gate (B.3) diffing live schema against fixture schema monthly and failing loudly.
- Explicitly NOT tested in V1 (constitution Testing section): cross-browser, load/perf, fuzzing, pixel-diff visual regression.
