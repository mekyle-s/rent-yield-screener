import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

// Geometry guard (review finding #1): mapshaper emits RFC 7946 (CCW) ring winding;
// d3-geo reads such rings as the SPHERICAL COMPLEMENT, so every <path> fills the
// whole canvas with the metro punched out as a hole. The old map:verify only
// counted paths/attributes and stayed blind to this. These tests assert real
// bounded geometry: no path may span the full viewBox, and no path may be the
// tell-tale clip-extent rectangle that a complemented ring starts with.

const SVG = "data/map/metro-map.svg";
const VIEWBOX = { w: 975, h: 610 };

function pathData(svg: string): string[] {
  return [...svg.matchAll(/<path\b[^>]*\bd="([^"]*)"/g)].map((m) => m[1]);
}

// Bounding box of an SVG path's coordinates (path uses only M/L/Z absolute commands here).
function bbox(d: string) {
  const nums = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) {
    xs.push(nums[i]);
    ys.push(nums[i + 1]);
  }
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

describe("committed choropleth SVG geometry (finding #1)", () => {
  const svg = readFileSync(SVG, "utf8");
  const ds = pathData(svg);

  it("has at least one path", () => {
    expect(ds.length).toBeGreaterThan(0);
  });

  it("no path bounding box spans the full viewBox (complemented-ring guard)", () => {
    for (const d of ds) {
      const b = bbox(d);
      const spansX = b.maxX - b.minX >= VIEWBOX.w;
      const spansY = b.maxY - b.minY >= VIEWBOX.h;
      expect(spansX && spansY, `path spans full viewBox: ${d.slice(0, 60)}`).toBe(false);
    }
  });

  it("no path begins with the geoAlbersUsa clip-extent rectangle", () => {
    // A complemented ring is emitted as the outer clip rectangle followed by the
    // metro as a hole — the rectangle's first vertex sits far outside the viewBox.
    for (const d of ds) {
      const first = d.match(/^M\s*(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
      expect(first, `path has no leading moveto: ${d.slice(0, 40)}`).not.toBeNull();
      const x = Number(first![1]);
      const y = Number(first![2]);
      const outside = x < 0 || y < 0 || x > VIEWBOX.w || y > VIEWBOX.h;
      expect(outside, `path starts outside viewBox (clip-extent rect): ${d.slice(0, 40)}`).toBe(false);
    }
  });
});
