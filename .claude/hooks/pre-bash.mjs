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
  // re-review fix: scan EVERY redirect in the command, not just the first —
  // `echo a > safe && echo b > .claude/x` hid the malicious redirect behind
  // an innocent one. `>>?` also catches fd-prefixed forms (`2> .claude/x`).
  for (const m of cmd.matchAll(/>>?\s*(\S+)/g)) {
    if (isProtectedPath(stripQuotes(m[1])))
      deny(
        "loop iterations may not write to protected guardrail paths (.claude/**, scripts/loop/**, .github/**) — redirect target (CLAUDE_LOOP=1)",
      );
  }
  const hasWriter = tokens.some((t) => WRITE_CMD.test(baseName(t)));
  if (!hasWriter) return;
  if (tokens.some((t) => isProtectedPath(t)))
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
  // F2 (T7.5): normalize the full-ref form so refs/heads/main can't dodge this
  const dest = (ref.includes(":") ? ref.split(":").pop() : ref).replace(
    /^refs\/heads\//,
    "",
  );
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
  // F3 (T7.5): bulk pushes have no refspec tokens, dodging every check below
  if (after.includes("--mirror"))
    deny(
      "git push --mirror force-updates every ref (implicit force, bulk destinations) — never allowed",
    );
  if (loop && (after.includes("--all") || after.includes("--branches")))
    deny(
      "bulk push (--all/--branches) may include main — loop iterations push their claude/* branch explicitly (CLAUDE_LOOP=1)",
    );
  // tokens already quote-stripped up front (see main block)
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
    // F5 (T7.5): match by basename so \rm and /bin/rm are recognized
    if (!DELETE_CMD.test(baseName(tokens[i]))) continue;
    // F5 (T7.5): was this delete fed by a pipe? then its target is invisible
    const pipedInto = tokens.slice(0, i).some((t) => SEPARATOR.test(t));
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
    // F5 (T7.5): recursive+force delete whose target came from a pipe (no explicit
    // path token) is unauditable — the piped input could be anything, incl. absolute
    if (recursive && force && pipedInto && paths.length === 0)
      deny(
        "recursive+force rm/Remove-Item with a pipe-fed target (path unauditable) — pass an explicit in-repo path instead",
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

  // re-review fix: strip quotes from EVERY token once, up front, so quoting
  // can't dodge flag classification (`"--force"`, `"-rf"`, `"--mirror"`) the way
  // it previously dodged only path/refspec value comparisons. Separators
  // (&&, ||, ;, |) and redirects carry no quotes and pass through unchanged.
  const tokens = cmd.split(/\s+/).filter(Boolean).map(stripQuotes);
  checkProtectedWrite(tokens, cmd, loop);
  checkDelete(tokens);
  checkPush(tokens, loop);

  process.exit(0);
} catch {
  process.stderr.write("HOOK_ERROR: fail-closed\n");
  process.exit(2);
}
