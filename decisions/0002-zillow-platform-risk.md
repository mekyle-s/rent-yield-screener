# Known platform risk: Zillow Research terms are revocable (ratification rider)

## Context and Problem Statement
The product's primary data (ZHVI, ZORI) is used under Zillow's public Terms of Use — "display and distribute derivative works of the Aggregate Data… so long as the Zillow Companies are cited as a source on every page" — not a signed license. FRED redistributes the same series under these terms (strong precedent). But the terms are revocable, and our paid-tier reading ("derivative work / market analysis," not raw-data resale) is an inference, tagged Assumed in the evidence brief.

## Considered Options
- Proceed free-tier product with attribution, log the risk (chosen)
- Seek written permission from Zillow first
- Build on HUD/Census only

## Decision Outcome
Chosen option: **proceed with attribution + logged risk**, because observed practice (FRED, press, analysts) firmly supports free public analytic use, and waiting on a corporate reply would stall run #1 for an Assumed-low risk. HUD SAFMR + Census ACS are wired in as enrichment from day 1, doubling as a degraded-mode fallback.

### Consequences
- Good: ships now; compliance is CI-enforced (attribution assert); fallback data path exists.
- Bad: Zillow could change terms or object — the ratio map would need re-sourcing (HUD FMR × ACS values ≈ coarser but public-domain). **Triggers for mandatory re-verification (binding rider): (1) any paid tier proposed; (2) any Zillow ToS change detected; (3) any contact from Zillow.**
