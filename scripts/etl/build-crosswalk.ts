// Derive data/crosswalk/metro-cbsa.csv from Zillow's published county crosswalk
// (https://files.zillowstatic.com/research/public/CountyCrossWalk_Zillow.csv,
// cached in .cache/zillow-raw/). ID concordance only — no name-matching.
// Output: RegionID,CBSACode sorted lexically by RegionID, LF-only.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { splitCsvLine } from "../../src/etl/csv";

const SRC = ".cache/zillow-raw/county-crosswalk.csv";
const OUT = "data/crosswalk/metro-cbsa.csv";

const lines = readFileSync(SRC, "utf8").replace(/\r\n/g, "\n").split("\n").filter(Boolean);
const header = splitCsvLine(lines[0]);
const iMetro = header.indexOf("MetroRegionID_Zillow");
const iCbsa = header.indexOf("CBSACode");
if (iMetro === -1 || iCbsa === -1) {
  process.stderr.write("SCHEMA_VIOLATION: county crosswalk missing MetroRegionID_Zillow/CBSACode\n");
  process.exit(1);
}

const pairs = new Map<string, string>();
for (const line of lines.slice(1)) {
  const f = splitCsvLine(line);
  const metro = f[iMetro];
  const cbsa = f[iCbsa];
  if (!metro || !cbsa) continue; // counties outside any CBSA
  const prev = pairs.get(metro);
  if (prev && prev !== cbsa) {
    process.stderr.write(`SCHEMA_VIOLATION: metro ${metro} maps to both CBSA ${prev} and ${cbsa}\n`);
    process.exit(1);
  }
  pairs.set(metro, cbsa);
}

const rows = [...pairs.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
mkdirSync("data/crosswalk", { recursive: true });
writeFileSync(OUT, ["RegionID,CBSACode", ...rows.map(([m, c]) => `${m},${c}`)].join("\n") + "\n");
console.log(`${OUT}: ${rows.length} metro->CBSA pairs`);
