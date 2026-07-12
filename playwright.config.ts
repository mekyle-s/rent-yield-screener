import { defineConfig, devices } from "@playwright/test";

// Preview-only webServer (plan v3 amendment): the AC's `npm run build &&` is the
// only build — this config never builds, so the test can never serve a missing
// or stale dist/ silently; `astro preview` fails fast if dist/ is absent.
export default defineConfig({
  testDir: "tests/e2e",
  use: { baseURL: "http://localhost:4321" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run preview",
    url: "http://localhost:4321",
    reuseExistingServer: true,
  },
});
