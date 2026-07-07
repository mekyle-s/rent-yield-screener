// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // site is set when the Cloudflare Pages URL / custom domain exists (needed for sitemap/canonicals)
  output: 'static',
});
