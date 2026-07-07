// Zillow metro RegionID -> Census CBSA GEOID concordance, derived from Zillow's
// published CountyCrossWalk_Zillow.csv (see scripts/etl/build-crosswalk.ts).
// Zillow region IDs != CBSA codes everywhere — this file is the only bridge.
import { readFileSync } from "node:fs";
import { splitCsvLine } from "./csv";

export function loadCrosswalk(path: string): Map<string, string> {
  const lines = readFileSync(path, "utf8").split("\n").filter(Boolean);
  const header = splitCsvLine(lines[0]);
  const iRegion = header.indexOf("RegionID");
  const iCbsa = header.indexOf("CBSACode");
  if (iRegion === -1 || iCbsa === -1)
    throw new Error(`crosswalk ${path} missing RegionID/CBSACode header`);
  const map = new Map<string, string>();
  for (const line of lines.slice(1)) {
    const f = splitCsvLine(line);
    map.set(f[iRegion], f[iCbsa]);
  }
  return map;
}
