// PreToolUse guard (Edit|Write) — loop self-protection (A2).
// Hook CONFIG is snapshotted at session start, but hook SCRIPT FILES are read at
// execution time: an unattended loop must not be able to edit its own guardrails.
// When CLAUDE_LOOP=1, writes to .claude/**, scripts/loop/**, and .github/** are
// denied (exit 2). Attended sessions are unaffected. Fail-closed (A1).
import { readFileSync } from "node:fs";

const PROTECTED = [/(^|\/)\.claude(\/|$)/, /(^|\/)scripts\/loop(\/|$)/, /(^|\/)\.github(\/|$)/];

try {
  const data = JSON.parse(readFileSync(0, "utf8"));
  if (process.env.CLAUDE_LOOP !== "1") process.exit(0);
  const filePath = data?.tool_input?.file_path;
  if (typeof filePath !== "string" || filePath.length === 0) {
    // a Write/Edit with no target is malformed — fail closed in loop mode
    process.stderr.write("HOOK_ERROR: fail-closed\n");
    process.exit(2);
  }
  const normalized = filePath.replace(/\\/g, "/");
  if (PROTECTED.some((re) => re.test(normalized))) {
    process.stderr.write(
      `BLOCKED: ${filePath} is protected guardrail infrastructure (.claude/**, scripts/loop/**, .github/**) — the loop may not edit its own guardrails (CLAUDE_LOOP=1)\n`,
    );
    process.exit(2);
  }
  process.exit(0);
} catch {
  process.stderr.write("HOOK_ERROR: fail-closed\n");
  process.exit(2);
}
