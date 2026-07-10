# Stack: Astro SSG + Cloudflare Pages/R2 + MapLibre/PMTiles + GitHub Actions ETL

## Context and Problem Statement

V1 needs: programmatic SEO pages (up to ~400 metros, ~30K ZIPs later), a national choropleth, a monthly batch ETL, $0 infra, autonomous agent buildability, and no realtime components (constitution VI). Free-tier limits are the real design forces.

## Considered Options

- Astro SSG on Cloudflare Pages (+ R2/PMTiles, GH Actions cron)
- Next.js 16 static export on Vercel Hobby
- SvelteKit on Netlify

## Decision Outcome

Chosen option: **Astro + Cloudflare Pages + MapLibre GL/PMTiles + R2 + GitHub Actions**, because: Astro ships ~9KB JS vs Next's ~463KB (crawl budget + Lighthouse for SEO-critical pages); CF Pages has unlimited bandwidth free; a single PMTiles file on R2 (zero egress, HTTP range requests) serves the whole choropleth without counting against the 20K-file cap; public-repo GH Actions = unlimited free ETL minutes; everything is boring, deterministic, and fixture-testable (agent-buildable).

### Consequences

- Good: $0 V1; deterministic builds; each layer independently testable; V2 alerts stay decoupled (D1+Resend).
- Bad / locked in: **CF Pages 20K-file cap forks the ZIP long-tail** — mitigation designed in from day 1: pages hydrate from R2/JSON so the long-tail can flip to on-demand edge rendering without a rewrite. Astro build time at 10K+ pages is a watch-item (mitigate: ETL pre-computes page JSON; render is pure templating).
- Fallbacks if walls hit: Vercel Hobby (no file cap, tighter bandwidth); Leaflet raster (if MapLibre WebGL misbehaves).

Evidence: HQ `research/phase-2/stack-scout.md` (host limit numbers + sources).
