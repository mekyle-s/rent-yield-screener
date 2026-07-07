// map:verify (ROADMAP B.4, output contract per approval note 3):
//   pass → prints `PATHS=<n> JOINED=<n> OK`, exit 0
//   fail → prints `MAP_VERIFY: <reason>` to stderr, exit 1
// Asserts: path count == joined-metro count of the latest.json the map was built
// from (data-source attribute), and every path carries a fill class + data-region-id.
import { readFileSync } from "node:fs";

const SVG = "data/map/metro-map.svg";

function die(reason: string): never {
  process.stderr.write(`MAP_VERIFY: ${reason}\n`);
  process.exit(1);
}

let svg: string;
try {
  svg = readFileSync(SVG, "utf8");
} catch {
  die(`cannot read ${SVG} — run map:build first`);
}

const source = svg.match(/data-source="(fixtures|live)"/)?.[1];
if (!source) die("SVG missing data-source attribute");
const latestPath = source === "fixtures" ? "tests/golden/latest.json" : "data/latest.json";
const latest = JSON.parse(readFileSync(latestPath, "utf8"));
const joined: number = latest.metros.length;

const pathTags = svg.match(/<path\b[^>]*>/g) ?? [];
const paths = pathTags.length;

for (const tag of pathTags) {
  if (!/class="p2r-b\d"/.test(tag)) die(`path missing fill class: ${tag.slice(0, 120)}`);
  if (!/data-region-id="[^"]+"/.test(tag)) die(`path missing data-region-id: ${tag.slice(0, 120)}`);
}

const ids = pathTags.map((t) => t.match(/data-region-id="([^"]+)"/)![1]);
if (new Set(ids).size !== ids.length) die("duplicate data-region-id in SVG");

if (paths !== joined) {
  const missing = latest.metros
    .map((m: { regionId: string; regionName: string }) => m)
    .filter((m: { regionId: string }) => !ids.includes(m.regionId))
    .map((m: { regionId: string; regionName: string }) => `${m.regionId} (${m.regionName})`);
  die(`PATHS=${paths} != JOINED=${joined}; missing: ${missing.join(", ") || "(extra paths present)"}`);
}

console.log(`PATHS=${paths} JOINED=${joined} OK`);
