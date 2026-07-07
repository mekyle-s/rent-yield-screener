import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parseCsv } from "../src/etl/csv";
import { loadCrosswalk } from "../src/etl/crosswalk";

// data/crosswalk/metro-cbsa.csv is derived from Zillow's published
// CountyCrossWalk_Zillow.csv (MetroRegionID_Zillow <-> CBSACode) — an ID
// concordance from the data publisher, no name-matching (approval note 4).

describe("metro-cbsa crosswalk", () => {
  const cw = loadCrosswalk("data/crosswalk/metro-cbsa.csv");

  it("maps known metros to their CBSA GEOIDs", () => {
    expect(cw.get("394913")).toBe("35620"); // New York
    expect(cw.get("753899")).toBe("31080"); // Los Angeles
    expect(cw.get("394463")).toBe("16980"); // Chicago
  });

  it("covers every joined metro in the golden snapshot (100% or fail loudly)", () => {
    const golden = JSON.parse(readFileSync("tests/golden/latest.json", "utf8"));
    const unmatched = golden.metros.filter((m: { regionId: string }) => !cw.has(m.regionId));
    expect(unmatched).toEqual([]);
  });

  it("is 1:1 — no Zillow metro maps to multiple CBSAs, no CBSA repeats", () => {
    const cbsas = [...cw.values()];
    expect(new Set(cbsas).size).toBe(cbsas.length);
  });

  it("file is sorted lexically by RegionID with LF endings (determinism)", () => {
    const text = readFileSync("data/crosswalk/metro-cbsa.csv", "utf8");
    expect(text.includes("\r")).toBe(false);
    const ids = parseCsv(text).rows.map((r) => r.meta.RegionID);
    expect(ids).toEqual([...ids].sort());
  });
});
