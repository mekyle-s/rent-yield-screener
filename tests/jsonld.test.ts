import { describe, it, expect } from "vitest";
import { jsonLd } from "../src/lib/jsonld";

describe("jsonLd", () => {
  it("escapes <, >, and & so the payload can never break out of a <script> tag", () => {
    const out = jsonLd({ name: "A & B <script>alert(1)</script>" });
    expect(out).not.toContain("<");
    expect(out).not.toContain(">");
    expect(out).not.toContain("&");
    expect(
      JSON.parse(
        out
          .replace(/\\u003c/g, "<")
          .replace(/\\u003e/g, ">")
          .replace(/\\u0026/g, "&"),
      ),
    ).toEqual({
      name: "A & B <script>alert(1)</script>",
    });
  });

  it("round-trips plain data with no special characters", () => {
    const out = jsonLd({ a: 1, b: "plain" });
    expect(JSON.parse(out)).toEqual({ a: 1, b: "plain" });
  });
});
