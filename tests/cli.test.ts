import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Script-level regression tests for the ETL/map CLIs (review findings 2, 5, 7, 8, 9).
// These exercise the argv/exit-code/error-token contracts the unit tests can't reach.
const ROOT = process.cwd();
const VALIDATE = join(ROOT, "scripts/etl/validate.ts");
const BUILD_CROSSWALK = join(ROOT, "scripts/etl/build-crosswalk.ts");

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
