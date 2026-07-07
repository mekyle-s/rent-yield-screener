# V1 Blueprint (consolidated from reference-repo mining) — STATUS: DRAFT pending architecture gate

## Context and Problem Statement
Three mining briefs (PMTiles serverless, astro-paper SEO, Zillow ETL — HQ `research/phase-2/mining-*.md`) settled nine implementation decisions and surfaced one big fact: **only ~8,444 ZIPs have ZORI rent data (of 26,274 with ZHVI)** — the "33K ZIP map" was never real; the ZIP layer is ~8.4K regions. This blueprint consolidates the V1 architecture for the gate to challenge.

## The proposed V1 shape

### ETL (Phase B) — TypeScript, deterministic, fixture-tested
- Fetch 4 CSVs (ZHVI/ZORI × ZIP/Metro; current `files.zillowstatic.com` URLs incl. the `mfr` ZORI filenames).
- Parse: detect date columns by regex `^\d{4}-\d{2}-\d{2}$` (NEVER positional slicing — metro has 5 meta cols, ZIP has 9); ZIP RegionName as string (leading zeros); melt wide→long `(RegionID, monthEnd, value)`; nulls stay null (NEVER fillna(0)).
- Join: **inner on RegionID**; ratio month = per-region latest month where BOTH ZHVI and ZORI are non-null; month recorded in output metadata. Outer-join audit counts (ZHVI-only / ZORI-only) in validation output.
- P2R ratio = ZHVI value ÷ (ZORI rent × 12). Output: versioned JSON, LF-only, byte-identical re-runs (constitution VI).
- Validation gate: schema check, row-count sanity vs prior snapshot, ratio range sanity, national-row (SizeRank 0) exclusion.

### Map (Phase C) — SIMPLIFICATION PROPOSED, gate must rule
- **V1 = metro-level choropleth ONLY: single simplified GeoJSON (~739 joined metros, CBSA cartographic boundaries via mapshaper), served as a static asset from the repo/Pages.** NO PMTiles, NO R2, NO custom domain, NO tippecanoe in V1.
- Rationale: PMTiles' complexity earns its keep at the 8.4K-ZIP layer, not at 739 metros (~1–3MB gzipped GeoJSON). This deletes an entire infrastructure dependency (R2 + custom-domain caching caveat) from V1.
- ZIP layer (~8.4K regions) → V2, using the mined PMTiles pattern verbatim: ratios baked into tiles, direct-to-public-R2, the exact tippecanoe flag set (maxzoom 9, no-tiny-polygon-reduction, no coalesce), worker only if edge-cache tuning proves needed.
- MapLibre GL either way (fill-color interpolate on `p2r` property) — V1 reads GeoJSON source, V2 adds pmtiles protocol. ROADMAP B.4 amends from "PMTiles build" to "metro GeoJSON build" if the gate accepts.

### Pages & SEO (Phase C) — adopt astro-paper patterns
- Data as typed collection via Astro `file()` loader + zod schema over ETL JSON (getCollection ergonomics, validation for free).
- Layered layouts: base `Layout.astro` owns universal meta (title/description/canonical/OG/Twitter, `<slot name="head" />`); `MetroLayout.astro` injects per-metro JSON-LD (Dataset/FAQPage) through the head slot.
- `@astrojs/sitemap` (auto-covers getStaticPaths routes) + `robots.txt.ts` endpoint deriving sitemap URL from `site`.
- Per-metro OG images: satori+sharp build-time endpoint (`[slug]/og.png.ts` with mirrored getStaticPaths). Ship site-wide default first if build time bites.
- Zillow attribution in the metro page template (CI-asserted).

## Considered Options
- V1 with PMTiles/R2 from day 1 (as ROADMAP B.4 currently reads)
- **V1 metro-GeoJSON-only, PMTiles deferred to the ZIP layer (proposed)**
- Leaflet raster fallback (rejected: loses vector styling; MapLibre handles 739 polygons trivially)

## Decision Outcome
Pending architecture gate (adversarial critique + simplicity review) + Mekyle checkpoint.

### Consequences (if accepted)
- Good: V1 has zero infra beyond Pages + GitHub Actions; every byte of map data versioned in git; ZIP/PMTiles complexity deferred until metro pages prove demand (mirrors the DEFERRED discipline).
- Bad: V2 ZIP layer becomes a real infra step (R2 bucket, custom domain or worker); metro GeoJSON in-repo means ~MBs committed monthly (mitigate: keep only latest snapshot + tag history).
