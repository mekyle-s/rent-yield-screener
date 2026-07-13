// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  site: "https://rent-yield-screener.pages.dev",
  output: "static",
  integrations: [sitemap()],
});
