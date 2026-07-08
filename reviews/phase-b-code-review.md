# Phase B Code Review — full findings

- **Scope:** `992019b..HEAD` (all of Phase B: fixtures, ETL transforms, golden snapshot, validation gate, crosswalk, SVG map build/verify, CI gates) — 31 changed files
- **Method:** workflow-backed review at **high** effort (approval note 5): 4 parallel finders (3 correctness angles + 1 cleanup angle) → 25 pooled candidates → independent adversarial verifier per finding location. **25 verified → 25 kept, 0 refuted** (23 CONFIRMED, 2 PLAUSIBLE). 26 agents total.
- **Date:** 2026-07-07 · Run ID `wf_b118bdf2-d5b`
- **Status: Phase B exit BLOCKED pending fixes to findings 1–10.**

Duplicate candidates were merged: four independent finders converged on finding 2 (`validate.ts:39`) and two on finding 3 (`csv.ts:49`) — treated as one finding each below.

---

## Ranked findings (reported top 10)

### 1. BLOCKER — Choropleth SVG renders every polygon as its spherical complement
`scripts/map/build.ts:41` · correctness · **CONFIRMED**

mapshaper emits RFC 7946 (counterclockwise) ring winding; d3-geo treats such rings as the spherical complement. `build-boundaries.ts` never rewinds rings to d3's convention before `geoPath(feature)`. **Verifier evidence: all 15 of 15 `<path>` elements in the committed `data/map/metro-map.svg` begin with the geoAlbersUsa clip-extent rectangle `M-104,-4.4L1079,-4.4L1079,614.4L-104,614.4Z`** with the metro as a hole.

*Failure:* every metro path fills the whole 975×610 canvas in its bin color; the last-drawn metro covers the entire US; every hover `<title>` covers the full map. `map:verify` only counts paths/attributes, so CI stays green and the broken map ships in Phase C.

*Fix direction:* rewind rings for d3 convention (e.g. mapshaper `-o` with d3-compatible winding, or rewind in build.ts) **plus** a `map:verify` geometry guard (no path bbox may span the full viewBox) so this bug class can't pass silently again.

### 2. Validation gate can exit 0 having validated nothing
`scripts/etl/validate.ts:39` · correctness · **CONFIRMED** (found independently by 4 finders)

Default mode filters the 4 expected CSVs through `.filter(existsSync)` and only checks `data/latest.json` `if (existsSync(...))`. Zero inputs → prints nothing, exits 0.

*Failure:* in the D.1 pipeline (`npm run etl:live && npm run etl:validate`), a cleared cache or a fetch that wrote elsewhere makes the B.3 gate pass vacuously — the monthly publish proceeds with unvalidated or nonexistent data instead of failing with an error token.

### 3. Non-numeric cells coerced to 0/NaN — violates nulls-stay-null
`src/etl/csv.ts:49` · correctness · **CONFIRMED** (2 finders)

