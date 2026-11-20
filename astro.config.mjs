import { defineConfig } from 'astro/config';

// Deployment note (see docs/HANDOVER.md once written): the university may
// host this at the domain root or in a subdirectory. `base` is the one
// line to change for that — everything else in the project reads paths
// through Astro's `base`-aware helpers, never hardcoded absolute paths.
export default defineConfig({
  output: 'static',
  base: '/',
  trailingSlash: 'ignore',
  build: {
    format: 'directory',
  },
});
