import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export interface RegionRecord {
  regionId: string;
  regionName: string;
  stateName: string;
  month: string;
  zhvi: number;
  zori: number;
  ratio: number;
}

export interface Latest {
  meta: { snapshotMonth: string };
  metros: RegionRecord[];
  zips: RegionRecord[];
}

// Phase C serves the committed fixture-derived snapshot (tests/golden/ is the
// committed data artifact; data/latest.json is the gitignored LIVE location).
// Phase D swaps this single import site to data/latest.json.
export const latest: Latest = JSON.parse(
  readFileSync(resolve(process.cwd(), "tests/golden/latest.json"), "utf8"),
);
