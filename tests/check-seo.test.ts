import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const CHECK_SEO = "scripts/check-seo.ts";

function runCli(args: string[]) {
  try {
    const stdout = execFileSync("npx", ["tsx", CHECK_SEO, ...args], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32",
    });
    return { status: 0, stdout, stderr: "" };
  } catch (e: any) {
    return {
      status: e.status ?? 1,
      stdout: e.stdout?.toString() ?? "",
      stderr: e.stderr?.toString() ?? "",
    };
  }
}

describe("check-seo CLI (ROADMAP C.3 — non-vacuous negative self-test)", () => {
  it("fails with SEO_VIOLATION: on the deliberately-bad fixture (missing og:description)", () => {
    const r = runCli(["tests/fixtures/seo-invalid/"]);
    expect(r.status, `stdout=${r.stdout} stderr=${r.stderr}`).toBe(1);
    expect(r.stderr).toContain("SEO_VIOLATION:");
  });

  it("passes clean on the real build output", () => {
    // Depends on `npm run build` already having run in this working tree —
    // mirrors the ROADMAP AC's own sequencing (build, then check-seo dist/).
    const r = runCli(["dist/"]);
    expect(r.status, `stdout=${r.stdout} stderr=${r.stderr}`).toBe(0);
    expect(r.stdout).toContain("SEO_OK pages=16");
  });
});
