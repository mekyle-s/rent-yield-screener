import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { slugify } from "../src/lib/slug";

describe("slugify", () => {
  it("lowercases and collapses non-alphanumerics to a single hyphen", () => {
    expect(slugify("Atlanta, GA")).toBe("atlanta-ga");
  });

  it("strips leading and trailing hyphens", () => {
    expect(slugify("--Foo Bar--")).toBe("foo-bar");
  });
});

// C.2's getStaticPaths keys metro pages by slugify(regionName) — a collision
// would silently drop a page and break the "exactly 15" AC without any error.
describe("metro slug uniqueness (golden snapshot)", () => {
  it("produces one distinct slug per fixture metro", () => {
    const golden = JSON.parse(readFileSync("tests/golden/latest.json", "utf8"));
    const slugs = golden.metros.map((m: { regionName: string }) =>
      slugify(m.regionName),
    );
    expect(new Set(slugs).size).toBe(golden.metros.length);
  });
});
