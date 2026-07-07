# Rent-Yield Screener

Free ZIP/metro-level price-to-rent choropleth + programmatic metro SEO pages, refreshed monthly from Zillow Research open CSVs (+ HUD/Census). Astro SSG on Cloudflare Pages; batch-only; $0 infra target.

## Run / test / build
- Dev server: `npm run dev`
- Tests: `npm test`
- Typecheck + lint: `npm run check`
- Full ETL on fixtures: `npm run etl -- --input tests/fixtures --out /tmp/out`
- Deploy: push to main → GitHub Actions → Cloudflare Pages

## Where things live (read on demand — do not inline)
- Principles & testing rules → `constitution.md` (esp. V: Zillow attribution · VI: batch-only)
- Scope & product intent → `PRD.md`
- Next task + acceptance criteria → `ROADMAP.md`
- Loop state, learnings, blockers → `PROGRESS.md`
- Why X isn't built → `DEFERRED.md` · Why we chose Y → `decisions/`

## Non-negotiables
1. Never mark a task done without its AC commands passing — show the output.
2. State assumptions before executing; stop and ask on tradeoffs rather than guessing.
3. Never reduce test coverage. Never delete a failing test to make the suite pass.
4. Every data page carries "Data Provided by Zillow Group" — CI asserts it; never remove.
5. No realtime infrastructure, ever (constitution VI). ETL must be deterministic per snapshot.

## Gotchas
- **Map/data stack: ADR-0004 is the single source of truth.** V1 = prebuilt SVG choropleth + single `latest.json` + monthly git tags. NO MapLibre/PMTiles/R2 in V1 — they arrive with the V2 ZIP layer (≤8.4K ZIPs, coverage disclosed).
- **Determinism rules (constitution VI, enforced by the committed golden snapshot):** output = array-of-records sorted by RegionID; NEVER construct `Date` objects (compare YYYY-MM-DD lexically); NEVER locale formatting; fixed decimal precision; LF-only (`.gitattributes` set).
- Zillow CSVs: detect date columns by regex `^\d{4}-\d{2}-\d{2}$` (metro=5 meta cols, ZIP=9 — never positional); ZIP RegionName is a string (leading zeros); nulls stay null; only ~8,444 ZIPs have rent data.
- JSON-LD injection: escape `<`/`>`/`&` in the serializer before `set:html` — check-seo asserts it.
- All ROADMAP ACs run under Git Bash, never PowerShell-verbatim.
- Zillow CSV region IDs ≠ Census CBSA codes everywhere — the crosswalk lives in `data/crosswalk/` and has its own tests.
