<!-- SYNC IMPACT REPORT (2026-07-07, on gate acceptance):
     Status DRAFT → ACCEPTED. This ADR is now the SINGLE SOURCE OF TRUTH for the V1 map/data stack.
     Amended in the same change: PRD.md (In Scope, Expansion ≤8.4K ZIPs, Constraints → point here),
     ROADMAP.md (header shell note; B.2 golden-snapshot AC; B.3 fetch-integrity gate; B.4 GeoJSON+SVG;
     C.1 SVG choropleth; C.3 JSON-LD escaping assert; D.1 metro-scope; D.2 no-R2 deploy; D.3 deleted),
     CLAUDE.md (map gotcha, determinism rules), DEFERRED.md (+MapLibre-in-V1, +per-metro OG, +custom alerting).
     Supersedes the map/storage lines of ADR-0001 (stack) — Astro/Pages/Actions unchanged. -->

# V1 Blueprint — ACCEPTED at architecture gate (critique + simplicity review folded in)

## Context and Problem Statement
Three mining briefs settled the implementation patterns and surfaced a decisive fact: **only ~8,444 ZIPs have ZORI rent data** (of 26,274 with ZHVI; ~26% of ZCTAs) — the "30K-ZIP map" never existed for a P2R metric. The gate (adversarial critique: 3× CONCERNS, no blockers; simplicity review: keep cut + 4 more cuts) reshaped the draft into the minimal V1 below.

## Decision Outcome — the minimal V1
**Monthly deterministic ETL → single `latest.json` of metro P2R ratios → static Astro pages with a prebuilt SVG national choropleth linking to per-metro pages (ratio + 12-mo trend + top-ZIP table + Zillow attribution), one default OG image, sitemap — zero infra beyond Cloudflare Pages + GitHub Actions, zero client map dependency.**

### ETL (Phase B) — TypeScript, deterministic, fixture-tested
- Fetch 4 CSVs (ZHVI/ZORI × ZIP/Metro; current `files.zillowstatic.com` URLs incl. `mfr` ZORI filenames).
- **Fetch-integrity gate (critique #4):** HTTP 200 + CSV content-type + expected header row + non-empty, BEFORE parsing; 404/rename fails loudly (Zillow renamed ZORI once already). GH Actions' default failure email is the alert — no custom issue-opener (simplicity cut #3).
- Parse: date columns by regex `^\d{4}-\d{2}-\d{2}$` (never positional); ZIP RegionName as string (leading zeros); melt wide→long; nulls stay null (never fillna-0); SizeRank-0 national row excluded.
- Join: **inner on RegionID**; ratio month = per-region latest month where BOTH series are non-null; month in output metadata; outer-join audit counts in validation.
- P2R = ZHVI ÷ (ZORI × 12).
- **Determinism rules (critique #7, constitution VI):** canonical output = array-of-records sorted by RegionID; NO `new Date()` construction (lexical YYYY-MM-DD comparison only); NO locale formatting; fixed decimal precision; LF-only.
- **Determinism proof (critique #2):** a golden output snapshot is COMMITTED; CI regenerates from fixtures and diffs against it — this tests cross-platform byte-identity for real, not same-runner twice.
- **Storage (simplicity cut #4):** single `latest.json` in-repo, monthly git tag = the as-reported history (ZHVI/ZORI are smoothed/seasonally-adjusted and restated monthly — tags are the only true vintage record; accumulated snapshots would mix vintages).

### Map (Phase C) — prebuilt SVG choropleth (simplicity cut #1)
- **No MapLibre, no PMTiles, no R2, no tippecanoe, no custom domain in V1.**
- ETL-time build with d3-geo + mapshaper (both pure JS — Windows-dev + ubuntu-CI safe, resolves the tippecanoe-has-no-Windows-build blocker): CBSA cartographic boundaries → simplified → projected → inline SVG with one `<path>` per metro, fill baked from P2R, tiny vanilla hover/click JS.
- Dense-cluster mitigation: companion searchable metro index (wanted regardless).
- V2 ZIP layer (~8.4K regions, honestly disclosed): the mined PMTiles pattern verbatim (ratios in tiles, direct-to-public-R2, documented tippecanoe flags, maxzoom 9) + MapLibre returns. Requires an explicit "no rent data" legend state + coverage disclosure (critique #5). Marked SUPERVISED (R2/CF secrets + bucket = human gates, critique #6).

### Pages & SEO (Phase C) — astro-paper patterns
- Data as typed collection: Astro `file()` loader + zod schema over `latest.json`.
- Layered layouts: base `Layout.astro` (universal meta + `<slot name="head" />`); `MetroLayout.astro` injects per-metro JSON-LD — **with `<`/`>`/`&` escaped in the serializer (critique #8)**, asserted by the check-seo script.
- `@astrojs/sitemap` + `robots.txt.ts` endpoint.
- **One default OG image (simplicity cut #2)** — static file, which also deletes the satori/sharp native-dep lockfile risk (critique #3) from V1 entirely. Per-metro OG → DEFERRED.
- Zillow attribution in the metro template (CI-asserted, constitution V).

### Ops note (critique #9)
All ROADMAP ACs run under **Git Bash** (never PowerShell-verbatim) — stated in the ROADMAP header. Monthly cron commits `latest.json` + pushes; Cloudflare Pages auto-deploys on push — the built-in GITHUB_TOKEN suffices, no new secrets in V1.

## Considered Options
- V1 with PMTiles/R2/MapLibre from day 1 — rejected: infra + native-tooling burden for 739 polygons; tippecanoe blocks the Windows dev box.
- **Minimal V1 above (chosen)**
- Leaflet raster — rejected: loses vector styling, solves nothing SVG doesn't.

### Consequences
- Good: zero V1 infra beyond Pages+Actions; every moving part pure JS and fixture-testable; determinism actually proven in CI; all four gate MAJORs resolved by construction (no sharp, no R2 secrets, golden snapshot, fetch gate).
- Bad / accepted: V2 ZIP layer is a real infra step (R2 + secrets + coverage-honesty work); SVG map has no pan/zoom (fine for a national screening view; revisit with the ZIP layer); ~1–3MB GeoJSON intermediate stays out of the client (only the SVG ships).
