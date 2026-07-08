import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Script-level regression tests for the ETL/map CLIs (review findings 2, 5, 7, 8, 9).
// These exercise the argv/exit-code/error-token contracts the unit tests can't reach.
const ROOT = process.cwd();
const VALIDATE = join(ROOT, "scripts/etl/validate.ts");

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
