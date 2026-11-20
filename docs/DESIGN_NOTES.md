# Design Notes

Running record of what was tried and rejected, so we don't circle back. Newest at bottom.

## Phase 0 — palette and opening concept

- **Rejected:** cream-leaning paper tones (anything with R > G, i.e. standard warm cream). Too close to the banned `#F4F1EA` family. Settled on `--paper` `#E3E6D7` — G channel at or above R gives a sage-grey cast instead.
- **Rejected:** flat saturated orange/terracotta as the primary accent (anything near `#D97757` or `#ff6f00`). Settled on a brassier, more olive gold (`--accent-lamp` `#B8862E`) sourced from a nilavilakku lamp rather than a color-wheel warm accent.
- **Rejected home-opening option B** (type-only "next thing" on a dark field, no photo on first screen): visually calm and low-risk, but defers real photography past the three-second window, which works against the brief's explicit instruction that photography is what carries warmth here. Kept as a documented fallback for any moment where photography genuinely isn't available.
- **Rejected home-opening option C** (typography-only editorial hero): most "designed" in isolation, but same problem as B, worse — no photography at all until the second section.
- **Chose home-opening option A**: full-bleed photograph + a single pinned-notice panel naming the actual next service. Rationale in `docs/DESIGN_PLAN.md` §4.
- **Flagged, not yet fixed:** the "This week" wireframe in the design plan used middle-dot-joined meta strings (`Adoration · 6:30pm · Chapel`), which is an anti-default per §3.3. To fix in Phase 3: lay out date/time/location as separate typeset fields (columns or a hairline separator), not a punctuated one-liner.
- **Decision, load-bearing:** `--paper` (light) is the default theme, `--field-deep` (dark) is opt-in. Reasoning in `docs/DESIGN_PLAN.md` §6 — this is the main thing keeping the palette from reading as "dark mode luxury site" despite using a saturated dark field color and a gold accent.

## Phase 1 — foundation

- **Substitution: General Sans → Schibsted Grotesk.** The design plan named "General Sans" (Fontshare) for the humanist sans role. Fontshare's API was unreachable from this build environment (network test came back empty/blocked), which is a real handover risk — the university's own build environment could hit the same wall. Switched to Schibsted Grotesk, which is on Google Fonts (reliable, same self-hosting pipeline as Fraunces) and fills the same role: humanist grotesk with real warmth, deliberately not Inter. Nothing else about the type plan changed.
- **Contrast pass, run for real (not eyeballed).** Computed WCAG ratios for every token pair before shipping tokens.css. Findings that changed the token file from what §1 of the design plan sketched:
  - Raw `--accent-lamp` (`#B8862E`) on `--paper` is only 2.55:1 — fails even the 3:1 floor for large text/UI, let alone 4.5:1 for body. It's kept as a *fill* color only (buttons, icon strokes) on light theme; anywhere it needs to be a text/link color on paper, a derived `--accent-lamp-text-light` (`#7F6028`, lamp mixed 40% toward ink) is used instead — 4.59:1.
  - Raw `--accent-ember` (`#9C4A2E`) is fine as text on paper (4.83:1) but fails on `--field-deep` (2.02:1). Dark theme gets a lightened `--accent-ember-text-dark` (`#C79978`, 4.86:1) for the same role.
  - Muted text and hairline borders both needed a derived, checked value per theme rather than a quick eyeball mix — see the comments in `src/styles/tokens.css` for the exact mix ratios and ratios achieved.
  - This is the concrete version of the "open item" flagged in the design plan §7 — closed now, not deferred to Phase 3.
- **Fonts self-hosted via the Google Fonts CSS2 API's own split files**, not the full multi-script family file: fetched the `latin`-only `@font-face` block for each family (Fraunces `opsz,wght@9..144,300..900`; Schibsted Grotesk `wght@400..900`) and copied just that woff2 into the repo, keeping the same `unicode-range` restriction in our own `@font-face`. This is the subsetting step from the brief §3.5 without needing a separate subsetting toolchain.
- **Font files live in `src/styles/fonts/`, not `public/fonts/`.** A `public/` reference (`url(/fonts/...)`) is a literal root-absolute string that Vite does not rewrite for `base`, so it would silently 404 the moment the site is deployed to a subdirectory. Referencing them with a **relative** `url('./fonts/...')` from a CSS file that's `import`ed into the module graph lets Astro/Vite fingerprint the file and correctly prefix it with whatever `base` is configured. Verified by building twice — once with `base: '/'`, once with `base: '/acc-test/'` — and confirming every asset URL (fonts, CSS, favicon, nav hrefs) picked up the prefix, then serving both outputs from a local static server and loading them. This is the mechanism behind the brief's "one config line to touch" promise in §5.
- **Caught and fixed a self-inflicted anti-default before shipping:** the first Footer draft joined "CHRIST (Deemed to be University)" and the chapel dedication with a middle dot on one line — exactly the pattern banned in §3.3. Split into two separate lines instead. Same fix applied to the campus list (structural `border-left` dividers between list items, not a joined string) — this is the same issue flagged against the "This week" wireframe in the Phase 0 notes above; the fix pattern (structured fields, not a punctuated one-liner) is now the standing rule for any repeated meta line on this site.
- **`[NEEDS COPY]` placeholders are visible on the page itself**, not just logged in `docs/CONTENT_NEEDED.md` — styled as a dashed-border tag (`.content-needed` in `base.css`) so nobody mistakes a placeholder for a finished section during review. Removing the last one is a Phase 9 gate, not something to quietly forget.

## Phase 1 — palette reset (client override)

Client rejected the Phase 0 palette outright: "not my color palette, white, mostly primarily,
some black and orange too." Also pointed at a previous version of this site living at
`F:\Internships\ACC Website\ACC_website` (a separate folder — real photography, real copy,
a real domain-content JSON, a real Google Apps Script gallery endpoint already deployed) and
said to use that instead of inventing placeholders.

