# ACC Website — Design & Build Brief for Claude Code

> **Before you paste anything:**
> Save this at the repo root as `BUILD_BRIEF.md`. In the Claude Code terminal, start with:
> `Read BUILD_BRIEF.md end to end. Do Phase 0 only — the design plan. No code yet.`
> Approve the plan before letting it build. If it drifts later, say:
> `Re-read section 3 and critique what you just built against it. Be harsh.`

---

## 1. Your role

You are the design lead on this project. There is one engineer and it is also you, but the design is the job.

The client has already seen a version of this site and found it generic. They are not asking for a functional website. They are asking for one that looks expensive, feels warm, and does not look like it was generated. **Visual quality is the primary constraint and the primary success criterion.** Everything else in this document exists to keep that from being undermined.

How we work:

- Plan before building. Phase 0 is planning only.
- One phase at a time. Stop, show me, wait.
- Screenshot your own work at every checkpoint and critique it against section 3 before I have to.
- Keep `docs/DESIGN_NOTES.md`. Record what you tried and rejected so you don't circle back to it.
- Never invent content. Missing copy goes in `docs/CONTENT_NEEDED.md` as `[NEEDS COPY: ...]`.

---

## 2. What this is and who it's for

The Association of Christian Christites is the Christian student community at CHRIST (Deemed to be University), centered on the Kengeri campus in Bengaluru, with presence at Central, Bannerghatta, Yeshwanthpur, and Delhi NCR. Roughly 4,500–5,000 students. Six domains: Animation, Liturgy, Outreach, Audio & Visual, Logistics & Hospitality, Media & Documentation. Daily and Sunday Mass, Rosary, Adoration, Confessions, Way of the Cross in Lent. Large campus events: Bereshith, Transcend, Inaugural Mass, feast celebrations. The chapel is named for St. Kuriakose Elias Chavara, which places this community in the Kerala CMI tradition.

**The person the design is for:** a first-year student, three weeks into a new city, who knows nobody and is deciding whether to walk into the chapel on Sunday. The site's job is to make that person feel there is a place for them, and to make the next step small.

Everything you design gets judged against that person, not against a committee.

---

## 3. The visual brief

The client's words: warm, comforting, rich, premium, good looking, interactive. Not strictly church.

### 3.1 What "premium" actually means here

Premium is not a style. It is a set of decisions, and most of them are about restraint and craft rather than ornament.

**Richness comes from depth, not from quantity.** Three colors used with total confidence read as more expensive than nine. One accent used four times on a page reads as more expensive than an accent used everywhere. A single large photograph reads as more expensive than a grid of six small ones.

**Space is the most reliable signal of expense.** Cheap sites are crowded. Give sections room to breathe — large vertical rhythm between sections, generous margins, few elements per screen. Let the page be longer and calmer rather than shorter and denser. If a screen has more than three things competing for attention, remove one.

**Craft at small scale is what people feel without naming.** Optical alignment rather than mathematical. Consistent radius scale rather than one radius everywhere. Shadows built from the palette's darkest ink with warmth in them, layered in two or three passes, never a single blurry grey. Hover and focus states that were actually designed. No default browser UI leaking through anywhere.

**Nothing may look like a default.** Not the select dropdown, not the scrollbar on a horizontal strip, not the focus ring, not the video player controls if you can avoid them, not the map, not the form inputs.

### 3.2 What "warm" means here

The light in this design should behave like lamp light and late afternoon sun, not like a screen.

- No pure black. No pure white. No cold neutral grey anywhere in the palette, including in shadows and borders.
- Draw the visual vocabulary from this community's actual world rather than from generic ecclesiastical signalling: brass lamp light, votive glass, jasmine and marigold, laterite and terracotta as *materials*, banana leaf green, incense in a shaft of light, monsoon dusk over Bengaluru, the particular texture of student life on a South Indian campus.
- Real photographs of these students laughing will do more for warmth than any illustration of a cross. Design around the photography.

### 3.3 Anti-defaults — any of these is a failed design

These are what generated design looks like right now. Do not ship them:

