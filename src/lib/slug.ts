// Deterministic URL slug: lowercase ASCII, runs of non-alphanumerics collapse
// to "-". No locale APIs (constitution VI). "Atlanta, GA" -> "atlanta-ga".
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
