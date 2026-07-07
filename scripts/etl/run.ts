// ETL CLI: --input <dir of 4 CSVs> --out <dir> → writes <out>/latest.json.
// Byte-identity across runs and platforms is the contract (constitution VI);
// CI diffs this output against the committed golden snapshot.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { parseCsv } from "../../src/etl/csv";
import { toRegionSeries, computeP2R } from "../../src/etl/transform";
import { buildLatestJson, serialize } from "../../src/etl/serialize";

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(name);
  return i !== -1 ? args[i + 1] : undefined;
};

const input = flag("--input");
const out = flag("--out");
if (!input || !out) {
  process.stderr.write("usage: etl --input <dir> --out <dir>\n");
  process.exit(1);
}

const load = (f: string) => parseCsv(readFileSync(join(input, f), "utf8"));

const metro = computeP2R(toRegionSeries(load("zhvi-metro.csv")), toRegionSeries(load("zori-metro.csv")));
const zip = computeP2R(toRegionSeries(load("zhvi-zip.csv")), toRegionSeries(load("zori-zip.csv")));

mkdirSync(out, { recursive: true });
writeFileSync(join(out, "latest.json"), serialize(buildLatestJson({ metro, zip })));
console.log(
  `latest.json written: ${metro.records.length} metros, ${zip.records.length} zips`,
);
