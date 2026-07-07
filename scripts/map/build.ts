// Build the prebuilt SVG national choropleth (ADR-0004: no MapLibre/PMTiles in V1).
//   map:build -- --fixtures  → joins tests/golden/latest.json (canonical fixture output)
//   map:build                → joins data/latest.json (live, Phase D)
// One <path> per joined metro, class from P2R bin + data-region-id; paths sorted
// by RegionID, coordinates at fixed precision (d3-geo digits) — byte-identical
// across runs (constitution VI). Metros that fail the crosswalk/boundary join are
// LISTED on stderr, never dropped silently (approval note 4); map:verify enforces
// path count == joined-metro count.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { geoAlbersUsa, geoPath } from "d3-geo";
import { loadCrosswalk } from "../../src/etl/crosswalk";
import type { LatestJson } from "../../src/etl/serialize";

const fixtures = process.argv.includes("--fixtures");
const latestPath = fixtures ? "tests/golden/latest.json" : "data/latest.json";
const OUT = "data/map/metro-map.svg";

// P2R bins (years of gross rent to equal price). Thresholds are stable, round
// numbers; class → color mapping is a Phase C.1 styling concern.
const BINS = [12, 16, 20, 25];
const binClass = (ratio: number) => `p2r-b${BINS.filter((t) => ratio >= t).length + 1}`;

const latest: LatestJson = JSON.parse(readFileSync(latestPath, "utf8"));
const crosswalk = loadCrosswalk("data/crosswalk/metro-cbsa.csv");
const boundaries = JSON.parse(readFileSync("data/boundaries/cbsa.geojson", "utf8"));

const featureByGeoid = new Map<string, GeoJSON.Feature>(
  boundaries.features.map((f: GeoJSON.Feature) => [String(f.properties!.GEOID), f]),
);

// Standard US map frame (geoAlbersUsa composite handles AK/HI insets).
const projection = geoAlbersUsa().scale(1300).translate([487.5, 305]);
const path = geoPath(projection).digits(2);

const unmatched: string[] = [];
const paths: string[] = [];
for (const m of latest.metros) {
  // metros[] is already RegionID-sorted (transform contract) — path order follows it.
  const geoid = crosswalk.get(m.regionId);
  const feature = geoid ? featureByGeoid.get(geoid) : undefined;
  const d = feature ? path(feature) : null;
  if (!d) {
    unmatched.push(`${m.regionId} (${m.regionName}) -> ${geoid ?? "NO CROSSWALK ENTRY"}`);
    continue;
  }
  const title = `${m.regionName} — P2R ${m.ratio} (${m.month})`;
  paths.push(
    `  <path d="${d}" class="${binClass(m.ratio)}" data-region-id="${m.regionId}" data-ratio="${m.ratio}"><title>${title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</title></path>`,
  );
}

if (unmatched.length > 0) {
  process.stderr.write(`MAP_BUILD: ${unmatched.length} metro(s) failed the boundary join:\n`);
  for (const u of unmatched) process.stderr.write(`  ${u}\n`);
}

// Neutral placeholder ramp so the SVG previews standalone; real palette lands in C.1.
const svg = [
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 975 610" role="img" aria-label="US metro price-to-rent choropleth" data-source="${fixtures ? "fixtures" : "live"}" data-snapshot-month="${latest.meta.snapshotMonth}" data-joined-count="${latest.metros.length}">`,
  `  <style>path{stroke:#fff;stroke-width:.5}.p2r-b1{fill:#d9d9d9}.p2r-b2{fill:#bdbdbd}.p2r-b3{fill:#969696}.p2r-b4{fill:#636363}.p2r-b5{fill:#252525}</style>`,
  ...paths,
  `</svg>`,
].join("\n") + "\n";

mkdirSync("data/map", { recursive: true });
writeFileSync(OUT, svg);
console.log(`${OUT}: ${paths.length}/${latest.metros.length} metro paths (${fixtures ? "fixtures" : "live"})`);
if (unmatched.length > 0) process.exit(1);
