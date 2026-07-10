// Stop hook — tests-must-pass gate + atomic-commit gate. Fail-closed (A1).
// - stop_hook_active → exit 0 (infinite-loop guard).
// - Changes under src/ scripts/ tests/ data/ → run the test suite; red → exit 2
//   (in a `claude -p` loop iteration this converts "exit with red tests" into "keep fixing").
// - CLAUDE_LOOP=1: ANY dirty tree at stop → exit 2 (atomic commit rule). Attended
//   sessions are not nagged to commit.
// CLAUDE_HOOK_TEST_CMD overrides the test command (unit tests use it to avoid
// vitest-inside-vitest recursion). Typecheck stays out (astro check is slow — CI gate).
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

function deny(reason) {
  process.stderr.write(`${reason}\n`);
  process.exit(2);
}

try {
  const raw = readFileSync(0, "utf8");
  const data = raw.trim() ? JSON.parse(raw) : {};
  if (data.stop_hook_active) process.exit(0);
  const loop = process.env.CLAUDE_LOOP === "1";

  const all = spawnSync("git", ["status", "--porcelain"], { encoding: "utf8" });
  if (all.status !== 0) throw new Error("git status failed");
  const watched = spawnSync(
    "git",
    ["status", "--porcelain", "--", "src", "scripts", "tests", "data"],
    { encoding: "utf8" },
  );
  if (watched.status !== 0) throw new Error("git status (watched dirs) failed");

  if (watched.stdout.trim()) {
    const testCmd = process.env.CLAUDE_HOOK_TEST_CMD || "npx vitest run";
    const t = spawnSync(testCmd, { shell: true, encoding: "utf8", timeout: 300_000 });
    if (t.status !== 0)
      deny("Tests failing — fix before stopping (constitution: tests-must-pass)");
  }

  if (loop && all.stdout.trim())
    deny("Commit or revert before exiting (atomic commit rule, CLAUDE_LOOP=1)");

  process.exit(0);
} catch {
  process.stderr.write("HOOK_ERROR: fail-closed\n");
  process.exit(2);
}
