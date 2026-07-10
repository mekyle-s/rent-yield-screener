// Validation CLI (ROADMAP B.3).
//   etl:validate <csv> [...]        → schema-check each CSV
//   etl:validate --latest <path>    → rowcount + ratio-range checks on latest.json
//   etl:validate                    → both, on default paths (.cache/zillow-raw + data/latest.json)
// One error token per failure on stderr, exit 1 (fail fast).
import { readFileSync, existsSync } from "node:fs";
import { validateCsvSchema, validateLatest } from "../../src/etl/validate";

const args = process.argv.slice(2);
// Support both `--flag value` and `--flag=value` (finding #5): the equals form
// was silently dropped by an indexOf-only lookup, falling back to the default.
const flag = (name: string) => {
  const eq = args.find((a) => a.startsWith(`${name}=`));
  if (eq !== undefined) return eq.slice(name.length + 1);
  const i = args.indexOf(name);
  return i !== -1 ? args[i + 1] : undefined;
};
const num = (name: string, dflt: number) => {
  const v = flag(name);
  if (v === undefined) return dflt;
  const n = Number(v);
  // A non-numeric threshold (e.g. "5,000" → NaN) must NOT silently disable the
  // gate: `count < NaN` is always false, so a coverage collapse would validate OK.
  if (!Number.isFinite(n)) {
    process.stderr.write(`usage: ${name} expects a number, got "${v}"\n`);
    process.exit(1);
  }
  return n;
};

// Live-scale defaults: current data has ~722 joined metros and ~8.4K rent ZIPs;
// dropping below these means Zillow coverage collapsed or the join broke.
const minMetros = num("--min-metros", 500);
const minZips = num("--min-zips", 5000);

function die(token: string, detail: string): never {
  process.stderr.write(`${token} ${detail}\n`);
  process.exit(1);
}

// A positional is a CSV path unless it's the VALUE of a space-form flag. Only a
// bare `--flag` (no `=`) consumes the next arg; `--flag=value` carries its own
// value, so the arg after it is a real path and must not be swallowed (equals-form
// regression uncovered in the finding-#5 review).
const csvPaths = args.filter(
  (a, i) =>
    !a.startsWith("--") &&
    !(args[i - 1]?.startsWith("--") && !args[i - 1]!.includes("=")),
);
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
    die(
      "FETCH_INTEGRITY:",
      `no inputs to validate — expected ${expected.join(", ")} or data/latest.json`,
    );
  csvPaths.push(...defaults);
  if (hasLatest) {
    const res = validateLatest(
      JSON.parse(readFileSync("data/latest.json", "utf8")),
      { minMetros, minZips },
    );
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
  const res = validateLatest(JSON.parse(readFileSync(latestPath, "utf8")), {
    minMetros,
    minZips,
  });
  if (!res.ok) die(res.token, `${res.detail} (${latestPath})`);
  console.log(`latest.json OK ${latestPath}`);
}
