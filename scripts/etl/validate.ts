// Validation CLI (ROADMAP B.3).
//   etl:validate <csv> [...]        → schema-check each CSV
//   etl:validate --latest <path>    → rowcount + ratio-range checks on latest.json
//   etl:validate                    → both, on default paths (.cache/zillow-raw + data/latest.json)
// One error token per failure on stderr, exit 1 (fail fast).
import { readFileSync, existsSync } from "node:fs";
import { validateCsvSchema, validateLatest } from "../../src/etl/validate";

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(name);
  return i !== -1 ? args[i + 1] : undefined;
};
const num = (name: string, dflt: number) => {
  const v = flag(name);
  return v === undefined ? dflt : Number(v);
};

// Live-scale defaults: current data has ~722 joined metros and ~8.4K rent ZIPs;
// dropping below these means Zillow coverage collapsed or the join broke.
const minMetros = num("--min-metros", 500);
const minZips = num("--min-zips", 5000);

function die(token: string, detail: string): never {
  process.stderr.write(`${token} ${detail}\n`);
  process.exit(1);
}

const csvPaths = args.filter((a, i) => !a.startsWith("--") && args[i - 1]?.startsWith("--") !== true);
const latestPath = flag("--latest");

if (csvPaths.length === 0 && !latestPath) {
  // Default mode (D.1: `npm run etl:live && npm run etl:validate`)
  const expected = [
    ".cache/zillow-raw/zhvi-metro.csv",
    ".cache/zillow-raw/zhvi-zip.csv",
    ".cache/zillow-raw/zori-metro.csv",
    ".cache/zillow-raw/zori-zip.csv",
  ];
  const defaults = expected.filter(existsSync);
  // Vacuous-pass guard (finding #2): default mode must never exit 0 having
  // validated nothing. A cleared cache or a fetch that wrote elsewhere means the
  // publish must FAIL loudly, not proceed on unvalidated/nonexistent data.
  const hasLatest = existsSync("data/latest.json");
  if (defaults.length === 0 && !hasLatest)
    die("FETCH_INTEGRITY:", `no inputs to validate — expected ${expected.join(", ")} or data/latest.json`);
  csvPaths.push(...defaults);
  if (hasLatest) {
    const res = validateLatest(JSON.parse(readFileSync("data/latest.json", "utf8")), { minMetros, minZips });
    if (!res.ok) die(res.token, res.detail);
    console.log("latest.json OK (data/latest.json)");
  }
}

for (const p of csvPaths) {
  const res = validateCsvSchema(readFileSync(p, "utf8"));
  if (!res.ok) die(res.token, `${res.detail} (${p})`);
  console.log(`schema OK ${p}`);
}

if (latestPath) {
  const res = validateLatest(JSON.parse(readFileSync(latestPath, "utf8")), { minMetros, minZips });
  if (!res.ok) die(res.token, `${res.detail} (${latestPath})`);
  console.log(`latest.json OK ${latestPath}`);
}
