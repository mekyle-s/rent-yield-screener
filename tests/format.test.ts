import { describe, it, expect } from "vitest";
import { formatInt } from "../src/lib/format";

// Deterministic thousands-separator formatting for display — no Intl/toLocaleString
// (repo convention: zero uses of Intl/Date across src/, ADR-0004 determinism rules).
describe("formatInt", () => {
  it("adds thousands separators for large numbers", () => {
    expect(formatInt(382938)).toBe("382,938");
  });

  it("handles numbers under 1000 without separators", () => {
    expect(formatInt(840)).toBe("840");
  });

  it("handles negative numbers", () => {
    expect(formatInt(-1234)).toBe("-1,234");
  });

  it("rounds fractional input to the nearest integer", () => {
    expect(formatInt(1234.6)).toBe("1,235");
  });

  it("handles millions with multiple separators", () => {
    expect(formatInt(1234567)).toBe("1,234,567");
  });
});
