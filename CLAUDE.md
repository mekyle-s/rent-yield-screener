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
- Windows dev box: guard against CRLF drift in committed JSON (set `.gitattributes`); ETL output must be byte-identical cross-platform (write LF explicitly).
- Cloudflare Pages free tier: 20K-file cap — ZIP-level pages are DEFERRED; keep map data in single PMTiles on R2, never as many small JSON files.
- Zillow CSV region IDs ≠ Census CBSA codes everywhere — the crosswalk lives in `data/crosswalk/` and has its own tests.
