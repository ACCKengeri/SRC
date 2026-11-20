// Post-build CSS normalisation.
//
// The CSS transformer serialises `@media (max-width: 60rem)` to the Media
// Queries Level 4 range form `@media (width <= 60rem)`. That is the modern
// standard, but it is unsupported on iOS Safari < 16.4 — and a mobile-first
// student audience still runs older iPhones, where an unsupported query is
// dropped entirely (every responsive breakpoint silently fails, the layout
// overflows). This rewrites the range forms back to the widely-supported
// `min-width` / `max-width` spelling in every built stylesheet.

import { readdirSync, readFileSync, writeFileSync, statSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const distDir = path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))), 'dist');

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full);
    else if (entry.endsWith('.css') || entry.endsWith('.html')) fix(full);
  }
}

function fix(file) {
  const src = readFileSync(file, 'utf8');
  const out = src
    // (width <= 60rem) / (width<=60rem)  ->  (max-width: 60rem)
    .replace(/\(\s*width\s*<=\s*([\d.]+)(rem|px|em)\s*\)/g, '(max-width: $1$2)')
    // (width >= 60rem)  ->  (min-width: 60rem)
    .replace(/\(\s*width\s*>=\s*([\d.]+)(rem|px|em)\s*\)/g, '(min-width: $1$2)')
    // (width < 60rem)   ->  (max-width: 59.999rem)   (rare; keep behaviour close)
    .replace(/\(\s*width\s*<\s*([\d.]+)(rem|px|em)\s*\)/g, (_, n, u) => `(max-width: ${(+n - 0.001).toFixed(3)}${u})`)
    .replace(/\(\s*width\s*>\s*([\d.]+)(rem|px|em)\s*\)/g, (_, n, u) => `(min-width: ${(+n + 0.001).toFixed(3)}${u})`);
  if (out !== src) {
    writeFileSync(file, out);
    console.log(`  normalised media queries: ${path.relative(distDir, file)}`);
  }
}

walk(distDir);
console.log('postbuild: media-query syntax normalised for older Safari.');

// Prune unreferenced originals.
//
// Importing an image in frontmatter or a .ts module makes Astro copy the
// untouched original (often a 2-10 MB camera JPEG) into dist/_astro even when
// every page only ever uses the resized WebP variants. Nothing links to those
// originals, but they bloat the hand-off ZIP. Remove any raster file in
// dist/_astro whose filename appears in no built text file.
const RASTER = /\.(jpe?g|png|webp|avif|gif)$/i;
const TEXT = /\.(html|css|js|mjs|json|xml|txt|webmanifest|svg)$/i;
const texts = [];
const rasters = [];
(function collect(dir) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) collect(full);
    else if (TEXT.test(entry)) texts.push(readFileSync(full, 'utf8'));
    else if (RASTER.test(entry) && path.basename(dir) === '_astro') rasters.push(full);
  }
})(distDir);
const corpus = texts.join('\n');
let pruned = 0;
let saved = 0;
for (const file of rasters) {
  if (!corpus.includes(path.basename(file))) {
    saved += statSync(file).size;
    unlinkSync(file);
    pruned += 1;
  }
}
console.log(`postbuild: pruned ${pruned} unreferenced originals (${(saved / 1048576).toFixed(1)} MB).`);