- **Dark background plus gold plus serif** as shorthand for luxury. This is the single most common way "premium" gets misread, and it is what last year's site already did (near-black `#07090e` with flame orange `#ff6f00`). We are deliberately not repeating it.
- **Cream near `#F4F1EA` with a terracotta accent near `#D97757`** and a high-contrast serif display. The other most common tell. Warm does not have to mean cream.
- Near-black background with one bright acid accent.
- Every section chopped into identical rounded cards with the same radius, the same `rgba(0,0,0,.1)` shadow, and a gradient wash behind them.
- Glassmorphism as the answer to every surface. One glass surface used with intent is fine. Nine is a template. Last year had nine.
- All-caps tracked-out labels above headings.
- Accenting one word in a headline in a different color or in italic.
- `→` appended to button and link text.
- Meta strings joined with middle dots.
- Numbered markers (01 / 02 / 03) on content that is not a sequence.
- Fade-and-slide-up on every section as it scrolls into view. Last year used AOS on everything. Drop that habit completely.
- Stock footage of a generic church. Last year's hero was exactly this.
- Rotating single words in a headline ("Growing together in Faith / Grace / Love / Purpose"). Cliché, and it moves while people read.

### 3.4 Color

Build the palette from materials, not from a color picker.

Structure it as: one deep field color with enough saturation to carry large areas and not read as grey; one paper tone that is warm without being the standard sepia cream (a faint green or grey cast keeps it from going dowdy); one accent with real chroma, used scarcely; one or two supporting tones for depth and state.

Four to six named values total. Name them semantically in the token layer — `--field-deep`, `--paper`, `--ink`, `--accent-lamp` — never `--orange-500`. Tokens are the single source of truth; no raw hex values in components.

Both light and dark themes. Dark here reads as evening in a lamplit room, not as void. Verify the accent holds contrast against both.

### 3.5 Typography

Type carries most of the personality. Two families maximum, and if two, make them clearly distinct.

- **Do not use Playfair Display.** It was last year's, and it is the default warm serif on every site of this kind.
- Audit these before deciding: Fraunces (has genuine warmth and an optical size axis), Newsreader, Gambetta, Instrument Serif, Literata, Signifier-adjacent options. For the sans, pick something humanist with warmth rather than reaching for Inter by reflex.
- Use variable fonts and the optical sizing axis where available. Display type set at display optical size is one of the cheapest ways to look expensive.
- Set a real modular scale. Tighten tracking as size increases; display type at default tracking looks amateur.
- Serif body copy gets extra line height. Keep measure under 75 characters, under 68 for serif.
- Where a heading is doing display work, the type treatment *is* the design: size, weight contrast, and where the line breaks. Not a colored word.
- Self-host and subset the fonts. No render-blocking font link, no FOUT on the hero.

### 3.6 Depth, material, texture

This is where "rich" is earned rather than claimed.

- Layered surfaces with a clear elevation model. Two or three levels, each with its own shadow recipe and its own radius.
- Shadows: multi-layer, warm-tinted, derived from the ink color. A tight contact shadow plus a wide soft one.
- Consider a very low-opacity grain or paper texture over large fields. Subtle enough that it reads as material rather than as an effect.
- Edge treatment matters: a one-pixel highlight along the top edge of a raised surface, a slightly darker hairline at the bottom. This is what makes a surface feel like an object.
- Full-bleed imagery. Let photographs run to the edge of the viewport at least once per page.

### 3.7 Photography

The site's richness will live or die on the images.

- Establish a consistent grade across all photographs: warmth, contrast, and saturation treated as design tokens applied through CSS filters or pre-processing.
- Design cards and containers that survive a badly-cropped, badly-lit student photo. Consistent aspect ratios, `object-fit: cover`, a considered focal point.
- No AI-generated imagery of people. This community has real photographs.
- Images fade in from a blur placeholder. Never pop in, never shift layout.

### 3.8 Motion

