import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Script-level regression tests for the ETL/map CLIs (review findings 2, 5, 7, 8, 9).
// These exercise the argv/exit-code/error-token contracts the unit tests can't reach.
import { readFileSync, existsSync, renameSync } from "node:fs";

const ROOT = process.cwd();
const VALIDATE = join(ROOT, "scripts/etl/validate.ts");
const BUILD_CROSSWALK = join(ROOT, "scripts/etl/build-crosswalk.ts");
const MAP_VERIFY = join(ROOT, "scripts/map/verify.ts");
const FETCH = join(ROOT, "scripts/etl/fetch.ts");

// Run a CLI via tsx. Returns { status, stdout, stderr }. Never throws on non-zero exit.
function runCli(script: string, args: string[], cwd = ROOT) {
  try {
    const stdout = execFileSync("npx", ["tsx", script, ...args], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32",
    });
    return { status: 0, stdout, stderr: "" };
  } catch (e: any) {
    return { status: e.status ?? 1, stdout: e.stdout?.toString() ?? "", stderr: e.stderr?.toString() ?? "" };
  }
}

describe("etl:validate CLI (finding #2 — no vacuous pass)", () => {
  it("fails when default mode finds zero inputs to validate", () => {
    const dir = mkdtempSync(join(tmpdir(), "rys-validate-"));
    try {
      const r = runCli(VALIDATE, [], dir);
      expect(r.status, `stdout=${r.stdout} stderr=${r.stderr}`).toBe(1);
      expect(r.stderr).toContain("FETCH_INTEGRITY:");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("etl:validate threshold parsing (finding #5)", () => {
  // A valid latest.json so we reach threshold handling, not schema/rowcount errors.
  function withLatest(extraArgs: string[]) {
    const dir = mkdtempSync(join(tmpdir(), "rys-thresh-"));
    const latest = join(dir, "latest.json");
    const rec = (id: string, ratio: number) => ({
      regionId: id, regionName: "X", stateName: "XX", month: "2026-05", zhvi: 100000, zori: 1000, ratio,
    });
    const audit = { joined: 0, zhviOnly: 0, zoriOnly: 0, zeroRent: 0, noSharedMonth: 0 };
    writeFileSync(latest, JSON.stringify({
      meta: { snapshotMonth: "2026-05", audit: { metro: audit, zip: audit } },
      metros: Array.from({ length: 10 }, (_, i) => rec(`m${i}`, 10 + i)),
      zips: Array.from({ length: 20 }, (_, i) => rec(`z${i}`, 8 + i)),
    }));
    try {
      return runCli(VALIDATE, ["--latest", latest, ...extraArgs]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  it("rejects a non-numeric threshold instead of silently disabling the gate", () => {
    // Number("5,000") is NaN → `zips.length < NaN` is always false → gate off.
    const r = withLatest(["--min-zips", "5,000"]);
    expect(r.status, `stdout=${r.stdout} stderr=${r.stderr}`).toBe(1);
    expect(r.stderr.toLowerCase()).toContain("min-zips");
  });

  it("honors the --flag=value form", () => {
    // Doc has 10 metros / 20 zips. Both fall below the DEFAULTS (500 / 5000), so
    // the run can only pass if BOTH equals-form thresholds are actually honored;
    // if either is ignored the default trips ROWCOUNT_ANOMALY. Passing proves it.
    const r = withLatest(["--min-metros=5", "--min-zips=10"]);
    expect(r.status, `stdout=${r.stdout} stderr=${r.stderr}`).toBe(0);
  });
});

describe("etl:fetch floating-promise contract (finding #9)", () => {
  it("emits FETCH_INTEGRITY: on a main() rejection, not a raw stack trace", () => {
    // main() was called with no .catch, so any rejection outside fail() (e.g. the
    // unguarded res.text(), or an I/O error) escaped as an unhandled rejection.
    // Force one offline: --out under an existing FILE makes mkdirSync throw ENOTDIR
    // before any network call.
    const dir = mkdtempSync(join(tmpdir(), "rys-fetch-"));
    const filePath = join(dir, "afile");
    writeFileSync(filePath, "x");
    try {
      const r = runCli(FETCH, ["--out", join(filePath, "sub")]);
      expect(r.status, `stdout=${r.stdout} stderr=${r.stderr}`).not.toBe(0);
      expect(r.stderr).toContain("FETCH_INTEGRITY:");
      expect(r.stderr).not.toMatch(/at .*\.ts:\d+/); // no raw stack trace
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("map:verify latest.json read (finding #8 — honors MAP_VERIFY: contract)", () => {
  const SVG = join(ROOT, "data/map/metro-map.svg");
  const BAK = join(ROOT, "data/map/metro-map.svg.testbak");

  it("emits MAP_VERIFY: (not a raw stack trace) when the source latest.json is missing", () => {
    // A live-sourced SVG points at data/latest.json, which does not exist until
    // Phase D. The read must be guarded so failures speak the MAP_VERIFY: token.
    expect(existsSync(join(ROOT, "data/latest.json"))).toBe(false); // guard the premise
    const good = readFileSync(SVG, "utf8");
    // Re-tag the committed SVG as live without touching its geometry.
    const live = good.replace(/data-source="fixtures"/, 'data-source="live"');
    renameSync(SVG, BAK);
    writeFileSync(SVG, live);
    try {
      const r = runCli(MAP_VERIFY, []);
      expect(r.status, `stdout=${r.stdout} stderr=${r.stderr}`).toBe(1);
      expect(r.stderr).toContain("MAP_VERIFY:");
      expect(r.stderr).not.toMatch(/at .*\.ts:\d+/); // no raw stack trace
    } finally {
      rmSync(SVG, { force: true });
      renameSync(BAK, SVG);
    }
  });
});

describe("build-crosswalk generator (finding #4 — 1:1 both directions)", () => {
  const COUNTY_HEADER = "CountyRegionID_Zillow,MetroRegionID_Zillow,CBSACode";
  function build(rows: string[]) {
    const dir = mkdtempSync(join(tmpdir(), "rys-crosswalk-"));
    const src = join(dir, "county.csv");
    const out = join(dir, "metro-cbsa.csv");
    writeFileSync(src, [COUNTY_HEADER, ...rows].join("\n") + "\n");
    try {
      return { ...runCli(BUILD_CROSSWALK, ["--src", src, "--out", out]), dir };
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  it("rejects two metros mapping to the SAME CBSA (the test's 1:1 invariant)", () => {
    // The committed crosswalk test asserts globally unique CBSA codes; the
    // generator must enforce the same, not just one-metro→multiple-CBSAs.
    const r = build(["1001,394913,35620", "1002,999999,35620"]);
    expect(r.status, `stdout=${r.stdout} stderr=${r.stderr}`).toBe(1);
    expect(r.stderr).toContain("SCHEMA_VIOLATION:");
  });

  it("accepts a clean 1:1 crosswalk", () => {
    const r = build(["1001,394913,35620", "1002,753899,31080"]);
    expect(r.status, `stdout=${r.stdout} stderr=${r.stderr}`).toBe(0);
  });
});
