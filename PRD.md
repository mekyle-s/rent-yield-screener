<!-- LOADS: at spec/planning gates; pulled when an agent needs product intent or a scope boundary.
     LOADED BY: planner agents + human author. -->

# Rent-Yield Screener — PRD

## Problem & Users
Real-estate investors and brokers doing market screening ("which metros/ZIPs should I even hunt in?") assemble price-to-rent math by hand from scattered sources, or pay $18–75/mo (Mashvisor, Reventure) for tools centered on forecasts or parcel analysis. No free, fast, *indexable* ZIP/metro-level price-to-rent map exists — the SERP for these queries is definition articles and static listicles.

## Vision vs V1
**Long-term vision:** the default free front door for US rental-market screening — the place you check yield before you check listings.
**V1 target:** ZIP/metro price-to-rent choropleth map + per-metro SEO pages with ratio, trend, and top-ZIP table, refreshed monthly from open data.
**Expansion path:** (1) paid alert tier — threshold/trend alerts, watchlists, CSV export ($15–29/mo, licensing re-verified first); (2) ZIP-page long-tail (~30K pages) once metro pages prove Search Console demand; (3) richer metrics — gross yield, ratio deltas, HUD-FMR cross-check spreads.
<!-- Vision items that tempt scope creep → one line in DEFERRED.md, never a task. -->

## In Scope (V1)
- Monthly ETL: Zillow Research ZHVI + ZORI CSVs (ZIP + metro) → validated, versioned JSON snapshots
- National choropleth (MapLibre + PMTiles) colored by price-to-rent ratio, ZIP + metro levels
- Programmatic metro pages (count gated by the pre-registered SEO rule; ceiling ~400)
- SEO plumbing: sitemap, meta/OG tags, structured data, per-page Zillow attribution
- E2E-verified deploy on Cloudflare Pages, monthly refresh via GitHub Actions cron

## Out of Scope (V1)
- Alerts/accounts/payments → DEFERRED (V2)
- ZIP-level pages (30K) → DEFERRED (V2, breaks CF 20K-file cap; needs edge-render flip)
- Parcel-level anything, underwriting math, forecasts → DEFERRED (see positioning)
- Realtime data → NEVER (constitution VI)

## Success Metrics
- Core loop demo ≤2 min: land → see map → click metro → understand its yield story
- ETL fully deterministic: same snapshot in → byte-identical JSON out (CI-asserted)
- 100% of data pages carry Zillow attribution (CI-asserted)
- Lighthouse SEO + performance ≥90 on metro pages
- Post-launch (not V1 gate): first organic impressions in Search Console within 30 days of indexing

## Constraints & Assumptions
- Stack: Astro SSG + Cloudflare Pages + MapLibre/PMTiles + R2 + GitHub Actions (ADR-0001)
- Budget: $0 V1 target, ≤$25/mo hard cap
- **Positioning (binding):** market DISCOVERY/screening tool — never marketed as underwriting or "find your next deal"
- Assumptions: Zillow attribution clause covers freemium analytic use (FRED precedent); monthly cadence acceptable to ICP; SEO scale pending pre-registered keyword rule
