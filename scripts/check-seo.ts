// SEO artifact checker CLI (ROADMAP C.3).
//   check-seo.ts <dir>   → scan every *.html under <dir> recursively
// Per page requires: non-empty <title>, meta description, canonical <link>,
// og:title, og:description, and a JSON-LD <script> whose payload is valid
// JSON with no raw "<" or ">" (constitution: escape before set:html).
// One SEO_VIOLATION: line per failure on stderr, exit 1. Else "SEO_OK pages=N", exit 0.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function findHtmlFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...findHtmlFiles(full));
    else if (entry.endsWith(".html")) out.push(full);
  }
  return out;
}

function findTags(html: string, tagName: string): string[] {
  return html.match(new RegExp(`<${tagName}\\b[^>]*>`, "gi")) ?? [];
}

function parseAttrs(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([\w:-]+)\s*=\s*"([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tag))) attrs[m[1].toLowerCase()] = m[2];
  return attrs;
}

function checkPage(file: string, html: string): string[] {
  const violations: string[] = [];

  const title = /<title>([^<]*)<\/title>/i.exec(html);
  if (!title || title[1].trim() === "") {
    violations.push(`${file}: missing or empty <title>`);
  }

  const metaTags = findTags(html, "meta").map(parseAttrs);
  const description = metaTags.find((a) => a.name === "description");
  if (!description?.content?.trim()) {
    violations.push(`${file}: missing meta description`);
  }

  const ogTitle = metaTags.find((a) => a.property === "og:title");
  if (!ogTitle?.content?.trim()) {
    violations.push(`${file}: missing og:title`);
  }

  const ogDescription = metaTags.find((a) => a.property === "og:description");
  if (!ogDescription?.content?.trim()) {
    violations.push(`${file}: missing og:description`);
  }

  const linkTags = findTags(html, "link").map(parseAttrs);
  const canonical = linkTags.find((a) => a.rel === "canonical");
  if (!canonical?.href?.trim()) {
    violations.push(`${file}: missing canonical link`);
  }

  const jsonLdMatch =
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i.exec(
      html,
    );
  if (!jsonLdMatch) {
    violations.push(`${file}: missing JSON-LD script`);
  } else {
    const payload = jsonLdMatch[1];
    if (/[<>]/.test(payload)) {
      violations.push(
        `${file}: JSON-LD payload contains unescaped < or > (must escape before set:html)`,
      );
    }
    try {
      JSON.parse(payload);
    } catch {
      violations.push(`${file}: JSON-LD payload is not valid JSON`);
    }
  }

  return violations;
}

function main() {
  const dir = process.argv[2];
  if (!dir) {
    process.stderr.write("SEO_VIOLATION: usage: check-seo.ts <dir>\n");
    process.exit(1);
  }
  const files = findHtmlFiles(dir);
  const violations = files.flatMap((f) =>
    checkPage(f, readFileSync(f, "utf8")),
  );
  if (violations.length > 0) {
    for (const v of violations) process.stderr.write(`SEO_VIOLATION: ${v}\n`);
    process.exit(1);
  }
  console.log(`SEO_OK pages=${files.length}`);
  process.exit(0);
}

main();