- **Palette replaced wholesale.** `--field-deep` / `--paper` / `--ink` / `--accent-lamp` /
  `--accent-ember` / `--glow` (six materials-derived colors) is gone. New system is three
  colors — `--paper` (`#FDFCF9`), `--ink` (`#171310`), `--accent-orange` (`#FF6F00`, the
  existing site's own orange, unchanged) — full reasoning and the addendum table in
  `docs/DESIGN_PLAN.md`. Re-ran the same contrast-checker approach as Phase 0: raw orange
  on paper is 2.72:1 (fails even 3:1), so text/links use a darkened `#BE5504` (4.56:1)
  while raw orange stays a fill-only color. This is the same craft discipline as before —
  the color inputs changed, the verification method didn't.
- **This is not a return to last year's site.** Last year's rejected version (per the
  original brief, §3.3) was *dark-primary* with flame orange on near-black. This palette is
  *white-primary* with black as a real secondary surface (footer, the scripture panel, the
  evening theme) and the same orange rationed to accents — a different structure, even
  though one hue is shared on purpose.
- **Real assets replace invented placeholders.** Pulled directly from `ACC_website/`, not
  redrawn or rewritten: the hero photo (a real candid from Transcend '23), the ACC logo mark
  (icon-only black/white PNGs, inverted via CSS filter for the dark theme rather than
  shipping two files), the seven real service times, the six real domain taglines (from
  `domains_extracted.json`), the home intro paragraph (from the old `index.html`), the
  scripture verse (Matthew 23:11 — verified against ESV wording via BibleGateway, matches
  the old site's unattributed quote exactly), and the footer's real campus Instagram links,
  WhatsApp group link, and map address. Full accounting of what was reused from where is in
  `docs/CONTENT_NEEDED.md`'s "Resolved" section.
- **Image pipeline confirmed working on a real 9MB photo**, not just a small logo: Astro's
  built-in `astro:assets` `<Image>` (backed by Sharp, no extra install needed) generated a
  responsive `srcset` from the 6000×4000 source down to 37KB–720KB WebP files at build time.
  This is the real answer to the brief's "must not ship unoptimized JPEGs" requirement, now
  proven rather than assumed.
- **Not adopting the old site's architecture** — it stored calendar/team/gallery data in
  `localStorage` behind an admin panel with a hardcoded passcode. This project's brief calls
  for typed, build-time-validated content modules instead, which is a real architecture
  change, not an oversight. Flagged as an open decision in `docs/CONTENT_NEEDED.md` in case
  the client actually wants an admin-editable site — not assuming either way. Client
  confirmed: come back to the admin panel question later, not now.
- **Hero photo swapped: candid → the real chapel.** First pass used a real candid from
  Transcend '23 (warm, matched the brief's "students laughing" instinct). Client corrected
  this directly: use the chapel photo that's already on the old site. Swapped to
  `Chapel_photo_43.png` — the same image used as the old Calendar page's banner, a 4:3 crop
  of `Chapel_photo.png` prepared for exactly this kind of wide use (the tall original is
  3211×5708; the crop is 3211×2425 and unused anywhere else, so it reads as a
  purpose-made hero variant, not an odd leftover). Lightened the scrim to match — this photo
  is already dark end to end (the old site used it starkly, no overlay at all), so the
  original heavy top-to-bottom black gradient was fighting an already-dark image instead of
  helping it; replaced with a light edge vignette. `hero-transcend.jpg` removed from
  `src/assets/`, not kept as a fallback — the brief is to use what's there, not to hedge with
  an unused alternate.

## Phase 2 — content layer

Real data from `ACC_website/` (`dynamic_loader.js`'s seed datasets, `domains_extracted.json`)
turned into typed, schema-validated content instead of hand-copied strings in page frontmatter.

- **Astro Content Collections (`file()` loader), not hand-rolled Zod calls.** Considered a
  plain `.ts` module exporting typed arrays with a manual `.parse()` at the top, which would
  also satisfy "typed, validated at build time." Went with Astro's native content
  collections instead (`src/content.config.ts` + `src/content/*.json`) because it's the
  idiomatic mechanism for exactly this shape of data in a static Astro site, gives
  `getCollection()` type inference for free, and its errors point at the offending field in
  the offending file rather than a generic parse exception. Note the file has to live at
  `src/content.config.ts`, not `src/content/config.ts` — the nested location is the
  now-deprecated "legacy" collections API and errors loudly if you use it.
- **Five collections:** `domains`, `team`, `services` (the weekly rhythm), `campuses`, and
  `feasts` (2026 liturgical calendar, real data, staged for Phase 6 — not rendered by
  anything yet). Zod schemas are strict (`z.enum` for tier/frequency/link-type, `z.url()` for
  every link) so a malformed entry fails the build instead of rendering wrong silently.
- **Domain `contributions` cleaned, not carried over as raw HTML.** The source JSON had each
  contribution as a string like `"<span>Title:</span> description text"` with embedded
  literal newlines/indentation from the original template. Parsed into `{ title,
  description }` objects with whitespace collapsed — same content, but now real structured
  data instead of an HTML string a template would need `set:html` to render.
- **Full team roster recovered, not just the partial one visible in `domains_extracted.json`.**
  The domains JSON has no head/contact field at all. `dynamic_loader.js` (client-side seed
  data behind the old admin panel) turned out to have all 22 people across all four tiers,
  plus a `domainHeadMap` connecting specific people to specific domains (including that
  "Audio & Visual" is actually three sub-teams — Choir, Dance, Theatre — each with its own
  head, which explains that domain's otherwise-puzzling `whatWeDo` text about dance/theatre/
  music). Reshaped into `team.json` with an explicit `domains: string[]` field per person
  instead of keeping a separate lookup table. Flagged in `docs/CONTENT_NEEDED.md` as
  needing a currency check — this is last year's data, not confirmed still accurate.
- **Image pipeline: bulk `import.meta.glob`, not 40 individual import statements.** Team
  headshots (21 files) and domain galleries (17 files across 5 domains — Logistics has none,
  matching the old site) are pulled in with `import.meta.glob(..., { eager: true })` in
  `src/lib/team-images.ts` / `src/lib/domain-images.ts`, keyed by filename or by folder name
  respectively. Domain banners (6, one per domain, a small fixed set) are explicit static
  imports instead — clearer than a glob for something that small and that unlikely to grow.
  Verified this actually resolves (not just type-checks) by temporarily adding a page that
  imported both helpers and logged counts during `astro build`, confirmed the numbers match
  the source folders exactly, then deleted the page — no debug scaffolding left behind.
- **Home page now reads `services` and `domains` from the collections** instead of the
  hardcoded arrays written during Phase 1 — same visual output, but now backed by the typed
  content layer instead of duplicating it. Header and Footer's nav link arrays (previously
  copy-pasted in both files) consolidated into `src/lib/nav.ts`; Footer's campus list now
  reads the `campuses` collection instead of a third hardcoded copy.
- **Not building About or Domains pages yet** — that's Phase 4. This phase only proves the
  data and the image pipeline resolve correctly; nothing new is visible on the site yet
  beyond Home reading from collections instead of literals (no visual change).

## Phase 3 — Home, for real

The opening moment, per §3.9: spend the boldness in one place. Everything else on this page
stays quiet.

- **The one orchestrated moment, actually built.** The hero photo loads blurred and slightly
  scaled up (`filter: blur(20px) → 0`, `scale(1.03) → 1`, 700–900ms, `--ease-settle`), and
  once it resolves — driven by the image's real `load` event, not a guessed timeout — the
  notice card settles in ~350ms later. This is the sequence Option A promised in
  `docs/DESIGN_PLAN.md` §4: photo first, notice a beat after, nothing else moves on the page
  afterward. Guarded three ways: `prefers-reduced-motion` skips both the blur and the delay
  (checked in JS, not just left to the CSS-transition override in `base.css`, since a
  `setTimeout` delay isn't a transition and wouldn't otherwise be caught); a `<noscript>`
  block forces the final visible state if JS never runs, so a no-JS visitor never sees a
  permanently blurred hero; and the image's own `width`/`height` (from `astro:assets`) mean
  none of this shifts layout.
- **"This week" is real and computed, not hand-typed.** Filters `feasts.json` (32 real 2026
  liturgical dates) to whatever falls in the next 7 days of build time and renders it —
  right now that's "Nativity of Blessed Virgin Mary, Tue 8 Sept," which is real and correct
  for today's date. Deliberately build-time, not a client fetch: extending the runtime
  fetch-and-degrade pattern from the gallery (§5 of the brief) to this needed asking first,
  and the brief says ask before extending it. Tradeoff logged, not hidden: if the university
  doesn't rebuild the site for months, this teaser goes stale until the next ZIP. Worth
  revisiting if that cadence turns out to be a problem in practice.
- **The weekly rhythm now groups by frequency** ("Daily," "Monthly," "Weekly," "In Lent")
  instead of one flat list — a small, honest structural label, not a decorative eyebrow, and
  it's sentence case (no all-caps-tracked anti-default). Reconsidered the Phase 0 wireframe's
  seven-day Mon–Sun horizontal strip here and rejected it: the real service data doesn't
  actually distribute one-per-weekday (three separate things happen daily, two are
  first-Friday-only, one is Sunday-only, one is Lent-only) — forcing it into seven equal
  columns would have meant either misrepresenting the schedule or padding empty days, both
  worse than grouping by what's actually true about each service's frequency.
- **Self-critique against §3.3, checked properly this time, not just asserted:** no card grid
  anywhere on the page (domains and the weekly rhythm are both row-lists with hairlines, not
  cards); no glassmorphism; no all-caps tracked labels; no arrow after "Join us" or "See the
  full calendar"; no middle-dot-joined meta strings anywhere (the specific thing caught and
  fixed in Phase 1 — verified it hasn't crept back in, since "This week" and the weekly
  rhythm were both new code this phase); no numbered markers on the six domains, which are
  still peers; exactly one animated moment, everything else static; real chapel photography,
  not stock.
- **Two things the review caught before calling this done:** the hero's "Join us" button
  had a ~38.5px tap target (`--space-2` vertical padding + small text), under the 44px floor
  in §6 — widened the vertical padding and added `min-height: 44px`. And the scripture panel
  was a flat `--ink` rectangle with no texture at all — added the grain utility that's been
  sitting unused in `base.css` since Phase 1, which is exactly the kind of "very low-opacity
  paper texture over a large field" §3.6 asks for and this is the first full-bleed color
  field the site actually has.
- **Not adding a top-edge highlight to the hero notice card**, despite §3.6's "edge
  treatment" guidance — that highlight is meant for a raised surface sitting on a
  similarly-toned surface (paper-on-paper), where the sliver of extra light is what reads as
  an edge. This card is white sitting on a photograph; the shadow alone already reads as an
  object there, and a highlight would be invisible against white anyway. Applying it
  everywhere regardless of context would be doing the "one radius everywhere" anti-default
  in spirit, just with shadows instead.

## Phase 3 addendum — scroll reveals and card treatments (client-directed)

Client used `/design` (Claude Design canvas, separate from this codebase) to explore a
sleeker, more Apple-like direction for Home — two rounds: a hero/nav-only pass, then a full
home page. Both stayed on this project's real tokens and fonts (not a new palette). After
review, client asked to bring the second pass into the real site. Two things from that pass
are recorded here because they change or supersede earlier decisions, not because they're
routine implementation notes.

- **Scroll-triggered reveals are now this site's policy — a deliberate reversal of
  `docs/DESIGN_PLAN.md` §3.8's "one orchestrated moment only" rule.** That rule was a
  considered Phase 0 decision, and Phase 1's own notes caught and fixed a fade-and-slide-up
  anti-pattern in service of it. This isn't an oversight overriding it — the client saw both
  the restrained version (Phase 3) and the fuller-motion version side by side in the design
  canvas and explicitly chose the fuller one, twice (once approving the canvas, once
  confirming it should apply to the real site specifically because it reverses the
  established rule). Kept from sliding into the exact anti-pattern the rule existed to
  avoid, on purpose:
  - Every section's reveal is real IntersectionObserver-driven, fires once per element
    (`unobserve` after), and is skipped entirely — not sped up — under
    `prefers-reduced-motion`, with a `<noscript>` fallback forcing the final visible state.
  - Sections don't all get the identical fade-up: the intro is a single centered block; the
    weekly-rhythm and domain cards stagger in via `nth-child` transition-delay (a cascade,
    not a single mass movement); the scripture verse gets its own slower `reveal-scale`
    (scale + fade, 900ms) since it's the page's closing moment, not another list item.
  - New token: `--ease-soft` in `tokens.css`, kept separate from `--ease-settle` — the hero's
    load-time moment and the scroll reveals are different kinds of motion and shouldn't
    share a curve just because both are "easing."
  - Open question this doesn't resolve: whether this policy is Home-only or sitewide. Taking
    it as sitewide going forward (Prayers, Calendar, Media, etc. in later phases) unless told
    otherwise, since a page-by-page motion policy would itself be an inconsistency worth
    avoiding.
- **Weekly rhythm and domains moved from flat rows to real cards.** The Phase 3 ledger/row
  treatment (hairline dividers, no elevation) is gone from Home; both sections are now
  `--bg-raised` (services) / a new `--card-accent-bg` (domains) cards with hover lift and
  shadow-deepen. New token pair `--card-accent-bg` / `--card-accent-text`: dark ink on the
  light theme's white page, one step lighter than the page on the dark theme (plain
  `--ink` would be invisible against an already-`--ink` dark-theme background) — this is
  what keeps the domain cards reading as a bold, always-contrasting object in both themes,
  the same way the design canvas's dark cards did in its single (light-only) theme.
  Contrast unaffected: both card backgrounds already had verified text pairings from
  Phase 1 (`--card-accent-text` is just `--paper`, already checked against `--ink` at
  18:1).
- **Not changed:** palette, fonts, the hero's own load sequence (photo blur-up → notice
  settle), the real content in every section. This was a motion-and-layout upgrade, not
  another content or color pass.

## Phase 3, second addendum — header contrast bug, hero title, badges

- **Real bug fixed: header nav/logo were invisible over the hero.** `Header.astro` styled
  the wordmark, nav links, and logo icon from `var(--text)` unconditionally. `--text` is
  theme-derived (dark ink in the default light theme), so a transparent header sitting over
  the dark chapel photo rendered dark-on-dark until the user scrolled past the solidify
  threshold. Fixed with header-scoped custom properties (`--header-fg`, `--header-accent`,
  `--header-track-bg/border`) set one way on `.site-header` (light, for over-the-photo) and
  overridden on `.site-header.is-solid` (the theme's real `--text`/`--border`) — `color`
  transitions smoothly between the two because the transition is on the resolved property,
  not the custom property swap itself. `ThemeToggle.astro` reads the same variables with a
  `var(--text)` fallback so it still works correctly anywhere else it might be used.
- **Hero gets an actual title and subtitle**, not just the notice card — "Association of
  Christian Christites" / a subtitle naming CHRIST (Deemed to be University), Kengeri. This
  reverses the Phase 0 Option A rationale that the hero should carry no headline copy
  competing with the photo; client asked for it directly, by name, after the card-only
  version read as too sparse. Kept the photo doing the real work by sizing the title at
  `--text-h1` (not the larger `--text-hero` token, which assumes no other content sharing
  the block) and strengthening the scrim in three separate passes (top strip for the header,
  bottom for the title/card, corner vignette) instead of one flat gradient.
  Folded the hero notice card into that same rationale, gently: it's now dark frosted glass
  (`backdrop-filter: blur(20px)`) instead of solid white, so it reads as part of the photo's
  own depth rather than a separate object pasted in the corner. This is also, incidentally,
  the "one deliberate glass surface" the Phase 0 plan flagged as undecided and never placed.
- **Badges introduced as one shared component-class (`.badge`)**, used for both "This week"
  dates and service-card times — same visual language in two places rather than two
  different treatments for the same kind of information (a point in time).
- **Domain cards gained a hairline border** (`color-mix` against the card's own text color,
  not the page border token, so it works identically regardless of which theme's
  `--card-accent-bg` is active) and intro gained three stat pills, all restating facts
  already in the intro paragraph or the content collections (5,000+ students, six domains,
  the daily Mass/Rosary rhythm) — not new claims.

## Phase 4 — About and Domains

First real payoff of Phase 2's content layer: `team.json`'s 22 people and four tiers,
`domains.json`'s full text, `getDomainGallery()`, and `domainBanners` had all been sitting
unused since they were built — nothing on the site rendered them until now.

- **`DomainCard` extracted as a real shared component** (`src/components/DomainCard.astro`),
  used by both Home's domain grid and the new `/domains/` index — it was inline, duplicated
  markup+CSS in Home before this. Same move for `PersonCard.astro` (portrait, name, role,
  social links), used by both the About team grid and a domain's head display, at two sizes
  (`md` for grids, `lg` for a single featured head).
- **Missing portraits get a designed initials fallback, not a broken image.** Two people in
  `team.json` (Jerin Geo Jacob, Jincy Cherian) have `imageSource: null` — `PersonCard` shows
  a monogram circle in the same token system instead of an empty `<img>`. Verified in the
  actual build output, not assumed: both render `JG`/`JC` correctly.
- **Domain pages are one dynamic route** (`src/pages/domains/[id].astro`,
  `getStaticPaths()` off the `domains` collection) rather than six hand-written files — the
  content differs, the template doesn't. Confirmed all six built correctly, including the
  two edge cases: Logistics & Hospitality (no gallery images at all — section omitted
  entirely, not an empty grid) and Audio & Visual (three heads, not one — head display
  switches from the single large `PersonCard` to a grid of three).
- **Two more real content gaps found and flagged, not invented:** a domain head's direct
  contact (email/phone — only social links exist in the data) and, more importantly, what
  joining a domain actually costs in hours per week, which the brief's own spec for this
  page explicitly asks for. Both are on-page `[NEEDS COPY]` tags on every live domain page
  now (the join-section one), not just a note buried in this file.
- **About's mission/vision/quote laid out as a three-part row** (mission card, quote card in
  `--ink` for contrast, vision card) echoing the old site's own three-card layout for that
  content, but in this project's card language (radius-lg, `--bg-raised`) rather than
  reproducing its visual style.
- **Team roster shown with its currency caveat on the page itself**, not just in
  `docs/CONTENT_NEEDED.md` — a `.content-needed`-styled line right under the "Core team"
  heading on `/about/`, since this is last year's data and nobody's confirmed it's current.

## Phase 5 — Prayers

The content isn't ACC's own — it's fixed Catholic liturgical text — so "don't invent
content" here meant "don't trust memory for anything long enough to get subtly wrong,"
not "source it from the old site."

