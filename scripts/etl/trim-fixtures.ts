// Trim raw Zillow CSVs (.cache/zillow-raw/) into small committed fixtures
// (tests/fixtures/). Rows are copied VERBATIM (headers + all date columns intact,
// LF-normalized) so tests face the real schema. Selection is rule-based, not
// hardcoded IDs, so fixtures are regenerable from any raw snapshot.
//
// Selection rules (per PROGRESS.md edge-case requirements):
//   metro:  national row (SizeRank 0) + top-15 metros by SizeRank
//           + first 2 ZHVI-only metros + first 1 ZORI-only metro (by RegionID)
//   zip:    top-10 ZIPs by SizeRank present in BOTH series
//           + first leading-zero ZIP present in both + first leading-zero ZIP in ZHVI only
//           + every row with a blank trailing month (both series, ZHVI rows of
//             ZORI's blank-trailing ZIPs included so the join sees them)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const RAW = ".cache/zillow-raw";
const OUT = "tests/fixtures";

// Quote-aware CSV field splitter (RegionName can contain commas, e.g. "New York, NY").
function fields(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') inQuotes = false;
      else cur += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out;
}

type Row = {
  line: string;
  id: string;
  sizeRank: number;
  name: string;
  blankLast: boolean;
};

function load(file: string): { header: string; rows: Row[] } {
  const lines = readFileSync(`${RAW}/${file}`, "utf8")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((l) => l.length > 0);
  const [header, ...rest] = lines;
  const rows = rest.map((line) => {
    const f = fields(line);
    return {
      line,
      id: f[0],
      sizeRank: Number(f[1]),
      name: f[2],
      blankLast: line.endsWith(","),
    };
  });
  return { header, rows };
}

function write(file: string, header: string, rows: Row[]) {
  // Preserve raw file order (SizeRank order) for realism; LF-only per constitution VI.
  writeFileSync(
    `${OUT}/${file}`,
    [header, ...rows.map((r) => r.line)].join("\n") + "\n",
  );
  console.log(`${file}: ${rows.length} data rows`);
}

const zhviMetro = load("zhvi-metro.csv");
const zoriMetro = load("zori-metro.csv");
const zhviZip = load("zhvi-zip.csv");
const zoriZip = load("zori-zip.csv");

mkdirSync(OUT, { recursive: true });

// --- metro selection ---
const zoriMetroIds = new Set(zoriMetro.rows.map((r) => r.id));
const zhviMetroIds = new Set(zhviMetro.rows.map((r) => r.id));
// Lexical, NOT localeCompare (finding #11): this sort picks WHICH rows become
// fixtures, so locale-dependent collation could select different rows on
// regeneration. Every other sort in the repo compares YYYY-MM-DD/IDs lexically
// (constitution VI determinism).
const byId = (a: Row, b: Row) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

const metroCore = zhviMetro.rows.filter((r) => r.sizeRank <= 15); // includes SizeRank-0 national row
const zhviOnlyMetros = zhviMetro.rows
  .filter((r) => !zoriMetroIds.has(r.id))
  .sort(byId)
  .slice(0, 2);
const zoriOnlyMetros = zoriMetro.rows
  .filter((r) => !zhviMetroIds.has(r.id))
  .sort(byId)
  .slice(0, 1);

const metroIds = new Set([...metroCore, ...zhviOnlyMetros].map((r) => r.id));
write(
  "zhvi-metro.csv",
  zhviMetro.header,
  zhviMetro.rows.filter((r) => metroIds.has(r.id)),
);
write(
  "zori-metro.csv",
  zoriMetro.header,
  zoriMetro.rows.filter(
    (r) => metroIds.has(r.id) || zoriOnlyMetros.some((z) => z.id === r.id),
  ),
);

// --- zip selection ---
const zoriZipIds = new Set(zoriZip.rows.map((r) => r.id));
const leadingZero = (r: Row) => /^0/.test(r.name);

const zipCore = zhviZip.rows
  .filter((r) => zoriZipIds.has(r.id))
  .sort((a, b) => a.sizeRank - b.sizeRank)
  .slice(0, 10);
const lzBoth = zhviZip.rows
  .filter((r) => leadingZero(r) && zoriZipIds.has(r.id))
  .sort(byId)
  .slice(0, 1);
const lzZhviOnly = zhviZip.rows
  .filter((r) => leadingZero(r) && !zoriZipIds.has(r.id))
  .sort(byId)
  .slice(0, 1);
const blankZhvi = zhviZip.rows.filter((r) => r.blankLast);
const blankZori = zoriZip.rows.filter((r) => r.blankLast);
const blankZoriIds = new Set(blankZori.map((r) => r.id));
const blankZoriInZhvi = zhviZip.rows.filter((r) => blankZoriIds.has(r.id));

const zipIds = new Set(
  [...zipCore, ...lzBoth, ...lzZhviOnly, ...blankZhvi, ...blankZoriInZhvi].map(
    (r) => r.id,
  ),
);
write(
  "zhvi-zip.csv",
  zhviZip.header,
  zhviZip.rows.filter((r) => zipIds.has(r.id)),
);
write(
  "zori-zip.csv",
  zoriZip.header,
  zoriZip.rows.filter((r) => zipIds.has(r.id)),
);
