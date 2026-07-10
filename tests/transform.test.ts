import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parseCsv } from "../src/etl/csv";
import { toRegionSeries, computeP2R } from "../src/etl/transform";
import { buildLatestJson, serialize } from "../src/etl/serialize";

// Inline synthetic CSVs for surgical edge cases; committed fixtures for the full pipeline.
const METRO_HEADER = "RegionID,SizeRank,RegionName,RegionType,StateName";
const ZIP_HEADER =
  "RegionID,SizeRank,RegionName,RegionType,StateName,State,City,Metro,CountyName";

const zhviMetroCsv = [
  `${METRO_HEADER},2025-03-31,2025-04-30,2025-05-31`,
  `102001,0,United States,country,,350000,351000,352000`,
  `394913,1,"New York, NY",msa,NY,600000,601000,602000`,
  `753899,2,"Los Angeles, CA",msa,CA,900000,905000,`,
  `394463,3,"Chicago, IL",msa,IL,300000,301000,302000`,
  `999001,4,"Zeroville, ZZ",msa,ZZ,120000,121000,122000`,
  `888001,5,"HouseOnly, HH",msa,HH,200000,201000,202000`,
].join("\n");

const zoriMetroCsv = [
  `${METRO_HEADER},2025-03-31,2025-04-30,2025-05-31`,
  `102001,0,United States,country,,1900,1910,1920`,
  `394913,1,"New York, NY",msa,NY,3000,3050,3100`,
  `753899,2,"Los Angeles, CA",msa,CA,2800,2850,2900`,
  `394463,3,"Chicago, IL",msa,IL,1800,1810,`,
  `999001,4,"Zeroville, ZZ",msa,ZZ,1000,1005,0`,
  `777001,9,"RentOnly, RR",msa,RR,1500,1510,1520`,
].join("\n");

describe("parseCsv — column detection & cell parsing", () => {
  it("detects date columns by regex, never positionally: metro = 5 meta cols", () => {
    const p = parseCsv(zhviMetroCsv);
    expect(p.metaCols).toEqual(METRO_HEADER.split(","));
    expect(p.dateCols).toEqual(["2025-03-31", "2025-04-30", "2025-05-31"]);
  });

  it("detects ZIP layout = 9 meta cols from the header, not hardcoded", () => {
    const csv = `${ZIP_HEADER},2025-04-30,2025-05-31\n58710,900,02301,zip,MA,MA,Brockton,"Boston, MA",Plymouth County,450000,451000`;
    const p = parseCsv(csv);
    expect(p.metaCols).toEqual(ZIP_HEADER.split(","));
    expect(p.dateCols).toEqual(["2025-04-30", "2025-05-31"]);
  });

  it("keeps RegionName a string, preserving leading zeros", () => {
    const csv = `${ZIP_HEADER},2025-05-31\n58710,900,02301,zip,MA,MA,Brockton,"Boston, MA",Plymouth County,450000`;
    const row = parseCsv(csv).rows[0];
    expect(row.meta.RegionName).toBe("02301");
  });

  it("preserves quoted commas in fields", () => {
    const p = parseCsv(zhviMetroCsv);
    expect(p.rows[1].meta.RegionName).toBe("New York, NY");
  });

  it("parses blank cells as null, never 0", () => {
    const p = parseCsv(zhviMetroCsv);
    const la = p.rows.find((r) => r.meta.RegionID === "753899")!;
    expect(la.values["2025-05-31"]).toBeNull();
    expect(la.values["2025-04-30"]).toBe(905000);
  });

  it("throws a clear error on an empty/headerless file, not an opaque TypeError (finding #7)", () => {
    // The etl runner bypasses validateCsvSchema, so a 0-byte cached CSV used to
    // crash deep in splitCsvLine(undefined). Fail fast with an intelligible message.
    expect(() => parseCsv("")).toThrow(/empty|header/i);
    expect(() => parseCsv("   \n")).toThrow(/empty|header/i);
  });

  it("parses non-numeric data cells as null, never 0 or NaN (finding #3)", () => {
    // Number(" ") === 0 (a fabricated value) and Number("NA") === NaN both
    // violate nulls-stay-null and corrupt latest-month selection downstream.
    const csv = [
      `${METRO_HEADER},2025-03-31,2025-04-30,2025-05-31`,
      `394913,1,"New York, NY",msa,NY,600000, ,NA`,
    ].join("\n");
    const row = parseCsv(csv).rows[0];
    expect(row.values["2025-03-31"]).toBe(600000);
    expect(row.values["2025-04-30"]).toBeNull(); // whitespace-only → null, not 0
    expect(row.values["2025-05-31"]).toBeNull(); // "NA" → null, not NaN
  });
});

