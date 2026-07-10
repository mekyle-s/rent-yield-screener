// Canonical latest.json builder + serializer. Key order is fixed by construction,
// output is LF-only with a trailing newline, and JSON.stringify never applies
// locale formatting — byte-identity across platforms is asserted by the committed
// golden snapshot in CI (constitution VI).
import type { P2RResult } from "./transform";

export interface LatestJson {
  meta: {
    snapshotMonth: string; // YYYY-MM, lexical max across all joined records
    audit: { metro: P2RResult["audit"]; zip: P2RResult["audit"] };
  };
  metros: P2RResult["records"];
  zips: P2RResult["records"];
}

export function buildLatestJson(input: {
  metro: P2RResult;
  zip: P2RResult;
}): LatestJson {
  const months = [...input.metro.records, ...input.zip.records].map(
    (r) => r.month,
  );
  const snapshotMonth = months.reduce((a, b) => (a > b ? a : b), "");
  return {
    meta: {
      snapshotMonth,
      audit: { metro: input.metro.audit, zip: input.zip.audit },
    },
    metros: input.metro.records,
    zips: input.zip.records,
  };
}

export function serialize(doc: LatestJson): string {
  return JSON.stringify(doc, null, 2) + "\n";
}