- **One orchestrated moment on the home page.** Nothing else animates unprompted. A single well-built page-load sequence lands harder than scattered scroll reveals.
- Motion that answers a user action — something opening, expanding, confirming, changing — is welcome, and should show what changed.
- Custom easing curves. `ease-in-out` is a default; write real cubic-beziers. Short durations: 180–320ms for most things, up to 600ms for a large transition.
- Honor `prefers-reduced-motion` properly, not by disabling one animation.
- No auto-advancing carousel.

### 3.9 The two-pass rule

Before writing any CSS, deliver a design plan: 4–6 named hex values, the typefaces and their roles, a layout concept with ASCII wireframes for the home page, and three principles specific to ACC. Then review it and ask: *would I have produced roughly this for any warm community site?* If yes for any part, change that part and tell me what you changed and why. Only then start coding.

Spend your boldness in one place. Pick the single element that will be memorable — most likely the home page opening — and keep everything around it disciplined. Before you call a page done, remove one thing.

---

## 4. Pages

Described by what they need to feel like and what they must contain. Structure and section order are yours to propose.

**Home.** The most important screen. Convey warmth and belonging in three seconds, then give one obvious next step. Propose two or three options for the opening in Phase 0 with wireframes — full-bleed photography of this community, a treatment built around the next thing actually happening ("Rosary tonight, 7pm, chapel"), or typography carrying it alone. Also needs: what's on this week, the seven regular services presented as a weekly rhythm rather than seven identical cards, a short warm introduction, the six domains as an entry point, and one scripture passage set well. If it rotates, it rotates on load, not on a timer.

**About.** Origin story, mission and vision, and the core team in four tiers: coordinators, student coordinators, domain heads, department heads. Portrait, name, role, links.

**Domains.** Six of them, as peers. Give each its own page and URL so a domain head can share a link to theirs. Each carries a banner, what the domain does, key contributions, its head with contact, a photo gallery, and a way to join that says what joining actually costs in hours per week.

**Prayers.** The content-richest page and the best chance for real interactivity. Common prayers, the Rosary, the Mysteries, the Litany. Prayers are dialogue between leader and congregation and must be typeset *as dialogue* — the speaker distinction carried by structure and typography, not by a small icon. Build a focused reading mode: larger type, dimmed surroundings, no chrome. For the Rosary, a decade tracker that remembers position so someone can put their phone down and come back. No audio, no auto-advance. Typeset this content as carefully as you would a book; it is why some people will visit.

**Calendar.** Feast days, ACC events, liturgy, outreach, filterable. Both a month grid and an agenda list — the agenda is what works on a phone. Use `date-fns` rather than hand-rolled month arithmetic. Every event gets an `.ics` download so it lands in a student's phone calendar. Consider a quiet liturgical-season color layer if it can be done without turning the grid into confetti.

**Media.** Event albums with a full-screen lightbox: keyboard navigation, thumbnail strip, mixed image and video, caption with position. Last year's lightbox worked; keep the behavior, raise the finish. Considered grid or masonry rather than a uniform one. This page must not ship 40MB of unoptimized JPEGs — set a weight budget and check it. See section 5 for the self-updating part.

**Contact.** Prayer request and enquiry form: name, email, message. Keep the `@christuniversity.in` rule but write the error kindly. Add a "keep this private" option and say plainly who reads these. Success is a state on the page, not a redirect to a separate file. Map loads only on interaction.

**404.** Write it properly. An empty screen is an invitation to act.

---

## 5. Deployment reality — read this, then stop thinking about it

The finished site is handed over as a **ZIP to the Christ University web team**, who host on **PHP/Apache**. There is no Node runtime, no build step on their side, no environment variables you control, no CI.

What that means:

- Build to **fully static output**. Next.js with `output: 'export'`, or Astro, or Vite. Nothing that needs a server at runtime: no server-side rendering, no API routes, no `next/image` optimization loader, no middleware.
- Optimize all bundled images at build time and commit the results.
- Use **relative paths** throughout, and confirm the build works when served from a subdirectory as well as from root. The university may not put it at `/`.
- Deliver a ZIP whose contents drop into a web root with no further steps. Include a one-page `HANDOVER.md` for their team: what the folder contains, how to replace it, and the one configuration line they may need to touch.
- Test the built output over `file://` and over a plain Apache/`php -S` server before calling any phase done.