describe("toRegionSeries — melt wide→long", () => {
  it("melts to per-region date→value maps and excludes the national country row", () => {
    const regions = toRegionSeries(parseCsv(zhviMetroCsv));
    expect(regions.has("102001")).toBe(false); // national row excluded
    expect(regions.get("394913")!.series["2025-05-31"]).toBe(602000);
    expect(regions.get("394913")!.meta.RegionName).toBe("New York, NY");
  });

  it("excludes the national row by region identity, not SizeRank (finding #10)", () => {
    // ZIP files carry no country row, but a legitimate ZIP could carry SizeRank 0.
    // Keying on SizeRank==="0" would wrongly drop it; key on RegionID/RegionType.
    const zipCsv = [
      `${ZIP_HEADER},2025-05-31`,
      // A real ZIP that happens to have SizeRank 0 — must be KEPT.
      `71535,0,00601,zip,PR,PR,Adjuntas,"San Juan, PR",Adjuntas,150000`,
    ].join("\n");
    const regions = toRegionSeries(parseCsv(zipCsv));
    expect(regions.has("71535")).toBe(true);

    // The metro national aggregate (RegionID 102001 / RegionType country) is dropped.
    const natCsv = [
      `${METRO_HEADER},2025-05-31`,
      `102001,0,United States,country,,350000`,
      `394913,1,"New York, NY",msa,NY,600000`,
    ].join("\n");
    const metro = toRegionSeries(parseCsv(natCsv));
    expect(metro.has("102001")).toBe(false);
    expect(metro.has("394913")).toBe(true);
  });
});

describe("computeP2R — join, shared latest month, ratio", () => {
  const zhvi = toRegionSeries(parseCsv(zhviMetroCsv));
  const zori = toRegionSeries(parseCsv(zoriMetroCsv));
  const { records, audit } = computeP2R(zhvi, zori);
  const byId = Object.fromEntries(records.map((r) => [r.regionId, r]));

  it("inner-joins on RegionID; one-sided regions go to audit counts, not records", () => {
    expect(byId["888001"]).toBeUndefined(); // ZHVI-only
    expect(byId["777001"]).toBeUndefined(); // ZORI-only
    expect(audit.zhviOnly).toBe(1);
    expect(audit.zoriOnly).toBe(1);
    expect(audit.joined).toBe(records.length);
  });

  it("uses the latest month where BOTH series are non-null (lexical compare, no Date)", () => {
    expect(byId["394913"].month).toBe("2025-05"); // both full
    expect(byId["753899"].month).toBe("2025-04"); // ZHVI blank May
    expect(byId["394463"].month).toBe("2025-04"); // ZORI blank May
  });

  it("computes ratio = ZHVI / (ZORI × 12) at the shared month, 2-decimal precision", () => {
    // New York 2025-05: 602000 / (3100 * 12) = 16.182... → 16.18
    expect(byId["394913"].ratio).toBe(16.18);
    expect(byId["394913"].zhvi).toBe(602000);
    expect(byId["394913"].zori).toBe(3100);
  });

  it("zero rent at the shared month emits no record (no Infinity/NaN), counted in audit", () => {
    expect(byId["999001"]).toBeUndefined();
    expect(audit.zeroRent).toBe(1);
    for (const r of records) expect(Number.isFinite(r.ratio)).toBe(true);
  });

  it("emits records sorted lexically by RegionID", () => {
    const ids = records.map((r) => r.regionId);
    expect(ids).toEqual([...ids].sort());
  });
});

