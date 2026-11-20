// Generates every route's Open Graph preview image at build time.
// No browser involved: satori lays text out against our real fonts,
// resvg rasterizes it. Run automatically before `astro build` (see
// package.json) so these stay in sync with real content — nothing here
// is hand-made in Figma, per the brief's "generate the OG images, don't
// hand-make twenty."
//
// The two font files in scripts/og-fonts/ are STATIC 700-weight instances
// of the site's own Satoshi and EB Garamond, cut from the variable files in
// src/styles/fonts/ with fontTools' instancer (Phase 13). satori's bundled
// opentype.js can't read variable fonts. Not shipped to the site;
// build-time only.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import * as woff2 from "wawoff2";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// satori's bundled opentype.js parses raw sfnt (TTF/OTF), not compressed
// woff2 — decompress once up front.
const sans = Buffer.from(
  await woff2.decompress(
    readFileSync(path.join(root, "scripts/og-fonts/satoshi-700.woff2")),
  ),
);
const serif = Buffer.from(
  await woff2.decompress(
    readFileSync(path.join(root, "scripts/og-fonts/eb-garamond-700.woff2")),
  ),
);

// The real ACC dove wordmark (white glyphs on transparency, 703x138).
const logo = `data:image/png;base64,${readFileSync(
  path.join(root, "src/assets/brand/acc-logo.png"),
).toString("base64")}`;

// Deep teal card with butter and coral paper accents, matching src/styles/tokens.css.
const DEEP = "#0B3F43";
const BUTTER = "#F4D58D";
const CORAL = "#F06A55";
const SEAFOAM = "#A7D3CE";
const ON_DEEP = "#FBFDFC";
const MUTED_ON_DEEP = "#B5C9CB";

const domains = JSON.parse(
  readFileSync(path.join(root, "src/content/domains.json"), "utf8"),
);

/** @type {{ slug: string, title: string, subtitle?: string }[]} */
const routes = [
  {
    slug: "home",
    title: "Association of Christian Christites",
    subtitle:
      "A community of faith, fellowship, and purpose at CHRIST (Deemed to be University), Kengeri.",
  },
  {
    slug: "about",
    title: "About ACC",
  },
  {
    slug: "domains",
    title: "Six domains, one community",
  },
  ...domains
    .sort((a, b) => a.order - b.order)
    .map((d) => ({
      slug: `domains-${d.id}`,
      title: d.name,
    })),
  {
    slug: "prayers",
    title: "Prayers",
  },
  {
    slug: "calendar",
    title: "Calendar",
  },
  {
    slug: "media",
    title: "Media",
  },
  {
    slug: "contact",
    title: "We Care",
  },
  {
    slug: "404",
    title: "We couldn't find that page.",
  },
];

function card({ title, subtitle }) {
  return {
    type: "div",
    props: {
      style: {
        width: "1200px",
        height: "630px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        position: "relative",
        backgroundColor: DEEP,
        padding: "72px 80px 96px",
      },
      children: [
        // two strips of paper laid along the bottom edge
        {
          type: "div",
          props: {
            style: { position: "absolute", left: 0, right: 0, bottom: 0, height: "34px", backgroundColor: SEAFOAM },
          },
        },
        {
          type: "div",
          props: {
            style: { position: "absolute", left: 0, right: 0, bottom: "34px", height: "10px", backgroundColor: CORAL },
          },
        },
        {
          type: "img",
          props: {
            src: logo,
            width: 306,
            height: 60,
            style: { width: "306px", height: "60px" },
          },
        },
        {
          type: "div",
          props: {
            style: { display: "flex", flexDirection: "column" },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    width: "64px",
                    height: "4px",
                    backgroundColor: BUTTER,
                    marginBottom: "32px",
                  },
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    fontFamily: "Sans",
                    fontSize: 72,
                    lineHeight: 1.08,
                    letterSpacing: "-2px",
                    color: ON_DEEP,
                    maxWidth: "980px",
                  },
                  children: title,
                },
              },
              subtitle && {
                type: "div",
                props: {
                  style: {
                    fontFamily: "Serif",
                    fontSize: 32,
                    lineHeight: 1.4,
                    color: MUTED_ON_DEEP,
                    marginTop: "24px",
                    maxWidth: "820px",
                  },
                  children: subtitle,
                },
              },
            ].filter(Boolean),
          },
        },
      ],
    },
  };
}

async function main() {
  const outDir = path.join(root, "public/og");
  mkdirSync(outDir, { recursive: true });

  for (const route of routes) {
    const svg = await satori(card(route), {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Sans", data: sans, weight: 700, style: "normal" },
        { name: "Serif", data: serif, weight: 700, style: "normal" },
      ],
    });
    const png = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } })
      .render()
      .asPng();
    writeFileSync(path.join(outDir, `${route.slug}.png`), png);
  }

  console.log(`Generated ${routes.length} OG images in public/og/`);
}

main();
