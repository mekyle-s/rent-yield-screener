import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { validateCsvSchema, validateLatest, median } from "../src/etl/validate";
import type { LatestJson } from "../src/etl/serialize";

// Error-token vocabulary (ROADMAP B.3): every failure emits exactly one of
// SCHEMA_VIOLATION: / ROWCOUNT_ANOMALY: / RATIO_RANGE: / FETCH_INTEGRITY:
// (FETCH_INTEGRITY lives in fetch.ts and is exercised by its AC, not here.)

const METRO_HEADER = "RegionID,SizeRank,RegionName,RegionType,StateName";
const ZIP_HEADER =
  "RegionID,SizeRank,RegionName,RegionType,StateName,State,City,Metro,CountyName";

const rec = (regionId: string, ratio: number) => ({
  regionId,
  regionName: "X",
  stateName: "XX",
  month: "2026-05",
  zhvi: 100000,
  zori: 1000,
  ratio,
});

const audit = { joined: 0, zhviOnly: 0, zoriOnly: 0, zeroRent: 0, noSharedMonth: 0 };

function doc(metroRatios: number[], zipRatios: number[]): LatestJson {
  return {
    meta: { snapshotMonth: "2026-05", audit: { metro: audit, zip: audit } },
    metros: metroRatios.map((r, i) => rec(`m${i}`, r)),
    zips: zipRatios.map((r, i) => rec(`z${i}`, r)),
  };
}

describe("validateCsvSchema", () => {
  it("accepts both committed fixture layouts (metro=5, zip=9 meta cols)", () => {
    for (const f of ["zhvi-metro.csv", "zori-zip.csv"]) {
      const res = validateCsvSchema(readFileSync(`tests/fixtures/${f}`, "utf8"));
      expect(res.ok, f).toBe(true);
    }
  });

  it("flags a missing meta column, naming it", () => {
    const res = validateCsvSchema(
      `RegionID,SizeRank,RegionName,RegionType,2025-05-31\n1,1,A,msa,100`,
    );
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.token).toBe("SCHEMA_VIOLATION:");
      expect(res.detail).toContain("StateName");
    }
  });

  it("flags an unexpected meta column (schema drift must fail loudly)", () => {
    const res = validateCsvSchema(`${METRO_HEADER},Surprise,2025-05-31\n1,1,A,msa,ZZ,huh,100`);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.detail).toContain("Surprise");
  });

  it("flags a file with no date columns", () => {
    const res = validateCsvSchema(`${ZIP_HEADER}\n1,1,00001,zip,MA,MA,A,B,C`);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.token).toBe("SCHEMA_VIOLATION:");
  });

  it("flags an empty file", () => {
    expect(validateCsvSchema("").ok).toBe(false);
  });
});

describe("validateLatest — rowcount + ratio-range (distribution check per approved rule)", () => {
  const okMetros = Array.from({ length: 10 }, (_, i) => 10 + i); // 10..19
  const okZips = Array.from({ length: 20 }, (_, i) => 8 + i); // 8..27, median in band

  it("passes a healthy document", () => {
    const res = validateLatest(doc(okMetros, okZips), { minMetros: 5, minZips: 10 });
    expect(res.ok).toBe(true);
  });

  it("ROWCOUNT_ANOMALY when metro count is below the minimum", () => {
    const res = validateLatest(doc([15], okZips), { minMetros: 5, minZips: 10 });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.token).toBe("ROWCOUNT_ANOMALY:");
  });

  it("RATIO_RANGE when any METRO record leaves [5, 60] — aggregates are stable", () => {
    const res = validateLatest(doc([...okMetros, 75], okZips), { minMetros: 5, minZips: 10 });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.token).toBe("RATIO_RANGE:");
  });

  it("tolerates extreme ZIP outliers (Balboa Island rule): one 182.9 ZIP passes", () => {
    const res = validateLatest(doc(okMetros, [...okZips, 182.92]), { minMetros: 5, minZips: 10 });
    expect(res.ok).toBe(true);
  });

  it("RATIO_RANGE when a ZIP ratio is non-positive or non-finite", () => {
    for (const bad of [0, -3, Infinity, NaN]) {
      const res = validateLatest(doc(okMetros, [...okZips, bad]), { minMetros: 5, minZips: 10 });
      expect(res.ok, `zip ratio ${bad}`).toBe(false);
      if (!res.ok) expect(res.token).toBe("RATIO_RANGE:");
    }
  });

  it("RATIO_RANGE when the ZIP MEDIAN leaves [5, 60] — catches systematic corruption", () => {
    const shifted = okZips.map((r) => r * 100); // e.g. unit change / column shift
    const res = validateLatest(doc(okMetros, shifted), { minMetros: 5, minZips: 10 });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.token).toBe("RATIO_RANGE:");
  });

  it("empty zips with minZips 0 passes without a NaN median (finding #6)", () => {
    // A metro-only latest.json is a legitimate V1 shape (ADR-0004). median([]) is
    // NaN and `NaN < lo || NaN > hi` is false, so the old code "passed" by evaluating
    // nothing. The distribution check must be SKIPPED for zero zips, not NaN-passed.
    const res = validateLatest(doc(okMetros, []), { minMetros: 5, minZips: 0 });
    expect(res.ok).toBe(true);
  });

  it("median() rejects an empty array rather than returning NaN (finding #6)", () => {
    expect(() => median([])).toThrow();
    expect(median([3, 1, 2])).toBe(2);
  });

  it("committed golden snapshot passes with fixture-scale minimums", () => {
    const golden = JSON.parse(readFileSync("tests/golden/latest.json", "utf8"));
    expect(validateLatest(golden, { minMetros: 10, minZips: 10 }).ok).toBe(true);
  });
});
