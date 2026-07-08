// Derive data/boundaries/cbsa.geojson from the Census CBSA cartographic boundary
// shapefile (cb_2023_us_cbsa_500k.zip, cached in .cache/). Public-domain source.
// 8% simplification + 0.001° precision keeps all 935 CBSAs at ~750KB — build-time
// input only, never shipped to the client (ADR-0004). Regenerable + deterministic:
// same zip + same flags → byte-identical output.
//
// `gj2008` (review finding #1): emit GeoJSON-2008 ring winding (clockwise outer
// rings), NOT the RFC 7946 default (counterclockwise). d3-geo reads a CCW outer
// ring as the SPHERICAL COMPLEMENT, so every metro would render as its inverse
// (filling the whole canvas with the metro punched out). CW rings are d3's
// convention; map:verify's geometry guard enforces the result.
import { mkdirSync, existsSync } from "node:fs";
import mapshaper from "mapshaper";

const SRC = ".cache/cb_2023_us_cbsa_500k.zip";
const OUT = "data/boundaries/cbsa.geojson";

if (!existsSync(SRC)) {
  process.stderr.write(
    `FETCH_INTEGRITY: missing ${SRC} — download https://www2.census.gov/geo/tiger/GENZ2023/shp/cb_2023_us_cbsa_500k.zip first\n`,
  );
  process.exit(1);
}

mkdirSync("data/boundaries", { recursive: true });
await mapshaper.runCommands(
  `-i ${SRC} -filter-fields GEOID,NAME -simplify 8% keep-shapes -o precision=0.001 gj2008 format=geojson ${OUT}`,
);
console.log(`wrote ${OUT}`);
