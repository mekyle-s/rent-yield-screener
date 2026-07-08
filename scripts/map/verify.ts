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
let latest: { metros: { regionId: string; regionName: string }[] };
try {
  // Guarded so a missing/corrupt latest.json speaks the MAP_VERIFY: token
  // instead of a raw ENOENT/parse stack trace (finding #8, amended B.4 contract).
  latest = JSON.parse(readFileSync(latestPath, "utf8"));
} catch (e) {
  die(`cannot read ${latestPath} (${(e as Error).message})`);
}
const joined: number = latest.metros.length;

const viewBox = svg.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/);
if (!viewBox) die("SVG missing viewBox");
const vbW = Number(viewBox[1]);
const vbH = Number(viewBox[2]);

const pathTags = svg.match(/<path\b[^>]*>/g) ?? [];
const paths = pathTags.length;

for (const tag of pathTags) {
  if (!/class="p2r-b\d"/.test(tag)) die(`path missing fill class: ${tag.slice(0, 120)}`);
  if (!/data-region-id="[^"]+"/.test(tag)) die(`path missing data-region-id: ${tag.slice(0, 120)}`);
  // Geometry guard (finding #1): a complemented ring (RFC 7946 winding read by
  // d3-geo) is emitted as the clip-extent rectangle spanning the whole canvas.
  // No real metro path can span the full viewBox — reject any that does.
  const d = tag.match(/\bd="([^"]*)"/)?.[1] ?? "";
  const nums = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i + 1 < nums.length; i += 2) {
    minX = Math.min(minX, nums[i]);
    maxX = Math.max(maxX, nums[i]);
    minY = Math.min(minY, nums[i + 1]);
    maxY = Math.max(maxY, nums[i + 1]);
  }
  const rid = tag.match(/data-region-id="([^"]+)"/)?.[1] ?? "?";
  if (maxX - minX >= vbW && maxY - minY >= vbH)
    die(`path ${rid} spans the full viewBox (complemented ring — check boundary winding): ${d.slice(0, 60)}`);
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
