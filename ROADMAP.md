<!-- LOADS: every planning session AND every autonomous loop iteration (to pick the next task).
     LOADED BY: the executing agent each iteration; human for sequencing.
     RULE: if an AC can't be command + expected output, the task isn't autonomously done-able —
     split/reword it or mark SUPERVISED. -->

# Rent-Yield Screener — Roadmap

## Phase A — Walking Skeleton (IN PROGRESS)
**Exit condition:** hello-world live at a public URL; `gh run list` (or Actions tab) shows green CI on latest push to main.

- [ ] **Task A.1 — Astro scaffold + repo hygiene**
  - AC: `npm run build` → exits 0, `dist/index.html` exists
  - AC: `npm test` → exits 0 (placeholder test passes)
- [ ] **Task A.2 — CI pipeline (typecheck + lint + test on push)**
  - AC: `git push` → GitHub Actions run completes green (screenshot or `gh run view` output)
- [ ] **Task A.3 — Cloudflare Pages deploy** (SUPERVISED — needs Mekyle's CF account auth)
  - AC: `curl -s -o /dev/null -w "%{http_code}" https://<project>.pages.dev` → `200`

## Phase B — ETL Pipeline (deterministic core)
**Exit condition:** full pipeline runs on frozen fixtures in CI; re-run produces byte-identical output.

- [ ] **Task B.1 — Fetch + freeze fixture snapshots** (ZHVI ZIP+metro, ZORI ZIP+metro; committed test fixtures)
  - AC: `npm run etl:fetch -- --dry-run` → lists 4 source URLs, exits 0
  - AC: `ls tests/fixtures/*.csv | wc -l` → `4` (trimmed fixture versions)
- [ ] **Task B.2 — Transform: CSV → normalized P2R JSON** (join ZHVI/ZORI by region, ratio = value/annualized rent)
  - AC: `npm test -- transform` → all pass (incl. edge cases: missing rent, missing value, div-by-zero)
  - AC: `npm run etl -- --input tests/fixtures --out /tmp/run1 && npm run etl -- --input tests/fixtures --out /tmp/run2 && diff -r /tmp/run1 /tmp/run2` → no output (byte-identical, constitution VI)
- [ ] **Task B.3 — Validation gate** (schema check, row-count sanity vs previous snapshot, ratio-range sanity)
  - AC: `npm run etl:validate -- tests/fixtures/bad-schema.csv` → exits 1 with named violation
- [ ] **Task B.4 — Boundary tiles: Census ZCTA + CBSA shapefiles → PMTiles** 
  - AC: `npm run tiles:build -- --fixtures` → produces `.pmtiles` file; `npm run tiles:verify` → tile count + zoom range match expected

## Phase C — Map + Pages
**Exit condition:** deployed site shows interactive choropleth + metro pages from fixture data; screenshot verification passed.

- [ ] **Task C.1 — MapLibre choropleth (metro level)** hydrating from JSON+PMTiles
  - AC: E2E (Playwright): page loads, map canvas renders, clicking a metro shows its ratio → test green
  - AC: screenshot of national view captured + second fresh-context pass confirms choropleth visibly colored
- [ ] **Task C.2 — Metro page template** (ratio, 12-mo trend, top-ZIP table, Zillow attribution)
  - AC: `npm run build` → one HTML page per fixture metro; `grep -L "Data Provided by Zillow Group" dist/metro/*.html` → empty (100% attribution, constitution V)
- [ ] **Task C.3 — SEO plumbing** (sitemap, canonical, meta/OG, structured data)
  - AC: `npx tsx scripts/check-seo.ts dist/` → all pages pass (title, description, canonical, JSON-LD present)
- [ ] **Task C.4 — SEO SCALE DECISION** (SUPERVISED — gated on pre-registered keyword rule in HQ Decision Doc)
  - AC: Mekyle's KE data judged against pre-committed thresholds → metro page count set (400 / 50 / pivot)

## Phase D — Production Data + Cron
**Exit condition:** site serves real current-month Zillow data; refresh runs unattended.

- [ ] **Task D.1 — Full ETL on live data** (all metros per C.4 decision, ZIP-level map data)
  - AC: `npm run etl:live && npm run etl:validate` → exits 0; spot-check 3 known metros against Zillow's published values (±1%)
- [ ] **Task D.2 — Monthly GitHub Actions cron** (fetch → transform → validate → commit JSON → push tiles to R2 → trigger deploy)
  - AC: `gh workflow run refresh.yml` (manual trigger) → run green end-to-end; site shows new data timestamp
- [ ] **Task D.3 — Failure alerting** (cron failure → GitHub issue auto-opened)
  - AC: inject bad fixture in a test branch run → issue created with validation error text

<!-- Phase E (hardening/production-readiness/portfolio) and beyond live in the HQ PLAYBOOK Phase 5;
     alerts tier + 30K ZIP pages are DEFERRED.md items, not phases. -->

## Dependencies
- B.4 blocked by B.1 · C.1 blocked by B.2+B.4 · C.2 blocked by B.2 · D.* blocked by C gate · C.4 blocked by Mekyle's KE data
