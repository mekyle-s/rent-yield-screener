// PostToolUse (Edit|Write) — format the edited file with Prettier.
// The SOLE always-exit-0 hook: a formatter failure must never block work (A1).
// No-ops silently until Prettier is installed (T3 wires it into settings.json).
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

try {
  const data = JSON.parse(readFileSync(0, "utf8"));
  const filePath = data?.tool_input?.file_path;
  if (typeof filePath === "string" && /\.(ts|mjs|astro|md|json)$/.test(filePath)) {
    const require = createRequire(join(process.cwd(), "package.json"));
    require.resolve("prettier"); // throws (→ silent exit 0) until T3 installs it
    spawnSync(`npx prettier --write "${filePath}"`, { shell: true, stdio: "ignore", timeout: 30_000 });
  }
} catch {
  // never block on formatter problems
}
process.exit(0);
