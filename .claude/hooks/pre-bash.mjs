// PreToolUse guard (Bash|PowerShell) — dangerous-command blocker.
// Deny = exit 2 + stderr reason. Fail-closed (A1): any internal error → exit 2
// "HOOK_ERROR: fail-closed" — a broken guard blocks, never silently allows.
// Loop mode (CLAUDE_LOOP=1, set by the loop driver): additionally denies ANY
// push whose refspec targets main/master — the loop cannot touch trunk.
import { readFileSync } from "node:fs";
import { isProtectedPath } from "./protected.mjs";

function deny(reason) {
  process.stderr.write(`BLOCKED: ${reason}\n`);
  process.exit(2);
}

const SEPARATOR = /^(&&|\|\||;|\|)$/;

// F1 (T7.5): loop-mode Bash writes to guardrail files. pre-edit.mjs only sees
// the Edit|Write tools; without this, `rm .claude/hooks/x` or `echo > ...`
// from Bash disables every other guard.
const WRITE_CMD =
  /^(rm|remove-item|ri|del|erase|rd|rmdir|mv|move|cp|copy|tee|sed|perl|touch|truncate|install|ln|dd|chmod|chown)$/i;

function checkProtectedWrite(tokens, cmd, loop) {
  if (!loop) return;
  const redirect = cmd.match(/>>?\s*(\S+)/);
  if (redirect && isProtectedPath(stripQuotes(redirect[1])))
    deny(
      "loop iterations may not write to protected guardrail paths (.claude/**, scripts/loop/**, .github/**) — redirect target (CLAUDE_LOOP=1)",
    );
  const hasWriter = tokens.some((t) => WRITE_CMD.test(baseName(t)));
  if (!hasWriter) return;
  if (tokens.some((t) => isProtectedPath(stripQuotes(t))))
    deny(
      "loop iterations may not modify protected guardrail paths (.claude/**, scripts/loop/**, .github/**) (CLAUDE_LOOP=1)",
    );
}

// F4 (T7.5): the tokenizer keeps quote chars, so anchored path/refspec checks
// were defeated by ordinary quoting ("/etc/x", "C:\Users\x", "main")
function stripQuotes(t) {
  return t.replace(/^['"]+/, "").replace(/['"]+$/, "");
}

// F5 (T7.5): match command names by basename so \rm and /bin/rm are seen
function baseName(t) {
  return stripQuotes(t).replace(/^\\/, "").split(/[\\/]/).pop();
}

function targetsTrunk(refspec) {
  const ref = refspec.replace(/^\+/, "");
  const dest = ref.includes(":") ? ref.split(":").pop() : ref;
  return dest === "main" || dest === "master";
}

function checkPush(tokens, loop) {
  if (!tokens.includes("git")) return;
  const idx = tokens.indexOf("push");
  if (idx === -1) return;
  const after = [];
  for (const tok of tokens.slice(idx + 1)) {
    if (SEPARATOR.test(tok)) break;
    after.push(tok);
  }
  const force = after.some(
    (t) => t === "--force" || t === "-f" || t.startsWith("--force-with-lease"),
  );
  const nonFlags = after.filter((t) => !t.startsWith("-"));
  // first non-flag token is the remote; refspecs follow
  const refspecs = nonFlags.slice(1);
  if (force && refspecs.length === 0)
    deny(
      "force-push with no explicit refspec — destination is the current branch, invisible to this guard; unknown destination + force fails closed",
    );
  if (refspecs.some((r) => r.startsWith("+") && targetsTrunk(r)))
    deny("force-push (+refspec) targeting main/master");
  if (force && refspecs.some(targetsTrunk))
    deny("force-push targeting main/master (--force/-f/--force-with-lease)");
  if (loop && refspecs.some(targetsTrunk))
    deny(
      "loop iterations may not push to main/master — claude/* branches only (CLAUDE_LOOP=1)",
    );
}

// covers unix rm AND PowerShell Remove-Item + its aliases (the matcher covers
// the PowerShell tool, so the delete rule must too)
const DELETE_CMD = /^(rm|remove-item|ri|del|erase|rd|rmdir)$/i;

function checkDelete(tokens) {
  for (let i = 0; i < tokens.length; i++) {
    if (!DELETE_CMD.test(tokens[i])) continue;
    let recursive = false;
    let force = false;
    const paths = [];
    for (const tok of tokens.slice(i + 1)) {
      if (SEPARATOR.test(tok)) break;
      if (tok.startsWith("--")) {
        if (tok === "--recursive") recursive = true;
        if (tok === "--force") force = true;
      } else if (tok.startsWith("-")) {
        // named param first (PowerShell -Recurse/-Force, abbreviated or not),
        // then unix combined short flags (-rf, -fr)
        if (/^-r(ecurse)?$/i.test(tok)) recursive = true;
        else if (/^-f(orce)?$/i.test(tok)) force = true;
        else {
          if (/[rR]/.test(tok)) recursive = true;
          if (/f/.test(tok)) force = true;
        }
      } else {
        paths.push(tok);
      }
    }
    const dangerous = (p) =>
      /^\//.test(p) ||
      /^[A-Za-z]:[\\/]/.test(p) ||
      p.includes("~") ||
      p.includes("..") ||
      /^\$HOME/.test(p) ||
      /\$env:/i.test(p);
    if (recursive && force && paths.some(dangerous))
      deny(
        "recursive+force rm/Remove-Item pointed outside the repo (absolute path, ~, .., drive root, or $env:USERPROFILE)",
      );
  }
}

try {
  const data = JSON.parse(readFileSync(0, "utf8"));
  const cmd = data?.tool_input?.command;
  if (typeof cmd !== "string" || cmd.length === 0) process.exit(0);
  const loop = process.env.CLAUDE_LOOP === "1";

  if (/\bgit\b/.test(cmd) && /--no-verify\b|--no-gpg-sign\b/.test(cmd))
    deny("--no-verify/--no-gpg-sign on git — gates must not be skippable");

  if (
    /\b(curl|wget|iwr|irm|invoke-webrequest|invoke-restmethod)\b[^|]*\|[^|]*\b(sh|bash|zsh|dash|node|iex|invoke-expression)\b/i.test(
      cmd,
    )
  )
    deny("curl/wget/iwr/irm piped into a shell (pipe-to-shell)");

  const tokens = cmd.split(/\s+/).filter(Boolean);
  checkProtectedWrite(tokens, cmd, loop);
  checkDelete(tokens);
  checkPush(tokens, loop);

  process.exit(0);
} catch {
  process.stderr.write("HOOK_ERROR: fail-closed\n");
  process.exit(2);
}