- **The Litany of Loreto's ~54 Marian invocations were verified against a real source, not
  transcribed from memory.** A first WebFetch pass against Wikipedia's English article came
  back pre-summarized ("Mother of Christ through Mother of Mercy...") — useless for an exact
  count — so I re-fetched asking specifically for the article's Latin text table, which
  returned the complete, unabridged list (Wikipedia's `Litany_of_Loreto` article, "Text"
  section). Translated that verified Latin list into English myself rather than trusting a
  second summarized fetch for the translation — these are standard, well-known Latin
  liturgical titles, so the translation risk is low; the enumeration risk (missing or
  reordering one of 54 near-identical "Mother of X" / "Queen of Y" lines) was the real one,
  and that's what got verified. `src/content/prayers.json`'s litany entry was generated by a
  script from that verified title list (134 lines: 9 opening exchanges + 54×2 + 4 closing
  exchanges), not hand-typed, so the count is provably right rather than eyeballed.
  Short, universally fixed prayers (Our Father, Hail Mary, Glory Be, the Apostles' Creed,
  the Fatima Prayer, Hail Holy Queen) weren't independently re-verified — unlike the
  Litany, there's essentially one standard English text for these, memorized identically
  everywhere, so the enumeration risk that justified verification for the Litany doesn't
  apply.
- **Dialogue typesetting is one shared component** (`PrayerDialogue.astro`): a leader line
  renders plain, a congregation response is indented with a left rule and heavier weight —
  structure and typography carrying the distinction, no icon, per the brief's own
  instruction. A prayer with only one line (Sign of the Cross, the Creed, the Fatima Prayer)
  skips the dialogue treatment entirely and renders as a plain paragraph — applying
  leader/response styling to something recited solely together would be inventing a
  distinction the text doesn't have. Caught one real case of this: `hail-holy-queen`'s main
  Salve Regina paragraph was initially tagged `speaker: 'all'` (technically true — it's said
  together) but that made the *whole prayer* render as if it were one long "response" to
  nothing, followed by the real leader/response versicle looking like a second response in a
  row. Retagged that one line `leader` for display purposes (noted in the data with a
  comment) so only the actual versicle gets the response treatment.
- **The Rosary tracker is one flat array of "beads" per mystery set** (`buildRosarySequence`
  in `src/lib/rosary.ts`), generated from the five mystery titles and the prayer ids rather
  than hand-authored — 80 beads per set (7 opening + 5 × 14 per decade + 3 closing), verified
  against the built page's own embedded data rather than assumed: pulled the real JSON out
  of the built HTML and confirmed all four sets are exactly 80 beads with the Hail Marys
  numbered 1–10 inside each decade in the right position. A flat index is what's persisted
  to `localStorage` (`acc-rosary-set` / `acc-rosary-position`) — "remembers position" per the
  brief means exactly this, restored on next visit; finishing the last bead clears it, so a
  completed Rosary doesn't come back as "resume."
- **The reading-mode requirement (larger type, dimmed surroundings, no chrome) was built for
  the Rosary specifically**, not as a generic mode every prayer gets — it's the one place on
  this page with real state to protect (a position worth not losing) and the one the brief
  names by example. It's a real modal: `role="dialog"`, focus moves in on open and back to
  the trigger on close, `Escape` closes, the header/main/footer get the `inert` attribute
  while it's open (not just `aria-hidden`, which doesn't stop keyboard/pointer interaction)
  — this is the same bar section 6 of the brief sets for the Media lightbox, applied here
  first since this page came first.
- **This page opts out of the sitewide scroll-reveal policy from the Phase 3 addendum.**
  Reference/reading content (a book of prayers someone opens with a specific prayer in
  mind) is worse, not better, for making them wait on a fade-in before they can read it —
  the policy's own rationale (an Apple-style marketing scroll) doesn't apply to a page that
  isn't trying to build anticipation. Everything here renders immediately.

## Phase 6 — Calendar

- **`feasts` gained a `category` field** (`feast` / `event` / `liturgy` / `outreach`,
  Zod-defaulted to `feast`) rather than becoming a new collection — the brief's four
  calendar categories are a filter on one events collection, not four different kinds of
  data. The default meant the 32 existing real feast entries didn't need touching to pass
  the new schema. Only `feast` has real data right now (see `docs/CONTENT_NEEDED.md`) — the
  other three categories are real, working filters over an empty set, not stubbed-out UI.
- **date-fns, not hand-rolled month arithmetic**, per the brief's explicit instruction —
  `src/lib/calendar.ts`'s `buildMonthGrid()` is one pure function (`startOfMonth`/
  `endOfWeek`/`eachDayOfInterval`, etc.) called from both the Astro frontmatter (the
  server-rendered initial month, for a real no-JS baseline) and the client `<script>`
  (re-rendering on month navigation and category filtering) — one implementation, not a
  server version and a separate hand-rolled client version.
- **Verified against the real build, not assumed:** pulled the embedded event JSON and the
  rendered grid out of the actual built `dist/calendar/index.html` and confirmed the day
  cell for 8 September correctly shows "Nativity of Blessed Virgin Mary," today (5
  September) is marked `day-cell--today`, and the agenda lists exactly the 14 feasts on or
  after today through the end of 2026 — not just that the build succeeded.
- **`.ics` is hand-built text, not a library** (`src/lib/ics.ts`) — generating one VEVENT
  block is a handful of fields with CRLF line endings, not calendar math, so this doesn't
  fall under the date-fns instruction. All-day events use `DTSTART;VALUE=DATE` with an
  exclusive `DTEND` one day later, per the iCalendar spec for all-day events.
- **Agenda is the primary actionable view** (every event's "Add to calendar" button lives
  there), and the month grid is a visual overview only — the brief itself says the agenda
  "is what works on a phone," and splitting the interaction that way (browse visually,
  act in the list) avoids needing a per-day popover just to fit an `.ics` button into a
  small grid cell. Defaults to Agenda under 40rem viewport width, Month above it; a manual
  toggle overrides either way regardless of screen size.
- **Not built:** the "quiet liturgical-season color layer" the brief explicitly frames as
  optional ("consider... if it can be done without turning the grid into confetti"). Doing
  it properly means computing Easter (and therefore Lent and the Easter season) via the
  Computus algorithm, which is real added complexity for a nice-to-have — logged in
  `docs/IDEAS.md` rather than built speculatively.

## Phase 7 — Media

- **Correcting a real mistake from Phase 2:** the notes there claimed the gallery Apps
  Script endpoint had been "found live" in `ACC_website/js/javacont.js`. Re-checking that
  file while wiring up the actual fetch this phase, that URL is the *contact form's*
  submission handler — an unrelated script, POSTing Name/MailId/Message. Grepped every
  `script.google.com` occurrence in the old codebase to be sure: the gallery script
  (`DriveGalleryAPI.gs`) exists as a template with clear deploy instructions, but its
  `ROOT_FOLDER_ID` is still the literal placeholder `"YOUR_FOLDER_ID_HERE"` — it was never
  actually deployed. Corrected in `docs/CONTENT_NEEDED.md` rather than left standing.
  Practical effect: `config.js` ships with `window.ACC_GALLERY_URL = ''` (genuinely
  unconfigured, not a placeholder standing in for a real value), and the copied
  `handover/DriveGalleryAPI.gs` plus its own header comment are what the university's team
  actually deploys to get a real URL.
