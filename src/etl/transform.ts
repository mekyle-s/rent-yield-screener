// Core P2R transform: melt wide rows to per-region series, inner-join ZHVI×ZORI
// on RegionID, pick the latest month where BOTH series are non-null, compute
// ratio = ZHVI ÷ (ZORI × 12). Determinism (constitution VI): months compared
// lexically as YYYY-MM-DD strings (never Date), output sorted lexically by
// RegionID, fixed decimal precision.
import type { ParsedCsv } from "./csv";

export interface RegionSeries {
  meta: Record<string, string>;
  series: Record<string, number | null>;
  dateCols: string[]; // ascending, as in the source header
}

export interface P2RRecord {
  regionId: string;
  regionName: string;
  stateName: string;
  month: string; // YYYY-MM
  zhvi: number;
  zori: number;
  ratio: number;
}

export interface JoinAudit {
  joined: number;
  zhviOnly: number;
  zoriOnly: number;
  zeroRent: number;
  noSharedMonth: number;
}

export interface P2RResult {
  records: P2RRecord[];
  audit: JoinAudit;
}

const round = (x: number, decimals: number) => Number(x.toFixed(decimals));

// Melt wide→long keyed by RegionID; the national aggregate is excluded.
// Key on region IDENTITY (RegionID 102001 / RegionType "country"), NOT SizeRank
// (finding #10): SizeRank 0 is the national row in metro files, but a legitimate
// ZIP could carry SizeRank 0 and must not be dropped.
const NATIONAL_REGION_ID = "102001";
export function toRegionSeries(parsed: ParsedCsv): Map<string, RegionSeries> {
  const out = new Map<string, RegionSeries>();
  for (const row of parsed.rows) {
    if (
      row.meta.RegionID === NATIONAL_REGION_ID ||
      row.meta.RegionType === "country"
    )
      continue;
    out.set(row.meta.RegionID, {
      meta: row.meta,
      series: row.values,
      dateCols: parsed.dateCols,
    });
  }
  return out;
}

export function computeP2R(
  zhvi: Map<string, RegionSeries>,
  zori: Map<string, RegionSeries>,
): P2RResult {
  const audit: JoinAudit = {
    joined: 0,
    zhviOnly: 0,
    zoriOnly: 0,
    zeroRent: 0,
    noSharedMonth: 0,
  };
  const records: P2RRecord[] = [];

  for (const id of zori.keys()) if (!zhvi.has(id)) audit.zoriOnly++;

  for (const [id, h] of zhvi) {
    const r = zori.get(id);
    if (!r) {
      audit.zhviOnly++;
      continue;
    }
    // Latest shared non-null month: walk ZHVI's date columns (ascending) from the
    // end; lexical YYYY-MM-DD comparison is implicit in the column order.
    let month: string | null = null;
    for (let i = h.dateCols.length - 1; i >= 0; i--) {
      const d = h.dateCols[i];
      if (h.series[d] != null && r.series[d] != null) {
        month = d;
        break;
      }
    }
    if (month === null) {
      audit.noSharedMonth++;
      continue;
    }
    const zhviVal = h.series[month]!;
    const zoriVal = r.series[month]!;
    if (zoriVal === 0) {
      audit.zeroRent++;
      continue;
    }
    records.push({
      regionId: id,
      regionName: h.meta.RegionName,
      stateName: h.meta.StateName,
      month: month.slice(0, 7),
      zhvi: round(zhviVal, 0),
      zori: round(zoriVal, 0),
      ratio: round(zhviVal / (zoriVal * 12), 2),
    });
  }

  records.sort((a, b) =>
    a.regionId < b.regionId ? -1 : a.regionId > b.regionId ? 1 : 0,
  );
  audit.joined = records.length;
  return { records, audit };
}