describe("serialize — deterministic latest.json", () => {
  const zhvi = toRegionSeries(parseCsv(zhviMetroCsv));
  const zori = toRegionSeries(parseCsv(zoriMetroCsv));
  const metro = computeP2R(zhvi, zori);
  const emptyAudit = {
    joined: 0,
    zhviOnly: 0,
    zoriOnly: 0,
    zeroRent: 0,
    noSharedMonth: 0,
  };
  const doc = buildLatestJson({
    metro,
    zip: { records: [], audit: emptyAudit },
  });

  it("snapshotMonth = lexical max of record months (YYYY-MM)", () => {
    expect(doc.meta.snapshotMonth).toBe("2025-05");
  });

  it("serializes LF-only with trailing newline and no locale formatting", () => {
    const text = serialize(doc);
    expect(text.includes("\r")).toBe(false);
    expect(text.endsWith("\n")).toBe(true);
    expect(text).not.toMatch(/\d,\d{3}/); // no thousands separators
  });

  it("is byte-identical across repeated runs (determinism, constitution VI)", () => {
    const again = serialize(
      buildLatestJson({
        metro: computeP2R(
          toRegionSeries(parseCsv(zhviMetroCsv)),
          toRegionSeries(parseCsv(zoriMetroCsv)),
        ),
        zip: { records: [], audit: emptyAudit },
      }),
    );
    expect(again).toBe(serialize(doc));
  });
});

describe("full pipeline on committed fixtures", () => {
  const load = (f: string) =>
    parseCsv(readFileSync(`tests/fixtures/${f}`, "utf8"));
  const metro = computeP2R(
    toRegionSeries(load("zhvi-metro.csv")),
    toRegionSeries(load("zori-metro.csv")),
  );
  const zip = computeP2R(
    toRegionSeries(load("zhvi-zip.csv")),
    toRegionSeries(load("zori-zip.csv")),
  );

  it("metro fixture: 15 joined, 2 ZHVI-only, 1 ZORI-only, national row excluded", () => {
    expect(metro.audit).toMatchObject({ joined: 15, zhviOnly: 2, zoriOnly: 1 });
    expect(metro.records.find((r) => r.regionId === "102001")).toBeUndefined();
  });

  it("zip fixture: 14 joined, 1 ZHVI-only; leading-zero ZIP names intact", () => {
    expect(zip.audit).toMatchObject({ joined: 14, zhviOnly: 1, zoriOnly: 0 });
    const lz = zip.records.filter((r) => /^0/.test(r.regionName));
    expect(lz.length).toBeGreaterThanOrEqual(3);
  });

  it("blank trailing months fall back to an earlier shared month", () => {
    // 60647 (ZIP 07310) has a blank last ZHVI month in the fixture snapshot
    const jc = zip.records.find((r) => r.regionId === "60647")!;
    expect(jc).toBeDefined();
    const months = zip.records.map((r) => r.month);
    expect(jc.month < months.reduce((a, b) => (a > b ? a : b))).toBe(true);
  });

  it("metro ratios sit in a plausible aggregated band; ZIP ratios are finite and positive", () => {
    // Metros are index aggregates — a tight band is a real invariant (fixture range 13.0–29.4).
    // ZIP-level ZORI is thin in tiny luxury ZIPs and produces legitimate outliers
    // (fixture: ZIP 92662 Balboa Island, ZHVI $4.29M / ZORI $1,953 → ratio 182.92),
    // so hard ZIP bounds belong to B.3's RATIO_RANGE gate design, not the transform.
    for (const r of metro.records) {
      expect(r.ratio).toBeGreaterThan(5);
      expect(r.ratio).toBeLessThan(60);
    }
    for (const r of zip.records) {
      expect(Number.isFinite(r.ratio)).toBe(true);
      expect(r.ratio).toBeGreaterThan(0);
    }
  });
});
