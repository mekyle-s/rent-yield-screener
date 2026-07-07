<!-- LOADS: every planning session AND every autonomous loop iteration (to pick the next task).
     LOADED BY: the executing agent each iteration; human for sequencing.
     RULE: if an AC can't be command + expected output, the task isn't autonomously done-able —
     split/reword it or mark SUPERVISED.
     SHELL RULE (gate critique #9): ALL ACs run under Git Bash — never PowerShell-verbatim.
     Map/data stack: ADR-0004 is the single source of truth. -->

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
- [ ] **Task B.2 — Transform: CSV → canonical P2R latest.json** (melt wide→long, inner join on RegionID, per-region shared latest non-null month, ratio = ZHVI/(ZORI×12); array-of-records sorted by RegionID, no Date construction, no locale formatting — ADR-0004 determinism rules)
  - AC: `npm test -- transform` → all pass (incl. edge cases: missing rent, missing value, div-by-zero, leading-zero ZIPs, metro-vs-ZIP column counts)
  - AC (golden snapshot, gate critique #2): `npm run etl -- --input tests/fixtures --out /tmp/out && diff -r /tmp/out tests/golden/` → no output — CI regenerates and diffs the COMMITTED golden snapshot (cross-platform byte-identity, constitution VI)
- [ ] **Task B.3 — Fetch-integrity + validation gate** (HTTP 200 + CSV content-type + expected header row + non-empty BEFORE parse; schema check; row-count sanity; ratio-range sanity; outer-join audit counts)
  - AC: `npm run etl:validate -- tests/fixtures/bad-schema.csv` → exits 1 with named violation
  - AC (gate critique #4): `npm run etl:fetch -- --url https://files.zillowstatic.com/DOES-NOT-EXIST.csv` → exits 1 naming the failed URL (404/rename path fails loudly)
- [ ] **Task B.4 — Metro boundaries: CBSA cartographic shapefile → simplified GeoJSON → prebuilt SVG choropleth** (mapshaper + d3-geo, pure JS — ADR-0004; no tippecanoe/PMTiles in V1)
  - AC: `npm run map:build -- --fixtures` → emits `metro-map.svg`; `npm run map:verify` → path count == joined-metro count, every path has a fill class + data-region-id

## Phase C — Map + Pages
**Exit condition:** deployed site shows interactive choropleth + metro pages from fixture data; screenshot verification passed.

- [ ] **Task C.1 — SVG choropleth page (metro level) + searchable metro index** (inline prebuilt SVG from B.4; hover/click via tiny vanilla JS)
  - AC: E2E (Playwright): page loads, SVG renders with >500 metro paths, clicking a metro navigates/shows its ratio → test green
  - AC: screenshot of national view captured + second fresh-context pass confirms choropleth visibly colored
- [ ] **Task C.2 — Metro page template** (ratio, 12-mo trend, top-ZIP table, Zillow attribution)
  - AC: `npm run build` → one HTML page per fixture metro; `grep -L "Data Provided by Zillow Group" dist/metro/*.html` → empty (100% attribution, constitution V)
- [ ] **Task C.3 — SEO plumbing** (sitemap, robots.txt.ts, canonical, meta + default OG, escaped JSON-LD)
  - AC: `npx tsx scripts/check-seo.ts dist/` → all pages pass (title, description, canonical, JSON-LD present AND `<`/`>` escaped — gate critique #8)
- [ ] **Task C.4 — SEO SCALE DECISION** (SUPERVISED — gated on pre-registered keyword rule in HQ Decision Doc)
  - AC: Mekyle's KE data judged against pre-committed thresholds → metro page count set (400 / 50 / pivot)

## Phase D — Production Data + Cron
**Exit condition:** site serves real current-month Zillow data; refresh runs unattended.

- [ ] **Task D.1 — Full ETL on live data** (all metros per C.4 decision + ZIP data for top-ZIP tables; no ZIP map — ADR-0004)
  - AC: `npm run etl:live && npm run etl:validate` → exits 0; spot-check 3 known metros against Zillow's published values (±1%)
- [ ] **Task D.2 — Monthly GitHub Actions cron** (fetch → transform → validate → rebuild SVG → commit latest.json + tag → push; Pages auto-deploys — built-in GITHUB_TOKEN only, no new secrets)
  - AC: `gh workflow run refresh.yml` (manual trigger) → run green end-to-end; site shows new data timestamp
<!-- D.3 failure alerting DELETED at gate (simplicity cut #3): GH Actions' default failure email suffices;
     the real failure mode (Zillow URL rename/404) is covered by B.3's fetch-integrity gate. -->


<!-- Phase E (hardening/production-readiness/portfolio) and beyond live in the HQ PLAYBOOK Phase 5;
     alerts tier + 30K ZIP pages are DEFERRED.md items, not phases. -->

## Dependencies
- B.4 blocked by B.1 · C.1 blocked by B.2+B.4 · C.2 blocked by B.2 · D.* blocked by C gate · C.4 blocked by Mekyle's KE data
