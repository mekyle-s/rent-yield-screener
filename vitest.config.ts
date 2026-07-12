import { defineConfig } from "vitest/config";

// Playwright specs live in tests/e2e/** and must never run under vitest —
// vitest's default include glob would otherwise pick up *.spec.ts files.
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/e2e/**", "node_modules/**"],
  },
});