`values[col] = cell === "" ? null : Number(cell)` — only the exact empty string becomes null. `Number(" ") === 0` (a fabricated value, contradicting the file's own header comment); `Number("NA")` is NaN, which `transform.ts:73`'s `!= null` month check treats as present, and `JSON.stringify` then serializes NaN as `null` in the output.

*Failure:* a single `" "` cell in the latest ZORI month drops the region as zeroRent instead of falling back one month — the metro silently vanishes from latest.json and the map. A `"NA"` cell becomes the selected "latest shared month" with ratio NaN, failing the entire monthly refresh via RATIO_RANGE when a perfectly good earlier month existed.

### 4. Crosswalk generator enforces a weaker invariant than its committed test
`scripts/etl/build-crosswalk.ts:27` · correctness · **CONFIRMED**

The generator only rejects one-metro→multiple-CBSAs; `tests/crosswalk.test.ts:27` asserts globally unique CBSA codes (1:1 both directions).

*Failure:* a future `CountyCrossWalk_Zillow.csv` with a duplicate/legacy metro ID for the same CBSA regenerates fine, then `npm test` fails the 1:1 assertion — red CI blocking the monthly refresh, with the generator's own guard having reported nothing.

### 5. NaN thresholds silently disable the rowcount gate
`scripts/etl/validate.ts:16` · correctness · **CONFIRMED**

`num()` never rejects NaN: `--min-zips 5,000` → `Number("5,000") === NaN` → `doc.zips.length < NaN` is always false. The `--flag=value` equals form is also silently ignored by the space-separated `flag()` lookup (falls back to default).

*Failure:* an operator typo disables ROWCOUNT_ANOMALY with no warning; a Zillow coverage collapse to 12 ZIPs validates OK.

### 6. Empty-zips median is NaN — distribution check silently passes
`src/etl/validate.ts:70` · correctness · **CONFIRMED**

`median([])` returns `(s[-1] + s[0]) / 2 = NaN`; `NaN < lo || NaN > hi` is false.

*Failure:* `etl:validate --latest <metro-only latest.json> --min-zips 0` (a legitimate V1 shape per ADR-0004) passes the median check having evaluated nothing.

### 7. Empty CSV crashes parseCsv with an opaque TypeError
`src/etl/csv.ts:39` · correctness · **CONFIRMED**

0-byte file → `split("\n")` yields `[""]`, filter drops it, `lines[0]` is undefined → `splitCsvLine(undefined)` throws deep in the parser. The etl runner bypasses `validateCsvSchema` (which handles the empty case), so no error token is emitted.

### 8. map:verify's latest.json read is unguarded — breaks the MAP_VERIFY: contract
`scripts/map/verify.ts:25` · correctness · **CONFIRMED**

`JSON.parse(readFileSync(latestPath))` sits outside any try/catch (unlike the SVG read above it). Missing/corrupt `data/latest.json` → raw ENOENT stack trace instead of the contractual `MAP_VERIFY: <reason>` token (amended B.4 AC).

### 9. fetch.ts main() is a floating promise — escapes the FETCH_INTEGRITY: contract
`scripts/etl/fetch.ts:90` · correctness · **CONFIRMED**

Bare `main();` with no `.catch`. Only `fetch(url)` itself is wrapped; `await res.text()` (line 52) is unguarded, so a mid-body connection reset rejects outside `fail()` — stack trace, no token.

### 10. National-row filter keys on SizeRank instead of region identity
`src/etl/transform.ts:43` · correctness · **PLAUSIBLE**

`if (row.meta.SizeRank === "0") continue;` runs against ZIP files too. Should key on `RegionID === "102001"` / `RegionType === "country"`. No current-data case exists (ZIP files carry no SizeRank-0 row today), hence PLAUSIBLE — a one-line hardening.

---

## Below-cap verified findings (11–21)

All verified; fell below the top-10 report cap. Cleanup/efficiency unless noted.

11. **`scripts/etl/trim-fixtures.ts:75` — `localeCompare` sort in fixture selection** · PLAUSIBLE, determinism-adjacent: `byId` uses locale-dependent collation while every other sort in the repo deliberately uses lexical `<`/`>`. The sort picks *which rows become fixtures*; a different locale could pick different rows on regeneration. Switch to the lexical comparator.
12. **`scripts/map/build.ts:16` — fixture and live builds share `data/map/metro-map.svg`** · CONFIRMED: `--fixtures` switches only the input; a Phase D live build will overwrite the committed fixture artifact that CI byte-diffs, breaking the CI determinism gate on the next fixture check. Needs distinct outputs or an explicit story for the transition.
13. **`scripts/etl/build-crosswalk.ts:11` — no existsSync guard on the cached county crosswalk** · CONFIRMED: fresh checkout → raw ENOENT instead of a `FETCH_INTEGRITY:` message with the download URL (build-boundaries.ts has exactly that guard). Also: the county crosswalk isn't in fetch.ts SOURCES, so nothing re-downloads it.
14. **`scripts/etl/trim-fixtures.ts:19` — `fields()` is a verbatim copy of `splitCsvLine`** · CONFIRMED: character-for-character duplicate instead of importing from `src/etl/csv.ts` (build-crosswalk.ts imports it correctly).
15. **`scripts/etl/run.ts:11` + `scripts/etl/validate.ts:10` — `flag()` argv helper copy-pasted, fetch.ts hand-rolls a third variant** · CONFIRMED: extract one shared helper.
16. **`src/etl/validate.ts:12` — `DATE_COL` regex + meta/date classification duplicated from csv.ts** · CONFIRMED: export from the parser instead.
17. **`src/etl/validate.ts:13` — META column lists duplicate fetch.ts `headerStartsWith` strings** · CONFIRMED: two sources of truth for the expected Zillow header; derive one from the other.
18. **`src/etl/csv.ts:49` — DATE_COL regex re-tested per cell per row** · CONFIRMED (efficiency): header is already classified once at lines 40–41; precompute a per-index type array. Matters at 26K rows × 320 cols in Phase D.
19. **`scripts/etl/fetch.ts:82` — 4 downloads awaited sequentially** · CONFIRMED (efficiency): independent URLs; `Promise.all` halves-to-quarters the monthly fetch wall time.
20. **`scripts/map/verify.ts:41` — no-op `.map((m) => m)` + O(n²) `ids.includes` in the missing-paths diagnostic** · CONFIRMED: use a `Set`; drop the identity map.
21. **`src/etl/transform.ts:11` — `dateCols` stamped onto every RegionSeries though it's a per-file constant** · CONFIRMED: only the ZHVI side's copy is ever read; move to a per-file structure.

---

## Disposition

Findings **1–10** block the Phase B exit checkpoint (decision recorded in PROGRESS.md). Findings **11–21** are queued for the same fix pass where cheap, or Phase 5 hardening otherwise — none blocks exit, but 11 (locale sort) and 12 (shared output path) should be fixed alongside 1–10 since they touch determinism and the CI gate respectively.