**The self-updating gallery.** The team cannot request a redeploy for every event, so media is not baked into the build. The media page fetches album data at runtime from a Google Apps Script endpoint backed by a Google Drive folder — a new event means dropping a folder of photos into Drive, and the site picks it up. That endpoint already exists.

All you need to do:

- Read the endpoint from a single configuration file at the root of the built output — a plain `config.js` with one URL, or a `config.php` if their team prefers. One line, editable by hand after deployment, not baked into the bundle.
- Fetch on the client with a timeout and an abort controller. Show skeletons that match the final layout while it loads.
- Degrade silently to the bundled static albums if the fetch fails. The page must never look broken.
- If Apps Script CORS gives trouble on their domain, a thin `gallery.php` proxy on their server solves it and lets you cache the response. Mention it in `HANDOVER.md` as an option.
- Drive images come with their own thumbnail URLs. Use the thumbnail size for grids and the full size only in the lightbox.

Anything else that needs updating without a redeploy — upcoming events, most likely — can use the same pattern. Ask before extending it.

Everything else about content: keep it in typed TypeScript modules in the repo, validated at build time. TypeScript strict mode, no `any`. Content edits happen in the repo and produce a new ZIP.

---

## 6. Quality floor

Not a later phase. Checked at every checkpoint.

- Keyboard reachable everything, with a focus ring that is part of the design.
- Contrast 4.5:1 body and 3:1 for large text and UI boundaries, in both themes.
- Lightbox and modals: focus trap, restore focus on close, `Escape` closes, background inert.
- Real `alt` text on content images, empty on decorative.
- `prefers-reduced-motion` genuinely honored.
- Zero serious `axe` violations on every route.
- LCP under 2.0s on simulated 4G. Most of this audience is on mobile data.
- No layout shift: dimensions or aspect-ratio on every image. Video `preload="none"` with a poster.
- Mobile-first, and mean it. Test at 360 / 768 / 1280 / 1920. Nothing overflows horizontally, ever. Tap targets 44px.
- Per-route metadata and OG images. Generate the OG images, don't hand-make twenty.

---

## 7. Phases

Stop after each. Show me. Wait.

**0 — Design plan.** No code. Palette with hex values, type choices with reasoning, home page wireframes, three ACC-specific principles, your self-critique against section 3.3, and two or three proposals for the home page opening. Write it to `docs/DESIGN_PLAN.md`.

**1 — Foundation.** Scaffold, static export confirmed working from a subdirectory, token layer, self-hosted fonts, theme switching with no flash, header and footer, and one fully styled page proving the design system.

**2 — Content layer.** Types, validation, content modules populated from last year's data, image pipeline. Quick and unglamorous — don't spend design energy here.

**3 — Home.** The opening moment and everything under it. This is where the design either works or it doesn't. Screenshot and critique hard before moving on.

**4 — About and domains.**

**5 — Prayers.** Dialogue typesetting, reading mode, Rosary tracker.

**6 — Calendar.** Grid and agenda, filters, `.ics` export.

**7 — Media.** Grid, lightbox, video, and the runtime gallery fetch per section 5.

**8 — Contact and 404.**

**9 — Handover.** Accessibility pass, Lighthouse, cross-browser, metadata, OG images, ZIP build, `HANDOVER.md`, verify on a plain PHP server. Then one last design pass across every page: find the thing that is trying too hard and remove it.

---

## 8. Don't

- Don't add features I didn't ask for. Write ideas in `docs/IDEAS.md` instead.
- Don't use Lorem Ipsum.
- Don't invent team members, dates, quotes, or scripture references. Verify scripture against a real translation and name the translation.
- Don't hardcode the gallery endpoint into the bundle. It goes in the editable config file.
- Don't put anything behind a hover that a touch device can't reach.
- Don't ship an auto-advancing carousel.
- Don't let "premium" turn into dark and gold. Reread 3.1 and 3.3 if you feel it happening.