- **The static fallback albums are real ACC photos, not placeholders** — four each from
  `ACC_website/Images/`'s Bereshith, Transcend '23, Inaugural Mass, and Assumption of Mother
  Mary folders (a subset, not the full folders, to keep the fallback light — the live feed
  is where the complete set lives once configured). "Bereshith" is spelled that way
  (matching the brief's own §2 naming) even though the source folder is named "Berishith" —
  a filesystem typo, not a second real spelling.
- **Weight budget checked against the real build, not assumed:** pulled every image URL the
  static Media page could possibly load (4 covers + per-photo thumb and full-size for all
  16 bundled photos, worst case) out of `dist/media/index.html` and summed their actual
  file sizes on disk — 36 files, ~3.0MB total, against source JPEGs that were 8-10MB each
  before Astro's pipeline touched them. Initial page load is just the 4 cover thumbnails
  (~28-77KB each); the rest only loads when a viewer actually opens an album.
- **One JS module (`src/lib/calendar.ts`-style pattern), two contexts:** the live-fetch
  branch reshapes the Apps Script response (`{event, cover, images: [{url, thumb}]}`, per
  the `.gs` file's own documented shape) into the same `{id, title, cover, photos}` shape
  the static albums already use, so the lightbox and grid rendering code doesn't need to
  know which source it's looking at.
- **Video is structurally supported, not exercised** — every media item carries a `kind:
  'image' | 'video'` field and the lightbox stage branches on it, per the brief's "mixed
  image and video." The deployed `DriveGalleryAPI.gs` template only collects files whose
  MIME type starts with `image/`, so nothing live will ever actually be `'video'` unless
  that script is edited — out of scope here since it's the university's already-existing
  script, not part of this repo. Noted so it doesn't look like an oversight.
- **Caught the same anti-pattern again, faster this time:** the lightbox caption first
  read `${album.title} — Photo X of Y`, joining two distinct fields with a dash the same
  way the "This week" line and the domain-card arrow got caught and fixed in earlier
  phases. Split into two stacked elements (title, then position) before it shipped instead
  of after.

## Phase 8 — Contact and 404

- **The contact form posts to the real, currently-live endpoint**
  (`ACC_website/js/javacont.js`'s Apps Script URL) — the one Phase 7 correctly identified as
  the contact form's own submission handler while un-mixing it from the gallery mistake.
  Field names (`Name`, `MailId`, `Message`) are kept exactly as the old site sent them,
  plus one new field (`Private`) for the "keep this private" checkbox the brief asks for —
  a backend expecting the first three by name shouldn't break from one extra field showing
  up. Did not test this against the live endpoint (that would file a real submission into
  whatever it's connected to); verified the request shape and field names by reading the
  old site's own working submission code instead.
- **Email validation reuses the old site's actual regex**
  (`/^[\w-]+(\.[\w-]+)*@(.*\.)?(christuniversity\.in)$/i`, from its jQuery Validate custom
  method) rather than writing a new one — same rule, kinder error text: "That doesn't look
  like a christuniversity.in address — we ask for one just so we know it's really you," in
  place of a bare "invalid email."
- **Caught myself inventing an unconfirmed process while writing the "keep this private"
  copy.** First draft said checking it means a request is "never read aloud or passed
  along" — a specific claim about how ACC actually handles these, which nobody confirmed.
  Reworded to state only what's true regardless of their internal process (it goes no
  further than whoever already reads the form) and left the actual reader identity as a
  visible `[NEEDS CONFIG]` tag rather than guessing at both the who and the how.
- **Success is a DOM state swap, not a redirect** — per the brief, correcting the old
  site's redirect to a separate `success.html`. The success message takes focus
  (`tabindex="-1"` + `.focus()`) so it's announced to a screen reader immediately, not just
  visually swapped in.
- **The map iframe does not exist in the page until a viewer clicks "Show map"** — verified
  against the actual built `dist/contact/index.html`, not just the source: zero `<iframe>`
  elements present before that click. Reuses the exact real embed (coordinates and place
  ID) from the old site's own footer, not a re-derived one.
- **404 handling needed one more file than the page itself**: Astro emits `dist/404.html`,
  but plain Apache doesn't serve it for missing URLs without being told to. Added
  `public/.htaccess` with `ErrorDocument 404 /404.html` — small, directly required by this
  project's actual PHP/Apache hosting reality (brief §5), not scope creep. Commented that
  the path needs adjusting if the site ends up deployed to a subdirectory, matching how
  `astro.config.mjs`'s own `base` comment already flags that same one-line change.

## Phase 9 — Handover: accessibility and performance audit

- **Ran a real Lighthouse CLI audit, not a simulated one** — built `dist/`, served it with
  `python -m http.server`, pointed Lighthouse at real headless Chrome. First pass on Home:
  Performance 96, Accessibility 95, Best Practices 96, SEO 100. Three concrete bugs came out
  of it, all fixed and reverified (second pass: Accessibility 100, Best Practices 100, SEO
  100, Performance 96 — unchanged, see LCP note below):
  - **Header logo was forced to a 1:1 box it isn't.** `logo-mark-black.png` is actually
    331×255 (1.30:1), but the `<img>` carried `width="28" height="28"`, quietly squashing it
    every render. Corrected to `width="36" height="28"`, the same real ratio.
  - **Two controls' accessible names didn't contain their own visible text** (WCAG 2.5.3,
    Label in Name) — a screen-reader user hears a name a voice-control user's "click ACC" or
    "click Daylight" wouldn't match. The header wordmark's `aria-label` was a full sentence
    with no "ACC" in it; deleted it and let the visible "ACC" span (the icon has empty `alt`)
    stand as the link's name on its own. The theme toggle's `aria-label` said "Switch to the
    evening theme" while the visible label read "Daylight" — reworded both states to lead
    with the visible word itself ("Daylight theme. Switch to evening." / "Evening theme.
    Switch to daylight.").
  - **Two separate contrast failures, both from tokens verified against the wrong
    background.** `--muted-light`/`--muted-dark` were checked against `--paper`/`--ink`
    directly (4.61:1 / 4.65:1) but never against `--bg-raised`, which several cards actually
    sit on — against the raised surface they only hit 4.26:1 / 3.56:1. And
    `--accent-orange-text` was checked against plain `--paper` (4.56:1) but the "This week"
    date badge and the Rosary's mystery badges render it on a *tinted* background (a 14%
    orange mix over the raised surface, `#f6e1cd`), where it only reached 3.68:1. Same root
    cause both times: a token's contrast ratio was computed once, against one background,
    and reused everywhere the token's *name* said "safe" without rechecking against every
    surface it actually renders on. Fixed by recomputing each token with a Node script
    against every background it's actually used on and picking a value that clears 4.5:1 on
    all of them at once (`--muted-light` #757370→#6c6966, `--muted-dark` #7c7b79→#969390,
    `--accent-orange-text` #be5504→#a34a06) rather than adding parallel per-surface tokens —
    these three are used widely enough that a second "muted-on-raised" token would just be
    one more place to forget to use correctly. Recorded the verified ratios directly in the
    token comments this time, against every surface, not just one.
- **The LCP element is the hero subtitle's text, with a ~1.1–1.2s "element render delay"
  (TTFB is ~70–100ms) — investigated, not fixed, because the investigation points at the
  test environment, not a real bug.** Ruled out FOIT (`font-display: swap` is set on both
  self-hosted `@font-face` rules) and ruled out a stray Google Fonts `<link>` leaking in from
  the `/design` canvas work (grepped `src/` for `fonts.googleapis.com`/`fonts.gstatic.com` —
  none). The `render-blocking-insight` audit attributes only ~470ms of the delay to the two
  render-blocking stylesheets it can see (`BaseLayout.css` 11.2 KB, `index.css` 9.3 KB); the
  hero subtitle itself carries no opacity/transition of its own, so it isn't a scroll-reveal
  or fade-in eating the rest. The likely remainder is `python -m http.server`: it's
  single-threaded with no gzip/brotli and no HTTP/2, so a browser's parallel requests for
  HTML/CSS/fonts queue and serialize in a way real Apache (compression, keep-alive,
  multiplexing) won't reproduce. Shipping render-blocking `<link>` tags for above-fold CSS is
  the correct call here (the alternative is a flash of unstyled content), so there's nothing
  to change in the code from this finding — recommending in the handover doc that whoever
  manages the live deployment re-run Lighthouse against the real Apache server once it's
  live, since this number is expected to drop there, not something to chase further on a
  local static file server.
- **Cross-browser reasoning pass** (no physical Safari/Firefox devices available here):
  audited every non-trivial CSS/JS feature actually used sitewide against current browser
  support tables rather than guessing. Findings: `color-mix()`, `backdrop-filter`
  (`-webkit-` prefixed alongside it, already in place for older Safari), and the `inert`
  attribute are all supported unprefixed in current Chrome, Firefox, Safari, and Edge — no
  fallback needed for realistic current traffic. No `:has()` or `@container` anywhere in the
  codebase. The Rosary overlay and Media lightbox are hand-built `role="dialog"` panels, not
  the native `<dialog>` element — deliberately sidesteps `<dialog>`'s own cross-browser
  `showModal()`/`::backdrop` inconsistencies entirely, though that was this component's
  accessibility design from Phase 5/7, not something changed for this pass.
- **Final "what's trying too hard" pass, done honestly rather than performed**: reread
  every page's most decorated moment — the hero (photo, scrim, glass notice card, scroll
  cue), About's mission/vision/quote cards, both domain-detail heroes, the Rosary overlay,
  the scripture panel — looking for a flourish to cut. Concrete evidence it's already
  restrained rather than just asserting so: exactly two CSS `@keyframes` exist in the entire
  codebase (the hero's scroll-cue dot and the media page's loading shimmer, both functional,
  not decorative), the hero has no scroll-parallax transform even though an earlier `/design`
  canvas exploration of this same page prototyped one — it was deliberately not carried into
  the shipping site along with that canvas's other flashier ideas, only the more disciplined
  scroll-reveal pattern was. Concluded there's nothing left to cut that wouldn't be cutting a
  feature the client actually asked for (the intro stat pills, named explicitly in their own
  UI feedback) rather than an unrequested flourish — recorded as a real, evidence-backed
  finding rather than manufacturing an edit for the sake of ticking this off.

## Phase 10 — Client review: "basic," "nothing impressive," no animation

Client feedback after seeing the live build: it looks basic, nothing about it is impressive,
and no animation. The Phase 9 "final pass" above concluded there was nothing left to cut — that
was the wrong question to have asked. Looked at the actual rendered pages (not just Lighthouse
JSON) for the first time this project via real screenshots, and the client's read holds up:

- **First screenshot attempt was itself misleading and worth recording.** A `chrome --headless
  --screenshot` at an artificially tall window (1440×3200, to capture several sections in one
  shot) rendered the hero at `92svh` of *that* window — nearly 3000px tall against 1440px wide,
  an aspect ratio no real browser produces — which crushed `object-fit: cover` into cropping
  almost the entire photo down to a narrow center strip (just the glowing cross on black,
  none of the mosaics/stained glass/warm ceiling light the real photo has). Nearly misdiagnosed
  the hero photo itself as the problem. Re-shot through a real Chrome DevTools Protocol session
  at a realistic 1440×1000 instead (a small dependency-free CDP script, since headless
  Lighthouse's own screenshot flag doesn't reflect real usage at unusual sizes) — at a real
  viewport the hero is genuinely one of the site's stronger moments and wasn't touched.
- **The actual problem, confirmed by looking at real, correctly-rendered screenshots: every
  section below the hero was a flat, solid-color rectangle.** Six identical solid-`--ink` domain
  cards distinguished only by name and one line of text — despite this project already having a
  real, high-quality banner photo per domain (`src/lib/domain-images.ts`'s `domainBanners`,
  already used one page deeper on each domain's own detail page) that the home page and the
  domains index page simply weren't using. The "This week" card and the seven service-time
  cards were flat `--bg-raised` boxes with no material distinction from the page background
  beyond a 1px shadow. The scripture panel's `.grain` texture (`src/styles/base.css`) was
  applied with `mix-blend-mode: overlay`, which on a near-black base is mathematically close to
  a no-op (`2 × base × blend` stays near 0 when base is near 0) — so the panel was flat solid
  ink, texture included in the code but invisible on screen. This is the generic-template look
  Lighthouse cannot catch (it doesn't grade "does this look distinctive"), and it's exactly what
  incremental per-phase QA kept missing: each phase checked its own new content against real
  data and accessibility, never asked "does this section look like it was designed for THIS
  community, or could it be swapped into any site."
- **Fixed by putting existing, real assets to work rather than adding anything new**: gave
  `DomainCard.astro` an optional `image` prop and wired both the home page and `/domains/` to
  pass each domain's own real banner photo — the same six photos already vetted and shipped
  one click away, just never surfaced at the grid level. Added a photo + scrim treatment
  matching the hero's own visual language (so the new richness reads as this site's style, not
  a bolted-on effect), with a fixed, non-animated darkened resting state rather than a hover
  zoom. Fixed the grain's blend mode to `screen` (adds the noise layer's luminance directly,
  which actually shows against a dark base — this class is only ever used on one dark panel, so
  no light-background tradeoff to weigh) and gave the scripture panel a soft warm radial glow
  instead of flat ink. Gave the schedule and "This week" cards a thin `--accent-orange` top rule
  and a slightly deeper shadow on the "This week" card — small, but enough that they read as a
  considered material rather than a default `<div>` with padding.
- **Removed the animation sitewide, per explicit client instruction, not just toned it down.**
  Deleted the IntersectionObserver scroll-reveal system in its entirety (`.reveal`/
  `.reveal-scale`, the observer script, the `<noscript>` fallback it needed) — it was confined
  to `index.astro` alone (checked with a sitewide grep before touching anything), so this was a
  contained removal, not a sitewide hunt. Also removed the hero photo's blur/scale load-in
  transition, the notice card's delayed fade-in, and the scroll cue's infinite bouncing-dot
  `@keyframes` — all ambient, on-a-timer motion nobody triggered by acting. Kept short,
  discrete hover-state transitions on interactive elements (card borders, link colors, button
  lift) — those are direct feedback to something the visitor just did, not motion playing on
  its own, and cutting those too would make hover states feel broken rather than "not
  animated." Flagged this distinction back to the client rather than assuming it silently.
- **Re-verified nothing regressed**: `astro check` clean, Lighthouse on Home and `/domains/`
  after the change still 100 Accessibility / 100 Best Practices / 100 SEO (the new photo
  scrims were built dark enough at the text-bearing edge to keep white text well past 4.5:1,
  not just visually "looks fine"), Performance 96/97, unchanged from before this pass.

## Phase 10 addendum — a real bug this whole audit had missed: "Prayers not working"

The client's next report was a functional bug, not a taste one: the Prayers page didn't work
at all. It wasn't — and neither was Media, for the same reason, undiscovered until now because
nothing this project had done up to this point actually loaded these pages in a real browser
and looked. Lighthouse, `astro check`, and the Phase 9 accessibility audit all pass on a page
that's permanently covered edge-to-edge by an empty modal, because none of those tools check
"is the thing marked `hidden` actually hidden" — that's a rendering question, not a markup or
a11y-tree one.

**The bug, present in three places**: `RosaryPlayer.astro`'s `.rosary__overlay`,
`media/index.astro`'s `.lightbox`, and its `.album-skeleton` all set a `display` value
(`flex`/`grid`) on the same class the element's `hidden` attribute is meant to hide behind.
The browser's own UA stylesheet contains an implicit `[hidden] { display: none }` rule, but it
has the lowest possible specificity — any author rule targeting the same element by class,
`display: anything`, silently wins over it. The result: the Rosary overlay (a full-viewport,
`role="dialog"` panel) and the Media lightbox rendered open, centered, and empty on every load
of their respective pages, and the Media page's 4-tile loading skeleton stayed visible
permanently alongside the real grid rather than only during a live fetch. On Prayers this reads
as "the whole page is broken" (which it was) rather than "a modal is stuck open," because the
overlay is genuinely full-viewport and opaque enough to hide everything behind it.

**Fix**: an explicit `.the-class[hidden] { display: none; }` rule beside each offending class —
higher specificity than the bare class rule (matches the attribute too), so it wins when
`hidden` is present regardless of what the base rule sets `display` to. Three occurrences fixed
this way; grepped every literal `hidden` attribute in the codebase (eight total) and checked
each one's class against its own CSS for the same `display`-without-`[hidden]`-override pattern
— the other five (`.mobile-nav`, `.agenda-view`, `.field__error`, `.form__status`, `.success`)
have no competing `display` rule on the bare class, so the UA default was never actually
overridden there; genuinely fine, not just unverified.

**Why incremental phase-by-phase QA missed this for two phases running**: Phase 5 (Prayers)
and Phase 7 (Media) both built and reasoned about these dialogs' *behavior* — focus trapping,
`inert` on the background, Escape-to-close, restoring focus to the trigger — and that reasoning
was sound and is still correct. What never happened was actually opening the built page in a
browser and confirming the CLOSED state rendered closed. A textbook case for keeping "look at
the real rendered page" as a standing step before calling any interactive-overlay feature done,
not just "read the markup and reason about the JS."


## Phase 11 — Full redesign: the studio idiom (madeinmay.studio)

Client supplied an offline clone of **madeinmay.studio** (`refs/`) as the reference and
asked for "a clean one-to-one copy" of its design language on ACC's own content, dropping
the white/black/orange palette entirely ("forget the colour hue... go wild"). A 12-artboard
design canvas was reviewed and approved first (see `redesign-canvas/` and the plan at
`~/.claude/plans/`), then built into the real site.

- **Palette replaced, light-only.** `--paper #F6F4EF` / `--ink #141210` / `--blue #1E51F7`
  as the single high-chroma accent, plus derived `--blue-link` (small text on paper, 7.9:1),
  `--blue-ink` (small text on the dark panels, 5.1:1 on ink), `--muted`, `--hair`. Magenta
  `#BB4198` is declared but reserved for one future use (a faint Lent/Advent tint on the
  calendar). The dark-theme maps and the `ThemeToggle` component are **gone** — one
  committed look, matching the reference. Discipline: primary buttons are ink-on-paper
  (always safe), blue is a fill / large-text / UI colour, never small body text.
- **Type.** Display face is **Clash Display** (Fontshare, ITF Free Font License), self-hosted
  and subset the same way as the others — a wide low-contrast geometric grotesk standing in
  for the reference's proprietary "Newedge 666". Schibsted Grotesk stays as text/UI.
  **Fraunces is kept**, scoped to the Prayers page body, the Rosary reading mode, and the
  scripture panels only — a book-set reading face where the leading cost is earned. Section
  markers are lowercase and quiet (the *width* of the display face carries the "label"
  signal), never all-caps tracked — the one deliberate deviation from the reference, which
  shouts them.
- **Motion, reintroduced (third time — see Phases 0/3/10).** The reference is motion-forward
  and the client chose it knowingly after Phase 10 removed everything. Budget: **< 7 KB gz**
  of client JS, all deferred and gated. Lenis (bundled locally via npm, **not** a CDN) for
  smooth scroll — off under `prefers-reduced-motion` and on touch. Scroll reveals are
  IntersectionObserver + CSS, and can **never** trap content: anything on screen reveals on
  load, a scroll wakes anything above the new fold, and a 3 s failsafe adds `reveals-off` to
  `<html>` (instant, no animation) if the observer ever misbehaves; `<html class="no-js">`
  + reduced-motion both force the final state too.
- **Scripture is a system, not a one-off.** A first pass used an animated "ACC" wordmark
  dissolving through an SVG gooey filter as the home divider; the client rejected it
  outright ("primitive... it reads as ACO"). Replaced with a proper reusable component:
  every verse anywhere on the site is defined once in `src/lib/scripture.ts` with its
  translation named (nothing transcribed from memory), and rendered by `Scripture.astro` in
  one of two variants — `feature` (full-bleed dark panel, the closing/dividing moment) or
  `quiet` (an inset Fraunces-italic pull-quote with a blue rule, for use inside body copy).
  Both share the `Reference · TRANSLATION` caption and the Fraunces-italic setting. Used on
  Home (feature, as the intro → domains divider) and Contact (quiet, under the page head).
  ACC's own motto on About ("We Cry, We Pray…") is deliberately *not* run through this — it
  stays set in the display face, so "the community's words" and "the Word" read differently.
- **Home went lean.** Hero (kept title + subtitle verbatim) → welcome paragraph (kept
  verbatim) → a scripture `feature` panel (Matthew 23:11) → six domains as a photo grid of
  peers (no 01/02/03) → **Instagram section** (`InstagramGrid.astro`, build-time static grid
  of real ACC event photos standing in for the six latest @acc_kengeri posts — nothing
  loads from instagram.com; a live runtime feed can be wired later via `config.js` the same
  way the gallery degrades) → big footer. The multi-item "This week" teaser and the
  weekly-rhythm-of-services strip **moved to the Calendar page** (the rhythm renders as a
  7-column horarium there). Hero and the domain-page banner heights are `min(Nsvh, Nrem)`
  so they stay sane on very tall displays.
- **Domains index = the reference's "Approach" page.** Hero → a **belief block** built from
  ACC's real mission ("Following Christ, Changing Lives") and vision ("Family and
  Fellowship") — not the founders' quote, which stays the emotional close of **About** — →
  the six domains as expandable panels. The panels are native `<details>`/`<summary>`
  (`Disclosure.astro`, grouped by a shared `name` so one opens at a time): keyboard- and
  screen-reader-correct with zero JS and works with JS disabled. Reused for the seven
  common prayers on the Prayers page.
- **Domain detail** restyled as a case-study page (banner, large statement, contributions as
  hairline-ruled blocks, head(s), gallery, join). Optional `hoursPerWeek` / `headContact`
  fields added to the `domains` schema so the on-page `[NEEDS COPY]` tags render from data
  once ACC supplies them; until then the tags show, as before.
- **Kept verbatim:** the RosaryPlayer localStorage decade tracker, the Media lightbox's
  focus-trap / `inert` / Escape logic, `.ics` generation, the date-fns month grid, the
  Google Apps Script contact endpoint and field names, the lazy map iframe, the Zod content
  model. Contact gained one optional 3-way select ("prayer request / question / something
  else").
- **`scripts/postbuild.mjs`** rewrites the CSS transformer's Media Queries Level 4 range
  syntax (`@media (width <= 60rem)`) back to `@media (max-width: 60rem)` in the built
  output — the range form is dropped entirely by iOS Safari < 16.4, which a mobile-first
  student audience still runs, and every breakpoint would silently fail there. Runs as the
  last step of `npm run build`.
- **Verified** against the real rendered pages (screenshots at desktop and 390 px, and via
  same-origin iframes at exact CSS widths — a bare `--window-size=390` headless screenshot
  renders at the wrong layout width and falsely shows overflow; the iframe check is the
  reliable one). `astro check` clean; `npm run build` clean.

## Phase 12 — Completing the Phase 11 build

A page-by-page audit against the approved canvas (`redesign-canvas/`) found functional bugs,
canvas features that were never built, and dev markers showing on the live site. All fixed;
verified in a real browser with real clicks and key presses (not just scripted `.click()`),
`astro check` clean, Lighthouse 96–98 / 100 / 100 / 100 on Home, Prayers, Media.

**Bugs that were invisible to every earlier check:**
- **Dialogs were inert.** The Rosary overlay and the Media lightbox are authored inside
  `<main>`, and opening them sets `inert` on `<main>`, so the dialog itself was inert:
  no real click or Tab could reach Close, Next, Back or the thumbnails. Scripted
  `element.click()` bypasses `inert`, which is why it was never caught. Both scripts now
  move their dialog to `<body>` on init.
- **Scoped CSS never reached JS-built elements.** Astro scopes styles by an attribute that
  elements created with `createElement` don't carry, so the Rosary's prayer text, the
  calendar's redrawn day cells, the lightbox thumbnails and live-feed album covers all
  rendered unstyled. Those selectors are now `:global(...)` under a scoped parent.
- **Calendar was frozen at build time.** The month grid and "today" came from the build
  date; the client now redraws for the visitor's date on load and drops past agenda items.

**Built from the canvas:** Rosary progress bar, 10-bead row, sticky mystery line and a
separate "Resume …, decade N of 5" button alongside the Today tag; the Lent/Advent tint
(`src/lib/liturgical.ts`, Gregorian Computus, verified 2024–2027) with a legend swatch;
the Media featured grid with the greyscale + blue colour-blend treatment; the mobile hero
notice as its own dark strip; Contact's "Received." state with "Send another"; per-domain
cross-links; gallery layouts that never leave an orphan tile; the footer campus line.

**Deliberate departures from the canvas:** no wordmark dissolve (client rejected it in
Phase 11), no "Scroll" cue, and no `@acc_kengeri` overlay tags on Instagram tiles
(labels overlaid on photos; the handle sits in the heading and Follow link instead).
`moreOnUs` in `domains.json` stays unrendered: it's a long general description, not
joining information.

**Other:** `[NEEDS …]` tags are now the `Needs.astro` component, shown in `astro dev` only
(or a build with `PUBLIC_SHOW_NEEDS=true`). Contact posts URL-encoded, matching the old
site's jQuery `serialize()`, since Apps Script's `e.parameter` doesn't read multipart.
Header solid state uses an IntersectionObserver instead of a scroll listener; the mobile
menu closes on Escape and on link tap. Em/en dashes removed from all visible copy and page
titles (`Page | Association of Christian Christites`). Raw rgba scrims moved to tokens.
Unused `src/lib/dates.ts` deleted.

## Phase 13 — Full visual redesign: CHRIST navy and gold, a 3D hero

**Client feedback on Phase 11/12:** "not up to mark", "uses black a lot", replace the hero
photo, use CHRIST University's colours and the real ACC logo, and put a clean 3D on-scroll
animation of Jesus holding children's hands on the front page. "No AI slop."
Decided with the client: the hero is built from a public-domain painting, and the logo is
the dove wordmark the previous site used.

**Palette (`src/styles/tokens.css`).** CHRIST's published brand colours, navy `#052C6B` and
gold `#DDAE68` (Brandfetch listing for christuniversity.in; the navy ring and gold flame of
the crest, christuniversity.in/logo-and-anthem), on a cool white `#F6F8FB`. There is no
black surface anywhere: navy is the only dark ground (footer, Mission/Vision, the Rosary
block and reading mode, the lightbox). Every former ink panel is now either navy or a pale
wash (`--navy-wash`, `--gold-wash`, `--raised`) with a rounded corner. Gold is used as a
fill or on navy; on light grounds small gold text uses `--gold-text` `#87601D`. Lent/Advent
uses a liturgical violet tint. Contrast measured for every pairing actually rendered
(WCAG relative luminance): body text 6.0:1 or better everywhere; gold-text 4.75 to 5.3:1;
gold on navy 6.5:1; text on gold buttons 8.1:1; input borders 3.6:1; white text over the
photo scrim 7.2:1 even on a pure white photo.

**Type.** Satoshi (Fontshare, ITF Free Font Licence) for display and UI, replacing both
Clash Display and Schibsted Grotesk: one clean grotesk instead of two. EB Garamond (OFL)
replaces Fraunces as the reading face for prayers, scripture and the Rosary reader. No
Garamond weight below 400 (the old 320 to 360 values were Fraunces-specific).

**Shape.** One radius system: 0.5rem small, 1rem photos and cards, 1.5rem panels and the
hero window, pill for every button, chip and toggle.

**Logos.** Header: `src/assets/brand/acc-logo.png` (from the client's `ACC_WHITE.png`; the
`ACC_BLACK.png` file has a typo, "Assosiaction") rendered through a CSS mask so one file
draws navy on light. Footer: the same wordmark in white plus the CHRIST lockup linking to
christuniversity.in. Favicon, apple-touch-icon and 512px icon regenerated from the dove.

**Hero: a full-screen 3D world, not a picture.** The first pass (a public-domain Carl Bloch
painting cut into depth layers and shown in a framed window) was rejected: it was a flat image
moving inside a card. It was replaced with a real modelled scene. The painting, its depth
pipeline and the WebGL2 renderer are archived outside the project (`scratchpad/retired/`).
- *Second revision (client feedback: "maybe remove jesus, but group of friends holding hands,
  this is too cartoony, give some richness ... ribbons are too random ... i prefer some clean
  ribbon").* The first modelled scene (Jesus among eight children, a three-step toon ramp,
  four fluttering ribbons) is archived outside the project (`scratchpad/retired/hero-toon/`).
- *Third revision (client feedback: "not what i had in mind, not the ribbon and not the 3d
  ... its facing somewhere else, and the model is crappy ... use ribbons like that" with the
  IIC 2027 site they built for another CHRIST event as the reference, and "use it like the
  lines used there" as the fallback).* The modelled, lit hilltop scene and the thin page line
  were replaced outright with the reference site's two languages: its hands drawn as points
  and lines, and its thick amber ribbons drawn on by scroll.
- *Fourth revision (client feedback: "the ribbons and color is exactly one to one copy, actually
  change something ... the ribbon should be full screen, not limited to a section ... dont use
  the lines, use something different ... more richer and good looking").* The point-and-line
  friends and the per-section amber ribbons (both lifted from the reference) were removed.
- *The scene* (`src/scripts/hero-scene.ts`, Three.js): a paper chain of four friends (three on
  phones), cut from one folded strip so they are joined at the hands, the fold running through
  each pair of joined hands. Each friend is five sheets a few millimetres apart: a gold backing
  cut a little larger than the figure, and on both faces the figure in cream paper with their
  clothes pasted on (navy, sky, mustard, clay, with a fine gold collar) and their own hair on
  top (long, short, ponytail, curly). Faces are blank. All sheets are painted once into one
  texture with a paper grain and the small soft shadows each pasted piece throws on the one
  below, then lit as real paper (sky and ground fill, a warm key from the upper left) with soft
  real shadows thrown onto a floor and a wall that show nothing but the shadow, so the chain
  stands on the page itself.
- *The story* (the page pins for 4 screens, 3.4 on phones): the chain starts half folded, the
  friends fanned out behind the first; it opens like an accordion, each friend swinging out
  from behind the last; it ends gathered in a shallow arc and Matthew 18:20 ("where two or three
  gather") replaces the subtitle. The camera starts close on the folded chain, eases back as it
  opens and swings slowly across it; desktop pointers tilt it slightly. The paper keeps a slight
  flutter at rest, and a tap sends a sway along the chain.
- *The ribbon, new colours* (`src/scripts/ribbon/paint.ts`): a satin ribbon painted in 2D, a band
  of constant width that slowly twists along its length so its CHRIST-navy face and gold back
  take turns facing the viewer, narrowing to an edge at each turn. Each sliver is lit (diffuse
  plus a soft satin highlight) and the band throws a faint shadow on the page; the free end is
  cut in a swallowtail. The reference's flat amber gradient is gone.
- *In the hero:* the ribbon comes in over the friends' heads from the right edge, sweeps down
  past the left of the group and runs under their feet, holding the chain in one curve without
  crossing it; 40% drawn on arrival, whole by the first part of the scroll.
- *Down the page, full screen* (`src/components/PageRibbon.astro` + `src/scripts/ribbon/page.ts`,
  every page): one ribbon the whole length of the page behind the content. The page's text is
  measured; the ribbon runs down one side margin (partly past the screen edge where the margin is
  narrow) and swoops across the full width of the screen through every band of the page that
  holds no text, so it never passes behind words. Photos and small cards simply cover it, so
  across a photo grid it shows between the photos, as if woven through; large panels (the
  scripture panel, the Rosary notice, Mission and Vision) block a crossing so it never hides
  along their edge. Scroll draws it on (head a little above the bottom of the screen) and
  scrolling back takes it back; it ends in a swallowtail above the footer. It is painted into
  page-anchored tiles that scroll with the page, so it never lags behind the content; only the
  tile holding the moving head is repainted. Re-laid out when the page changes size. Reduced
  motion: painted whole, still. No JavaScript: no ribbon. The section ribbons
  (`Ribbon.astro`, `ribbons.ts`) are deleted.
- *Layout:* `src/scripts/hero/layout.ts` measures the copy and returns the free part of the
  stage (right of the copy on wide screens, below it under 60rem). The chain is fitted into
  that box (camera distance from the box size, view offset to its centre) and the hero ribbon is
  drawn in it, so neither runs under the text.
- *Loading:* the LCP is a transparent still of the scene's first frame, shadows included
  (`hero-still-wide.webp` 21 KB at 1440 x 900, a 960 variant 15 KB, `hero-still-tall.webp` 14 KB
  at 390 x 844 x 1.5), sitting over the hero ribbon exactly as the live canvas does; encoded by
  hand (WebP quality 72, alpha 70) and imported with `?url` so Astro does not re-encode them.
  Nothing of Three.js is fetched until the visitor's first scroll, touch, key press or pointer
  move (TBT 0 ms). The engine chunk is 540 KB, 133 KB gzipped. Its warm-up is spread over
  separate tasks (shaders compiled with `compileAsync`, the texture uploaded on its own, one
  hidden render); the one long task left on first scroll is the browser evaluating the chunk
  itself (about 180-240 ms in headless Chrome with a software GPU). If frames run slow it lowers
  its own pixel ratio, down to 1; the loop pauses off screen.
- *Fallbacks:* reduced motion, Save-Data, no WebGL or no JavaScript show the still and the full
  ribbon with the same copy, the verse under the subtitle, and no pinned scroll. A context loss
  drops back to the still.
- *Not measured here:* real frame rate on a phone. The scene is small (twenty flat sheets, one
  texture, one soft shadow map at 1024 on phones, 2048 elsewhere), but it should still be
  checked on a real device.

**Photography.** The six domain banners were AI or stock images; each is now a real ACC
photo from that domain's gallery (Logistics & Hospitality, which has no gallery, uses a
real Assumption-day photo). Galleries skip the photo already used as the banner. Home's
domain section is a 4x3 bento (one 2x2, three wide, two small: twelve cells, no gaps).
The Media page's greyscale-plus-blue cover wash is gone: covers show their real colours.

**Build hygiene.** Every `<Image widths>` now also sets `width` to its largest variant, so
the fallback `src` is no longer the 6000px camera original. `scripts/postbuild.mjs` also
deletes any raster in `dist/_astro` that no built file references (Astro copies originals
of imported images even when only resized variants are used): 29 MB removed, `dist/` is
11.5 MB. OG cards regenerated in navy and gold with the real wordmark, set in static
700-weight instances of Satoshi and EB Garamond cut with fontTools (`scripts/og-fonts/`).

**Verified:** `astro check` 0/0/0; build clean; hero frames captured at the start, 0.3, 0.5,
0.7 and the end at 1440 x 900 and 390 x 844, plus a real wheel-scroll run on the production
build (still first, engine live after the first scroll, no console errors from the site, no
horizontal overflow); the page ribbon checked at five scroll depths on Home and About at 1440
and 390 (crossings land between text, weave behind photos, never behind words); Lighthouse
(mobile emulation) Home 97/100/100/100 (LCP 2.2 s, TBT 0 ms, CLS 0), About 98/100/100/100,
Prayers 95/100/100/100, Media 95/100/100/100. Prayers carries a 0.02 layout shift on its first
section that is identical with all ribbons removed, so it predates this work (likely a web font
swapping in) and is left for a later pass.

## Phase 14: Teal and coral, a pop-up card hero, a paper-craft body

**Client feedback on Phase 13:** they liked the 3D paper-craft hero, but asked to drop the
CHRIST navy and gold ("used many places before"), to push the craft further with better and
more detailed cards, to make the page ribbon move naturally instead of "like a square", and
to put real effort into the body, not only the hero. Decided with the client: a teal and
coral palette, a pop-up greeting card for the hero, and full paper-craft for every page.

**Palette (`src/styles/tokens.css`).**

- **Ground and text:** ground `#F2F6F6`, sheet `#FBFDFC`, ink `#0F2A2E`.
- **Teal:** primary teal `#135E63`, deep teal `#0B3F43`.
- **The one accent:** coral `#F06A55`.
- **Coloured papers:** seafoam `#A7D3CE`, butter `#F4D58D`, sky `#BFD9EA`, peach `#F3B9A9`.

Every navy and gold token and alias is gone, and `.on-navy` is now `.on-deep`.

Coral is a fill, never small text. Small accent text on light uses `--coral-text` `#B23E2B`.

Accents go through `--mark` / `--mark-text`. These are coral on light and switch to butter inside `.on-deep`, so a component takes the right accent from whatever surface it sits on.

Measured contrast for the pairs actually used (WCAG relative luminance):

| Pair | Ratio |
|---|---|
| teal on paper / on sheet | 6.9 / 7.3 |
| ink on any coloured paper | 8.9 or better |
| teal-deep on seafoam, sky, peach, butter, coral-wash | 7.1, 7.9, 6.8, 8.2, 9.8 |
| muted on paper / on sheet | 6.7 / 7.2 |
| coral-text on sheet / on coral-wash | 5.7 / 4.9 |
| butter on deep teal / on-deep text / muted-on-deep | 8.2 / 11.4 / 6.7 |
| ink on coral (today's date) | 5.0 |
| input border on paper | 3.4 |

Muted and teal both fall under 4.5:1 on seafoam and peach, so text on any coloured paper
is ink or teal-deep. That rule is written at the top of `src/styles/paper.css`.

**Paper primitives (`src/styles/paper.css`, `src/components/PaperEdge.astro`).** Every page
is built from a handful of cut-paper pieces:

| Piece | What it is |
|---|---|
| `.sheet` | A sheet with grain and a teal-tinted lift. Its colour comes from a modifier (`.p-seafoam`, `.p-butter`, `.p-deep` ...). |
| `.print` | A photo on a paper mat, with a coloured sheet tucked behind it at an angle. |
| `.ticket` | A piece with notched ends, cut with a mask. |
| `.torn-top` | A deckled top edge. |
| `.cut-num` | Numerals stacked from three cut layers. Used once on the site. |
| `.reveal-lay` | A sheet that settles from a slight angle as it scrolls in. Static under reduced motion. |
| `PaperEdge` | Seeded, layered SVG waves between bands. |

A mask also clips the element's own box-shadow. So masked paper takes its shadow from a wrapper (`.ticket-shadow` or `.cast`, a drop-shadow filter).

The paper grain is one 7.5 KB tileable WebP, made by `scripts/make-paper-grain.py`.

**One radius system:**

| Radius | Used for |
|---|---|
| 4px | photos and inputs |
| 8px | sheets and cards |
| 14px | the scripture shadow box |
| pill | buttons |

**Hero: a pop-up greeting card (`src/scripts/hero-scene.ts`).** The card opens as the page scrolls.

The layers stand up with real parallel-fold kinematics. At opening angle θ, every layer takes the back panel's rotation (π/2 minus θ) and sits at its own depth along the base. Nothing is tweened by hand.

The layers, back to front:
1. the sky, with a sun and rays
2. clouds
3. a ridge with a chapel whose windows are cut through
4. a dove
5. the near hills
6. the paper chain of friends, which unfolds from a stack as the card opens
7. a strip of grass and flowers

Each friend is cut with their own clothes, hair and face, on a white sticker backing.

The engine scaffolding from Phase 13 is unchanged:
- lazy load on first intent
- async shader compile
- one texture upload per task
- pause off-screen
- context-loss recovery

The chunk is 137 KB gzipped.

**The ribbon moves naturally (`src/scripts/ribbon/flow.ts`).** The Phase 13 router ran straight lanes down the margins, with flat crossings between them. It is replaced by a planned path:

1. **Measure the page into two grids.** A block grid marks text that lies on the bare ground; the ribbon must never pass behind it. A cover grid marks photos and sheets; the ribbon may tuck under them.
2. **Search for the path.** A dynamic-programming search runs down the page in 14 px rows and 6 px columns, with the slope capped at 72°. It minimises distance from a slowly wandering target (two seeded sines), plus small costs for running under paper, hugging the edges, and steep slopes.
3. **Smooth it.** The search moves in a staircase. The line is relaxed inside the open corridor around it to the least bent curve, then resampled at 3 px (see "Phase 14 follow-up").
4. **Add curls.** A curl is added wherever its whole footprint is clear. Each curl is a prolate trochoid, so the tangent stays continuous through the loop.

**Behaviour:**
- **One path per page.** Each page has its own seeded path.
- **Flutter on scroll.** While the page scrolls, the newest part of the ribbon behind the head flutters along its normal like fabric, then settles.
- **Planning yields to the browser.** The planning runs in time-sliced tasks that yield to the browser, which matters on long pages. On Home, Lighthouse measured a 400 ms blocking task before the split and 0 ms after.
- **The hero ribbon joins up.** It is art-directed, with one curl beside the card, and leaves the stage at the x where the page ribbon starts, so the two read as one ribbon.

**Body, page by page.**

**Home**
- A paper edge out of the hero.
- The Rosary notice as a butter ticket.
- The intro with a cut-paper "5,000" and a mounted print.
- The scripture as a four-layer papercut shadow box (teal, wavy seafoam, scalloped butter, sheet), with the verse on sky paper.
- Six domain cards, each cut from its own paper.
- Instagram as a scrapbook sheet of crooked prints.

**About**
- The story on a long torn sheet.
- Mission and Vision as two crooked cards, deep teal and coral.
- The team as name badges with a punched slot, cut from a paper colour per tier.

**Domains**
- The disclosure is now a stack of paper folders with tabs (shared with Prayers).
- The photo strip is a row of prints.
- The belief block is a deep teal sheet.

**Domain pages**
- A mounted banner.
- Contribution cards with a folded corner.
- The heads set beside a large heading.
- A scrapbook gallery.
- The join block on a torn coral sheet.

**Prayers**
- The Rosary block in deep teal.
- Each set of mysteries in its own paper: Joyful butter, Sorrowful sky, Glorious peach, Luminous seafoam.
- The litany on one tall torn sheet.

**Calendar**
- The week's rhythm as a deep teal band.
- The month on a sheet, with today as a coral circle.
- Agenda items as tear-off tickets, with the calendar link past the perforation.

**Media**
- Each album is a print with two more stacked behind it.

**Contact**
- The form on a sheet.
- The received note as a butter ticket.
- The map mounted like a print.

**404**
- A note on one torn sheet.

**Site-wide**
- The footer is deep teal under a paper edge.
- The OG cards are regenerated in deep teal, with butter and coral paper strips.

**Verification.**

- **Checks and build:** `npm run check` gives 0/0/0, and `npm run build` is clean (14 pages).
- **Overflow:** no horizontal overflow on any route at 360, 768 or 1440, and no page errors.
- **Reduced motion:** the sheets are at rest and the ribbon is drawn whole.
- **Lighthouse (mobile, production build):** Accessibility, Best Practices and SEO are 100 on all four pages.

| Page | Performance | TBT |
|---|---|---|
| Home | 99 | 0 ms |
| About | 100 | |
| Prayers | 100 | |
| Media | 99 | |

### Phase 14 follow-up: ribbon, paper edges and the litany

**Client feedback:**
- A grey line showed under the paper edges.
- The ribbon had boxy kinks in places.
- The ribbon's head was cut square while it drew, and only became a swallowtail at the end.
- The litany on Prayers ran very long, with "pray for us" repeated under every line.

**Paper edges (`PaperEdge.astro`).** The blurred shadow paths spilled below the SVG through `overflow: visible`, which drew a hairline. Now the layers close well past the frame and the SVG clips (`overflow: hidden`).

**Ribbon path (`flow.ts`).**
- **The cause of the kinks.** The old smoothing snapped samples back onto the search's staircase.
- **The corridor.** For each row, the planner now finds the stretch of open ground around the planned line.
- **The relaxation.** It then relaxes the line inside that corridor with a fourth-difference (beam) smoother for 600 passes. Long sweeps survive, every corner rounds off, and the clamp keeps it off text.
- **Curls.** Curls are laid in the path's own local frame, with positions interpolated by arclength, so they leave and rejoin a bending path without a corner and with clean edges.

**Planning cost.** `planFlow` is now async. It yields between stages, every few milliseconds of the search, and every 200 smoothing passes. Lighthouse (mobile, production build), TBT:

| Page | TBT |
|---|---|
| Home | 0 ms |
| About | 0 ms |
| Prayers | 15 ms |
| Calendar | 0 ms |

Performance is 99 or 100 on these pages.

**Ribbon painting (`paint.ts`).**
- **Swallowtail head.** A swallowtail is cut at whichever end is being drawn, so the head is notched while it draws, not only at the finish. This applies to both the hero ribbon and the page ribbon.
- **Shadow.** The shadow is the band's own outline, cast from offscreen with a canvas shadow. The old fixed-width shadow stroke left a grey halo.
- **No streaks or seams.** Each sliver shares its edge points with the one before, so tight loops have no fan streaks or seams.

**Litany (`src/components/Litany.astro`).** The litany is typeset like a printed one, from the same leader / all data:
- **Echoed or single pairs:** call and answer sit on one row.
- **Short runs** (2 to 7 calls sharing an answer): bracketed, with the answer once.
- **The long run** (the titles of Mary): the answer is set once, large ("After each line, all answer: pray for us"), and the calls are in balanced columns, grouped by first word (Mother..., Virgin..., Queen...).

The page went from about nine screens to three on desktop.

In the common prayers (`PrayerDialogue.astro`), the people's part is marked with a small "All" label and a seafoam rule, not a coral bar.

**Dev note.** The Astro dev server sometimes kept serving a component's old CSS after an edit. Restart it (`npx astro dev stop`, then start) before judging a style change by eye.

**The menu (`src/components/Header.astro`).** At every width, the header is just the wordmark and one Menu button. The inline desktop links and the Instagram and WhatsApp text links are gone from the bar.

The button opens a full-screen sheet of deep teal paper. It drops down under the bar (a clip-path wipe). While it is open, the bar turns teal, the logo goes white, and the button reads "Close", with its bars folded into a cross.

| Width | Layout |
|---|---|
| Wide screens | A numbered contents list on the left: 01 Home to 07 Contact, large display type, with a one-line description of each page. On the right, a cut-paper Jesus who follows the pointer (see "The menu's companion" below). |
| Below 60rem | One column. The page names only, then "Come along" with the Rosary slip and the pills. |
| Short phones (under 760px tall) | A tighter list. The Rosary slip is dropped so the pills stay on screen. |

- **The foot.** A seafoam, butter and coral `PaperEdge` (seed 57) runs along the bottom.
- **The current page** is marked in butter with a short rule.
- **Hover** (wide screens): the row tints, the name shifts right, and the number and description brighten.
- **Behaviour.**
  - Focus moves to the first link, and Tab stays inside the button and the sheet.
  - Escape or choosing a page closes it, and it starts closed when the page comes back from the back/forward cache.
  - Under reduced motion it appears instantly.
- **Without JavaScript**, the footer carries the same links.
- **One source for the descriptions.** They live with the nav in `src/lib/nav.ts` (`blurb`).

**Locking the page under the menu.** Three things had to agree:

1. **`html` gets `overflow: hidden`** (`html.menu-open`).
2. **`body` clips rather than hides its sideways overflow** (`overflow-x: clip` in `base.css`, with `hidden` kept before it for older browsers). With `hidden`, locking `html` turned the body into a scroll box of its own. The page then kept scrolling under the menu, and the sticky header unpinned and slid off screen.
3. **Lenis is paused.** On mouse and trackpad devices, Lenis scrolls from script, which `overflow: hidden` cannot stop. The header dispatches `acc:scroll-lock`, and `BaseLayout.astro` stops and restarts Lenis on it. The sheet itself carries `data-lenis-prevent`.

The scroll position is restored on close.

The home hero lightens the header bar while it is in view. That rule now skips `.is-open`, so the open bar is always teal.

**Home page links (`src/components/HomeLinks.astro`).** The home page links to About and the domains, but not to Prayers, Calendar, Media or Contact. Those four now have a "More from ACC" section after the domain cards, so they can be reached from the page itself and not only through the menu.

- **The look.** Each is a paper ticket like the Rosary notice under the hero: notched ends, its own paper (seafoam, sky, peach, butter), the page name and its one-line description, and a perforated stub with an arrow.
- **Layout.** They are laid two by two, a little crooked. On phones they stack in one column.
- **Interaction.** On hover or focus a ticket lifts and straightens, and its arrow moves on.

The hero's "Join us" and "About ACC" buttons and the intro's "Our story and team" link are unchanged.

Lighthouse (mobile, production build):

| Page | Performance | TBT |
|---|---|---|
| Home | 94 | 255 ms |
| About | 97 | 169 ms |

Accessibility, Best Practices and SEO are 100 on both. The timings on the build machine were noisy at this point (the same pages measured 0 ms TBT earlier in the session).

**The menu's companion (`src/components/MenuFriend.astro`).** On wide screens the open menu's right column holds a friendly cut-paper Jesus in place of the old "Come along" notes. He stands at the foot of the column, his robe tucked behind the strip of paper along the bottom of the sheet.

- **He is drawn as layers.** The halo, hair, raised hand, robe, red mantle and face are each a cut sheet with a hard offset shadow, in the site's papers (butter halo, sheet robe, coral mantle).
- **He watches.** His eyes and head follow the pointer anywhere on the sheet. With the keyboard, he looks at the link that has focus. The layers shift by different amounts as he turns (halo least, face most), so the head reads as card turning in depth. When the pointer leaves the sheet, he looks back at you.
- **He greets.** When the menu opens, a paper slip reads "Peace be with you." (John 20:19) and he waves. He blinks now and then. Point at him and he smiles with his eyes and waves again.
- **Cost.** Nothing runs while the menu is closed. The pointer is read through one requestAnimationFrame loop that stops as soon as he settles. No scroll listeners.
- **Reduced motion.** Only the eyes follow, without easing. No head turn, wave, blink or pop-in.
- **Phones keep "Come along".** On phones (below 60rem), with no pointer to follow, the column is the short "Come along" block as before: the evening Rosary slip and the Instagram and WhatsApp pills.
- **The address is out of the menu.** The chapel's address is no longer in the menu. It is on the Contact page and in the footer.
- **Short laptops.** On screens under 800px tall, the contents list is set a little tighter so the whole sheet fits without scrolling (checked at 1024x768, 1280x720, 1366x768 and 1440x900).

**The home card, bigger and pressable (`src/scripts/hero-scene.ts`).** The pop-up card now fills its part of the hero with only a small margin. The fit margins went from 0.25 x 0.35 scene units at 94% to 0.06 x 0.14 at 100%, which makes the card about 15 to 20% larger on desktop and a little larger on phones. The hero stills were recaptured to match, so the first image and the live scene still line up.

Every part of the card answers a press:

| Press | What happens |
|---|---|
| A friend | They hop, and the hop runs down the chain both ways, smaller at each step. They also wave for a moment. |
| The dove | It flaps up, makes a small circle and settles back. |
| The sky (the back of the card) | It is pushed further open; every layer follows, as a real pop-up would, and it springs back. |
| The hills, the clouds or the grass | That layer bends back about its fold and wobbles up again. |
| The card's edge | The whole card bounces on the table. |

- **How a press is picked.** A ray from the camera goes through the pointer, and each hit is checked against the alpha of that paper's painted texture. So only real paper counts, never the empty part of a layer's rectangle, and pressing the table does nothing.
- **Hover: the friends wave.** On a mouse, a friend under the pointer lets go of one hand and waves, lifts a little, and the cursor becomes a hand, which is how people find out the card can be pressed. There is no hint text; the hero already holds four text elements.
  - **Which hand.** The friends at the ends wave their free outer hand; the middle ones let go on their outer side.
  - **How it is drawn.** The wave is a separate paper arm (sticker rim, skin, a sleeve in the colour of their top) hinged at the shoulder. While a friend waves, their backing and figure sheets swap to a second texture painted without that arm and hand, so the loose arm swings up from exactly where it held the hand, waves, and comes back down to take it again when the pointer leaves.
  - **Cost.** The second texture is painted once at start-up, in its own task, like the first.
- **Taps, not touches.** Presses fire on click, not pointerdown. A finger that lands on the card to scroll the page sets nothing off.
- **Springs.** The reactions are damped springs and short hops computed in the existing render loop: no new listeners on scroll, and nothing while the hero is off screen.
- **Reduced motion and Data Saver.** These visitors still see the still image, as before.
- **Dev-only hook.** The dev server exposes `window.__hero` (where each pressable part is on screen, and the current spring values) for the browser checks. It is stripped from the build.

## Night: the Christmas easter egg

Pressing the sun in the home card makes it set behind the hills. Night falls on the card, and the whole site turns to Christmas night, spreading as a circle from the sun. At night the sun's sheet is the star of Bethlehem, and pressing it brings the morning back. A small Night / Day pill in the footer does the same from any page. It is there for keyboard users, for anyone who sees only the still image, and for every page that has no card.

- **For this visit only.** The choice is kept in `sessionStorage` (`acc-theme`), so it carries from page to page in the tab, and the next visit starts in day. It never turns on by itself and does not follow the system's dark mode: day is the site. An inline script in `BaseLayout` sets `html[data-theme="night"]` before anything paints, so a night page never flashes day.
- **The page change.** `src/scripts/theme.ts` swaps the attribute inside a view transition, revealed as a circle growing from where it was asked for (the sun, the star, the switch). Browsers without view transitions, and anyone with reduced motion, switch at once. Anything that paints its own colours listens for the `acc:theme` event: the hero card, and both satin ribbons, which turn gold with a deep red reverse.
- **Colours, from the crib ACC builds.** Night takes its palette from photos of the real crib: a town of white plaster lit amber from inside, under a navy backdrop that turns violet in the stage light.
- **Tokens.** Night is one `:root[data-theme='night']` block in `tokens.css`.
  - The ground is navy (`#0b1124`), and sheets are a step lighter.
  - The coloured papers become dark dusk tints (blue, amber, indigo, plum) carrying light text.
  - The brand teal becomes ivory plaster (`#efdfbd`) for links, titles, the wordmark and button fills, so the filled button's text turns dark.
  - Gold stays the accent for marks.
  - Deep teal goes darker still, so the footer and the menu sit below the ground.
  - The ribbons turn gold with a violet reverse. They mix their colours from the current palette when they paint, so a change shows at once.
- **Tokens that keep a job across both themes:**
  - `--ink-strong`: titles set in deep teal by day, near-white at night.
  - `--gold`: butter as an accent on the dark surfaces, bright in both themes.
  - `--ink-on-paper`: text on the gold accent, dark in both themes.
  - `--teal-band`: the middle band of the footer's paper edge.
- **Contrast.** Every pairing used at night passes WCAG AA. The script that checks them is `contrast_night.py` in the working notes.

  | Pairing | Lowest ratio |
  |---|---|
  | Body text on any paper | 8.6 : 1 |
  | Muted text | 4.9 : 1 |
  | Teal links | 5.5 : 1 |
  | Button text | 9.8 : 1 |
- **The card at night**, in Kerala Christmas:
  - a navy to violet sky with the star of Bethlehem, stars, and big paper snowflakes stuck on it as on the stage
  - ivory and gold Kerala paper star lanterns where the clouds were
  - Bethlehem along the far ridge: white flat-roofed houses and crenellated towers, their arched windows lit, white paper palms
  - the chapel lit for midnight Mass
  - the crib, after ACC's own: a rough plaster tower with crenellations and three arched windows, a lit arch on each side, white paper palms, and the Holy Family and a sheep as white statues, their shadows large on the wall behind them
  - a stretch of the crenellated town wall, lit through its arches
  - an angel with a trumpet in place of the dove
  - snow along the ridges, candles and poinsettias in the grass
  - the friends in red caps and striped scarves
  - paper snow falling through the card
- **How it is built:**
  - Each layer has a night paper, painted only the first time night is asked for.
  - What gives light (the star, lanterns, windows, crib, candles) is painted into a separate glow sheet, used as the material's emissive map. By day that map is black, so swapping papers never recompiles a shader. The glow sheets are opaque black underneath: WebGL uploads a canvas unpremultiplied and the emissive map reads only colour, so a soft halo on a clear canvas would glow at full strength right to its edge.
  - The lamplight from the crib is a point light that is always in the scene, dark by day, so night never changes the light count.
- **The change, 2.4 seconds.**
  1. The sun slides down behind the hills as the light warms to dusk and dims (0.9 s).
  2. At the darkest point the papers swap, and the page reveal starts from the sun.
  3. The star rises, the glows come up, and the snow begins.

  The way back runs the same from the star. A change asked for while the card is off screen happens at once.
- **The still image at night.** It has its own WebP set (`hero-still-*-night.webp`), loaded lazily and shown only at night, so a day visit never fetches them.

## The home card is the Kengeri campus

The pop-up card's landscape is CHRIST University's Kengeri campus, drawn from photos of the real buildings and kept in the same cut-paper style. ACC belongs to the university, not the PU college, so the campus is drawn as a few modest blocks set into the original hills rather than one big building.

- **The far layer.** The original hills and tree line, with the campus standing on the ridge in this order from the left:
  - **The engineering block,** at the far left, clear of the friends: orange brick panels between beige piers, brown floor bands and cornice, windows with blue sills, and a rounded drum at its left end with a white canopy over the entrance.
  - **The architecture block** in the centre, after its photo: a glass box on the left, the louvred block with terracotta fins in a steel frame under a tilted floating roof on slim posts, a dark tower behind, and a white wing with a red brick band.
  - **The chapel** of St. Kuriakose Elias Chavara, with a coconut palm beside it. It has grey stone cladding, pointed windows with white trim and wooden shutters, a wooden door under a coloured fanlight, and the curved white canopy. It is the left end of the PU block, as on campus.
  - **The PU block:** white with navy bands and arched parapets, and its curved blue glass tower.
  - The blocks have room between them: an araucaria between the engineering and architecture blocks, the palm before the chapel.
- **The near layer.**
  - The campus gate on the left: the broad grey arch, CHRIST across its top, the clock on the right pillar, and iron gates.
  - The yellow tiered fountain with yellow flower beds on the right.
  - A red brick path up to the chapel, and the campus's yellow and orange flowers at the front.
- **At night: Bethlehem first, the campus in lights.**
  - Bethlehem is ACC's highlight, and it reads as one crib. It is not spread along the far ridge: a small white town of lit houses huddles right round the crib on the near layer (the crib takes the gate's place). Houses rise just behind its side houses and step out on either side, with a short stretch of town wall. The campus has the far hills to itself behind it.
  - The campus is strung with Christmas lights in every colour, after photos of the campus at Christmas. Every block has lights: LED strips in blue, pink, green, amber, violet, orange and white up every pier, post and navy band, and bulb strings along every roofline. The architecture block's fins glow warm and its glass box glows cyan. Bulbs spiral up the araucarias and rope lights wind up the palm trunk. The glass tower glows, with pink and blue strips at its edges and a star on top.
  - A tall cone tree of warm fairy lights stands on the lawn between the engineering and architecture blocks, between the friends' heads, with a crescent and star in lights beside it.
  - The far layer twinkles faintly. The windows, the chapel and the fountain glow.

## The core team, this year's roster

- **The roster is this year's** (`src/content/team.json`, 45 people): three faculty coordinators, two student
  coordinators, the heads of eleven domains and five departments. Each head carries a `group` (the domain or
  department as the roster names it); `domains` still links a head to a domain page (Choir, Dance and Theatre all
  sit under Audio & Visual). `src/lib/team.ts` returns the team in the roster's order, since the collection comes
  back sorted by id.
- **Photos** come from the team's photoshoot (one shot chosen per person, originals kept in `refs/team-photos/`),
  cropped to a 720x900 (4:5) head-and-shoulders print with the face a little above centre, so every portrait sits
  the same. Last year's headshots are kept in `refs/old-team-headshots/`.
- **Every person is a photo print** (`TeamFace`): the 4:5 photo on a white mat, laid a little crooked, straightening
  and lifting on hover (still under reduced motion). The photo itself carries the 4:5 shape so a large source image
  can't stretch the mat. Without a photo the mat holds the person's initials. The old round badges are retired.
- **About:** the coordinators share one deep-teal card, faculty and students either side of a dashed fold, all five
  prints one size (`--lp`, the largest on the page); until there's room for all five in a row (82rem) the students
  sit under the faculty. Below, a paper per domain and per department, as wide as its people: the papers wrap and
  stretch to fill each row, so every head's print keeps the same size (`--print`, 10.75rem) whether a domain has
  two heads or three. A domain with its own page links to it from the paper's corner. On a phone each paper's
  prints become one row that swipes sideways, the third print peeking in from the edge.
- The section heading and its one-line lead are stacked, not split left and right.
- **Domain pages:** the heads, as the same prints, sit in rows under their sub-team's name when there's more than one (Audio & Visual),
  with one contact line for the domain rather than one under every head.


## The fold: the About page's hidden door to the studio

The cut-paper band under the About page head (`PaperEdge`) is replaced there, and only there, by `FoldStrip.astro`: two torn
paper strips laid across the page, sky underneath, peach on top. The old band's last layer was the colour of the ground, so the
page ribbon vanished into an invisible rectangle and came out with a hard horizontal cut; the strips are just paper, so the ribbon
slips under them like under every other sheet. Home and Prayers keep their bands.

The peach strip is cut short with a small dog-ear at its end. It is also the way into the editing studio, and nothing on the page
says so: no cursor change, no label, no focus stop.

1. **Fold the strip.** Drag the dog-ear left, along the strip. The end folds over on a real crease (the perpendicular bisector
   between the corner and the hand; the part beyond it is cut from the face and drawn mirrored on top, its back showing, shaded
   from the crease). Let go past half way and it springs into a folded end and stays; short of that it springs back.
2. **Pull the ribbon three times.** While the strip is folded, the page ribbon's free end, which on this page hangs loose below
   the last card face up (`data-ribbon-end="loose"`), can be pulled. It gives like a rubber band, up to 120 px, and swings back on
   a spring. Each pull longer than 64 px counts.
3. The third pull opens `/studio/` (noindex, unlinked). Unfolding the strip resets the count.

Code: `src/scripts/fold/fold.ts` (fold geometry, both springs, the hidden grips), `src/scripts/fold/torn.ts` (the seeded torn
outline shared by the server render and the script). The page ribbon (`src/scripts/ribbon/page.ts`) publishes where its end lies
(`data-end`, `acc:ribbon-end`) and bends its last 260 px by the offset sent in `acc:ribbon-pull`; `paint.ts` gained a per-sample
`shift` and an end that settles flat. Reduced motion: the fold and the ribbon follow the hand and settle at once, no bounce.

This is a convenience, not a lock. The page's code is public, so anyone determined can find `/studio/`; the studio's real
protection is Google sign-in against the ACC account (next section).

## Live content and the studio

The site ships once, as a ZIP to the university's server, and nobody on the ACC side can touch those files again. So everything
that changes year to year moved out of the build and into the ACC Google account, with no server of our own:

- **A Google Sheet is the database.** Tabs: Team, Calendar, Services, Domains, Events, Settings, Log. Each has a header row;
  columns are found by name (several spellings each), so a hand edit in Sheets that reorders them still reads. The Sheet is shared
  "anyone with the link: viewer" and read with a browser API key (`values:batchGet`, all public tabs in one request).
- **Drive holds the photos.** *ACC Website / Events* has one folder per event, named `YYYY-MM-DD Name` (or `YYYY-MM Name`, or just
  a name, then sorted by when it was made). One query lists the folders, then their files are listed 25 parents per query, so a
  gallery of any size is a handful of requests. Photos load from Drive's sized thumbnails (`drive.google.com/thumbnail?sz=wN`, with
  `lh3.googleusercontent.com/d/ID=wN` as the fallback host); videos play in Drive's own player in an iframe, loaded only on click.
- **Built-in copy first, live content after.** Every page is still rendered from `src/content/` at build time, so it works without
  JavaScript, for search engines, and when Google can't be reached. The browser then fetches the live content (6 s timeout,
  cached in localStorage for five minutes and refreshed behind the scenes, `?fresh` skips the cache) and redraws only what
  differs: the team section compares a signature of names, roles, levels, groups, domains and photo IDs, so when the Sheet matches
  the build nothing moves. `scripts/snapshot.mjs` keeps them matching by copying the Sheet's photo IDs into `team.json` before each
  build. Media is the exception: it has no built-in copy at all (zero hardcoded events); while it loads it shows skeleton prints,
  and if Drive can't be reached, a short note and a link to the folder.
- **Shared layout code.** The About page's grouping (coordinators side by side, a paper per domain and department, the "Domain
  page" or "Part of ..." link) lives in `src/lib/team-shape.ts` and runs both at build time and in the browser, so the live roster
  is laid out exactly as the built one. Elements built in the browser copy the component's `data-astro-cid-*` attribute
  (`el()` in `src/lib/live/dom.ts`) so its scoped styles reach them.
- **Small settings bind by attribute.** `data-live-href`, `data-live-text` and `data-live-mailto` on the WhatsApp, email and
  Instagram links and the home notice; one script in the layout fills them from the Settings tab.
- **Calendar.** "Every year" rows repeat from last year to next year in the browser; the agenda and the weekly rhythm strip are
  drawn from data, from the build or from the Sheet alike.

**The studio** (`/studio/`, `src/scripts/studio/`) is a standalone page with no framework: a small element builder, one module
per concern. Google Identity Services gives a one-hour token for the signed-in account (scopes `drive` and `spreadsheets`); Google
itself enforces who may write, so the page needs no secret and no server. On first sign-in it checks the account can edit the
Sheet, then offers the one-time setup when tabs are missing: it makes them, fills them from the build's content, and copies every
team photo from the built About page into *Team photos*, cut to 4:5. Editors hold each tab as plain rows of text; a save
re-reads the tabs it's about to write and stops if anyone changed them since (choose theirs, or save over), writes each tab in one
call (blanking rows beyond the new end), and adds a line to Log with the editor's first name only, since the Sheet is public.
Unsaved rows are kept in localStorage as a draft, tied to the Sheet's state they were made against. Photos for people go through a
paste/drop/pick/Drive-link dialog with a drag-and-zoom 4:5 frame, saved as a 720 x 900 JPEG; event uploads use Drive's multipart
upload under 5 MB and a resumable session above it.

Retired with it: the static Media albums (`media-albums.ts`), `public/config.js` and `window.ACC_GALLERY_URL`, and the Apps Script
gallery (`handover/DriveGalleryAPI.gs`). The contact form keeps its own existing Apps Script.

Tested against a fake Google (Playwright routes standing in for Sheets and Drive): setup on an empty Sheet, edits, saves, the
log, a conflict, settings that don't count as changes until typed in, a new event folder and multipart and resumable uploads, the
photo dialog, then every public page picking the changes up; and against the real Sheet once ACC had run the setup. No page
overflows at 390 or 1440.


## The page loader

Deployed, pages used to arrive in pieces: fonts swapping, photos popping in, the ribbon
appearing after the text, reveals starting while photos were still decoding. Every page
now opens under a sheet of the site's paper (`src/components/Loader.astro`) that waits for
real things only: the fonts, the window's load event, the photos on the first screen
(loaded and decoded) and the ribbon's first plan. A coral thread sews along a dashed
stitch line as each one is done, so its length is honest progress.

- **Fast loads never see it.** The dove and thread fade in only after 400ms; a page
  ready before then simply fades in (cached page changes measured 150 to 320ms on the
  production build). Once the mark has shown it stays at least 500ms, so it never
  flickers, then the sheet lifts away with a soft cut edge.
- **Never stuck.** It stops waiting at 3.5s whatever happens; a CSS animation clears it
  at 6s if the script never ran; without JavaScript it is never shown; a page restored
  from the back/forward cache is uncovered at once. Reduced motion: it goes instantly.
- **The reveals wait for it** (BaseLayout listens for `acc:ready`), so the first screen's
  entrance plays as the page is uncovered rather than behind the sheet.
- The dove is a 4KB alpha mask (`src/assets/brand/acc-dove-mask.webp`) written into each
  page as a data URL, so the mark can show before any image has arrived.
- The ribbon now makes its first plan at once instead of after a 160ms settle, since the
  loader waits for it.
