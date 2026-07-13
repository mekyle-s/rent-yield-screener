// Escapes "<", ">", "&" so a JSON-LD payload embedded via set:html can never
// break out of its <script> tag or be misparsed as HTML (gate critique #8).
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(
    /[<>&]/g,
    (c) => ({ "<": "\\u003c", ">": "\\u003e", "&": "\\u0026" })[c]!,
  );
}
