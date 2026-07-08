// Validation gate (ROADMAP B.3). Every failure carries exactly one error token:
//   SCHEMA_VIOLATION:  CSV header drift (missing/unexpected/no-date columns)
//   ROWCOUNT_ANOMALY:  joined record counts below expected minimums
//   RATIO_RANGE:       metro record outside [5,60], non-positive/non-finite ZIP,
//                      or ZIP median outside [5,60] (distribution check — approved
//                      2026-07-07: legit luxury-ZIP outliers like 92662 must pass,
//                      systematic corruption like unit changes must not)
// FETCH_INTEGRITY: is emitted by fetch.ts before any parsing.
import { splitCsvLine } from "./csv";
import type { LatestJson } from "./serialize";

const DATE_COL = /^\d{4}-\d{2}-\d{2}$/;
const METRO_META = ["RegionID", "SizeRank", "RegionName", "RegionType", "StateName"];
const ZIP_META = [...METRO_META, "State", "City", "Metro", "CountyName"];

export type ValidationResult = { ok: true } | { ok: false; token: string; detail: string };

const fail = (token: string, detail: string): ValidationResult => ({ ok: false, token, detail });

export function validateCsvSchema(text: string): ValidationResult {
  const firstLine = text.split("\n", 1)[0]?.trim();
  if (!firstLine) return fail("SCHEMA_VIOLATION:", "empty file or missing header row");

  const header = splitCsvLine(firstLine);
  const metaCols = header.filter((c) => !DATE_COL.test(c));
  const dateCols = header.filter((c) => DATE_COL.test(c));

  if (dateCols.length === 0) return fail("SCHEMA_VIOLATION:", "no date columns in header");

  // Layout is chosen by best overlap, then meta columns must match it exactly —
  // Zillow adding, dropping, or reordering a column is schema drift and fails loudly.
  const overlap = (expected: string[]) => metaCols.filter((c) => expected.includes(c)).length;
  const expected = overlap(ZIP_META) > overlap(METRO_META) ? ZIP_META : METRO_META;
  for (const col of expected)
    if (!metaCols.includes(col)) return fail("SCHEMA_VIOLATION:", `missing meta column ${col}`);
  for (const col of metaCols)
    if (!expected.includes(col)) return fail("SCHEMA_VIOLATION:", `unexpected meta column ${col}`);
  if (metaCols.join(",") !== expected.join(","))
    return fail("SCHEMA_VIOLATION:", `meta column order changed: ${metaCols.join(",")}`);

  return { ok: true };
}

const METRO_BAND: [number, number] = [5, 60];

// Throws on an empty array (finding #6): median([]) used to be NaN, and
// `NaN < lo || NaN > hi` is false, so the ZIP distribution check silently passed
// having evaluated nothing. Callers must guard the empty case explicitly.
export function median(xs: number[]): number {
  if (xs.length === 0) throw new Error("median of empty array");
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function validateLatest(
  doc: LatestJson,
  opts: { minMetros: number; minZips: number },
): ValidationResult {
  if (doc.metros.length < opts.minMetros)
    return fail("ROWCOUNT_ANOMALY:", `metros=${doc.metros.length} < min ${opts.minMetros}`);
  if (doc.zips.length < opts.minZips)
    return fail("ROWCOUNT_ANOMALY:", `zips=${doc.zips.length} < min ${opts.minZips}`);

  const [lo, hi] = METRO_BAND;
  for (const r of doc.metros)
    if (!Number.isFinite(r.ratio) || r.ratio < lo || r.ratio > hi)
      return fail("RATIO_RANGE:", `metro ${r.regionId} ratio=${r.ratio} outside [${lo},${hi}]`);

  for (const r of doc.zips)
    if (!Number.isFinite(r.ratio) || r.ratio <= 0)
      return fail("RATIO_RANGE:", `zip ${r.regionId} ratio=${r.ratio} non-positive or non-finite`);

  // Distribution check only applies when ZIPs exist; a metro-only latest.json
  // (minZips 0, ADR-0004 V1) has nothing to check — skip rather than NaN-pass.
  if (doc.zips.length > 0) {
    const zipMedian = median(doc.zips.map((r) => r.ratio));
    if (zipMedian < lo || zipMedian > hi)
      return fail("RATIO_RANGE:", `zip median=${zipMedian} outside [${lo},${hi}] — systematic corruption?`);
  }

  return { ok: true };
}
