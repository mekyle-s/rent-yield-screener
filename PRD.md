<!-- LOADS: at spec/planning gates; pulled when an agent needs product intent or a scope boundary.
     LOADED BY: planner agents + human author. -->

# Rent-Yield Screener — PRD

## Problem & Users

Real-estate investors and brokers doing market screening ("which metros/ZIPs should I even hunt in?") assemble price-to-rent math by hand from scattered sources, or pay $18–75/mo (Mashvisor, Reventure) for tools centered on forecasts or parcel analysis. No free, fast, _indexable_ ZIP/metro-level price-to-rent map exists — the SERP for these queries is definition articles and static listicles.

## Vision vs V1

**Long-term vision:** the default free front door for US rental-market screening — the place you check yield before you check listings.
**V1 target:** ZIP/metro price-to-rent choropleth map + per-metro SEO pages with ratio, trend, and top-ZIP table, refreshed monthly from open data.
**Expansion path:** (1) paid alert tier — threshold/trend alerts, watchlists, CSV export ($15–29/mo, licensing re-verified first); (2) ZIP layer — **≤8.4K ZIPs (only 8,444 have rent data; coverage disclosed honestly)** once metro pages prove Search Console demand; (3) richer metrics — gross yield, ratio deltas, HUD-FMR cross-check spreads.
<!-- Vision items that tempt scope creep → one line in DEFERRED.md, never a task. -->

## In Scope (V1) — map/data stack governed by ADR-0004 (single source of truth)

- Monthly ETL: Zillow Research ZHVI + ZORI CSVs (ZIP + metro) → validated single `latest.json` + monthly git tags
- National **prebuilt SVG choropleth** (metro level) colored by price-to-rent ratio + searchable metro index
- Programmatic metro pages incl. top-ZIP table from ZIP _data_ (count gated by the pre-registered SEO rule; ceiling ~400)
- SEO plumbing: sitemap, meta tags + one default OG image, escaped JSON-LD, per-page Zillow attribution
- E2E-verified deploy on Cloudflare Pages, monthly refresh via GitHub Actions cron

## Out of Scope (V1)

- Alerts/accounts/payments → DEFERRED (V2)
- ZIP-level _map_ + MapLibre/PMTiles/R2 → DEFERRED (V2, ≤8.4K ZIPs with honest coverage disclosure; see ADR-0004)
- Parcel-level anything, underwriting math, forecasts → DEFERRED (see positioning)
- Realtime data → NEVER (constitution VI)

## Success Metrics

- Core loop demo ≤2 min: land → see map → click metro → understand its yield story
- ETL fully deterministic: same snapshot in → byte-identical JSON out (CI-asserted)
- 100% of data pages carry Zillow attribution (CI-asserted)
- Lighthouse SEO + performance ≥90 on metro pages
- Post-launch (not V1 gate): first organic impressions in Search Console within 30 days of indexing

## Constraints & Assumptions

- Stack: Astro SSG + Cloudflare Pages + GitHub Actions (ADR-0001); V1 map/data stack per **ADR-0004** (SVG choropleth, latest.json — no MapLibre/PMTiles/R2 in V1)
- Budget: $0 V1 target, ≤$25/mo hard cap
- **Positioning (binding):** market DISCOVERY/screening tool — never marketed as underwriting or "find your next deal"
- Assumptions: Zillow attribution clause covers freemium analytic use (FRED precedent); monthly cadence acceptable to ICP; SEO scale pending pre-registered keyword rule
