# ACC Website — Design Plan (Phase 0)

No code in this phase. This is the decision record. Phase 1 starts only after this is approved.

> **Superseded, Phase 1:** the client rejected the materials palette below outright and
> directed a different one — white primarily, with black and orange (ACC's own existing
> orange, not a new one). §1 is kept as-written for the record (see
> `docs/DESIGN_NOTES.md`); the live palette is the **Addendum** at the bottom of this file.
> Everything else in this plan (type, layout concept, the three principles, the anti-default
> self-critique) still stands — only the color values changed.

---

## 1. Palette

Built from the actual sensory world of this chapel and campus — a brass oil lamp (nilavilakku) in a CMI chapel, votive glass, banana leaf, laterite soil after rain, jasmine — not from a color picker, and not from generic "church" gold.

| Token | Hex | Source material | Role |
|---|---|---|---|
| `--field-deep` | `#1B3A32` | Wet banana leaf in shadow / monsoon dusk sky over Kengeri | Dark-theme ground. A saturated teal-green, not a desaturated near-black void. |
| `--paper` | `#E3E6D7` | Raw khadi cotton, undyed | Light-theme ground (default theme). Warm but with a green-grey cast — `G` channel sits slightly above `R`, which is what keeps it out of standard-cream territory. |
| `--ink` | `#2A2620` | Old teak, wet laterite in shade | Primary text. Warm near-black, never `#000`. |
| `--accent-lamp` | `#B8862E` | Brass nilavilakku, turmeric | Primary accent. Used scarcely — CTAs, one rule per section, the single hero notice. Brassy and olive-warm, not a flat saturated orange. |
| `--accent-ember` | `#9C4A2E` | Laterite clay, wet | Secondary accent — link hover, small state changes, tags. Deeper and duller than a peachy terracotta; never used for display type. |
| `--glow` | `#F1E7C2` | Light through votive glass, jasmine | Highlight wash on dark theme (card surfaces, the one glass moment), warm off-white for text on `--field-deep`. |

Six named values, semantic names only (`--field-deep` not `--green-800`). No raw hex in components — these six live in one token file and everything else references them.

**Contrast notes to verify in Phase 1** (flagging now so it isn't discovered late): `--accent-lamp` at this lightness (~L 42%) will not clear 4.5:1 for small body text set directly on `--paper`. Plan is to never set small text in lamp-gold — it carries fills, borders, icon strokes, and large display accents (≥24px, which only needs 3:1), and any button using it as a background gets `--ink` text on top, not the reverse. Links use `--ink` with a lamp-gold underline, not lamp-gold text. Will re-check both themes with an actual contrast checker before Phase 1 sign-off, not just by eye.

Two themes: **paper is the default.** Dark (`--field-deep`) is an opt-in "evening" mode, not the site's first impression — this is a deliberate choice, see the self-critique in §6.

---

## 2. Typography

Two families, both variable, both self-hosted and subset.

**Fraunces** — display and long-form reading. Fraunces has a genuine optical-size axis (9–144) plus soft/wonk axes, so the same family can carry a huge hero line at display `opsz` and a paragraph of the Our Father at text `opsz` without ever feeling like two different faces bolted together. It has real warmth without the over-used high-contrast luxury-serif signal Playfair carries. Used for: hero line, all headings, pull quotes, scripture, and the Prayers page body (this is the one place serif-for-body is worth its extra line-height cost, because that page is meant to be read like a book).

**General Sans** (Fontshare, variable, OFL) — humanist grotesk, warm rather than clinical, picked deliberately instead of reaching for Inter. Used for: navigation, buttons, form inputs, captions, calendar/UI chrome, and body copy everywhere except the Prayers page.

Scale: base 17px, ratio 1.333 (perfect fourth), tracking tightens as size climbs instead of staying flat:

| Use | Size | Tracking |
|---|---|---|
| Micro (captions, meta) | 13px | +0.01em |
| UI / small | 15px | 0 |
| Body | 17px | 0 |
| Lead paragraph | 20px | 0 |
| Subhead (h4) | 28px | −0.005em |
| h3 | 40px | −0.01em |
| h2 | 56px | −0.015em |
| h1 | 80px (mobile clamps to ~44px) | −0.02em |
| Hero display | fluid, up to ~112px on desktop | −0.02em, `opsz` locked to display |

No all-caps anywhere in this scale, including the 13px micro size — see §6, all-caps tracked-out eyebrows are an anti-default and I'm not carving out an exception for "small labels."

Measure: 68ch cap for Fraunces body (Prayers, About), 75ch for General Sans body. Fraunces body gets 1.65 line-height minimum; General Sans body gets 1.5.

---

## 3. Layout concept

**Elevation model** (brief, since it governs the wireframes below): two surface levels only — `paper`/`field-deep` as the ground, and one raised surface type used for the hero notice and modal/lightbox chrome. The raised surface gets a warm two-pass shadow built from `--ink` (a tight near-black-warm contact shadow + a wide soft one, never a single grey blur), a 1px top highlight, and a slightly darker hairline at its own bottom edge — so it reads as a physical object (a printed notice pinned to a board) rather than a UI card. No third "glass" level except the one deliberate glass moment called out in §4.

**Home page, desktop:**

```
┌────────────────────────────────────────────────────────────────┐
│ ACC          About   Domains   Prayers   Calendar  Media Contact│  ← transparent over hero, solidifies on scroll
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│         [ full-bleed photograph — students, chapel light ]      │
│                                                                  │
│                                                                  │
│                                            ┌─────────────────┐  │
│                                            │ Rosary          │  │
│                                            │ Tonight, 7:00   │  │
│                                            │ St. Chavara     │  │
│                                            │ Chapel          │  │
│                                            │  Join us        │  │
│                                            └─────────────────┘  │
│                                            (pinned notice, not  │
│                                             a floating card)     │
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│      A short, warm welcome — two or three sentences, set        │
│      in Fraunces at text optical size, ~60ch measure,           │
│      generous top/bottom margin either side                     │
│                                                                  │
├────────────────────────────────────────────────────────────────┤
│  This week                                                      │
│  ─ Tue 9   Adoration · 6:30pm · Chapel                          │
│  ─ Thu 11  [event]                                               │
│  ─ Sun 14  Sunday Mass · 9:00 & 11:00 · Auditorium              │
│  (a short ledger of lines, date set in lamp-gold, hairline      │
│   rules between — not cards. One link to the full calendar.)    │
├────────────────────────────────────────────────────────────────┤
│  The week, as we keep it                                        │
│                                                                  │
│   MON    TUE     WED    THU      FRI    SAT      SUN            │
│    │      │       │      │        │      │        │             │
│  Mass   Rosary   Mass  Adoration Mass  Confess-  Sunday          │
│         6:00pm         6:30pm          ions      Mass            │
│                                        4–5pm                     │
│                                                                  │
│  (a horizontal ledger / horarium strip — thin vertical rules,   │
│   time-of-day marks — not seven identical icon cards)           │
├────────────────────────────────────────────────────────────────┤
│  Six domains, one community                                      │
│                                                                  │
│  Animation                the room laughing before it prays     │
│  ───────────────────────────────────────────────────────────    │
│  Liturgy                  what happens at the altar, and how    │
│  ───────────────────────────────────────────────────────────    │
│  Outreach                 [content]                              │
│  ───────────────────────────────────────────────────────────    │
│  Audio & Visual           [content]                              │
│  ───────────────────────────────────────────────────────────    │
│  Logistics & Hospitality  [content]                              │
│  ───────────────────────────────────────────────────────────    │
│  Media & Documentation    [content]                              │
│                                                                  │
│  (name large in Fraunces, one line right in General Sans,       │
│   whole row links out; hover swaps a small photo in the         │
│   margin — no icon grid, no six identical cards)                │
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│         one scripture verse, full-bleed textured panel,         │
│         set large and centered in Fraunces, translation          │
│         named below in small General Sans                       │
│                                                                  │
├────────────────────────────────────────────────────────────────┤
│  Footer — campuses, chapel dedication line, contact, social      │
└────────────────────────────────────────────────────────────────┘
```

**Mobile (360–428):** header collapses to a wordmark + menu button (no hamburger icon alone — labelled). Hero photo stays full-bleed but taller/narrower crop; the pinned notice moves to sit directly under the photo rather than overlapping it, so it's never fighting the image for legibility on a small screen. "This week" and the domains list stay single-column, which is what they already are. The horarium strip becomes a vertical ledger (day stacked above its service) instead of a horizontal scroll, since horizontal scroll strips are exactly the kind of default-feeling interaction to avoid and this page's audience is mobile-first.

---

## 4. Three options for the home page opening

**Option A — Full-bleed photograph + pinned notice (recommended).**
A real photograph of this community — chapel light, a crowd at Bereshith, students actually laughing — runs full-bleed on load. A single printed-notice-style panel sits in the lower third, bottom-right, naming the actual next service (pulled from the same data that drives Calendar), with one plain-text link. No headline copy competing with the photo. This is the option that does the most work for "warmth in three seconds" because it leads with the thing the brief says will do that job — real people — while still landing the "one obvious next step" the persona needs.

```
┌─────────────────────────────┐
│                             │
│      [ photograph ]        │
│                             │
│                  ┌────────┐│
│                  │Rosary  ││
│                  │7:00 pm ││
│                  │ Join us││
│                  └────────┘│
└─────────────────────────────┘
```

**Option B — The next thing, quietly, in type.**
No photo on the first screen at all. `--field-deep` ground, one line of Fraunces display naming the next service and when, small General Sans line under it, a single low, slow lamp-glow gradient breathing in behind the type on load (the one orchestrated motion moment). Photography arrives as the first full-bleed break immediately below. Lower risk of ever looking like stock-photo church marketing; higher risk of feeling cold on the very first screen, which cuts against the brief's own instruction that photography — not typography — is what will carry warmth here.

```
┌─────────────────────────────┐
│      (deep green field)    │
│                             │
│      Rosary tonight.       │
│      7:00, St. Chavara     │
│      Chapel.               │
│                             │
└─────────────────────────────┘
```

**Option C — Typography-only editorial hero.**
One confident, short line of display Fraunces on paper or field ground, no card, no photo, generous margin — the line break and weight contrast are the entire design event. Photography shows up right after as the section break. Most "designed" of the three in a portfolio sense, but weakest against the actual brief: it asks photography to carry the warmth, and this option defers photography past the three-second window entirely.

**Recommendation: A.** It's also the one that most naturally hosts this site's single orchestrated load animation (§3.8): photo resolves from a blur placeholder first, then the notice panel settles in a beat after — one sequence, nothing else on the page moves on its own after that.

---

## 5. Three principles specific to ACC

**1. The horarium, not the card grid.** The actual heartbeat of this community is a repeating structure of prayer — daily and Sunday Mass, Rosary, Adoration, Confession, Lenten Way of the Cross — the same shape a monastic horarium has. That rhythm becomes a recurring layout motif (the "week, as we keep it" strip on Home, echoed in Calendar and Prayers) instead of being flattened into seven identical service cards. A generic Christian-org site has "services"; this one has a keeping of time, and the layout should look like it, not like a features grid.

**2. Kerala CMI materials, Bengaluru weather.** The palette and texture vocabulary come from specific, checkable sources: a nilavilakku brass lamp (the chapel is CMI, dedicated to St. Chavara), votive glass, banana leaf, laterite after monsoon rain, jasmine. This is different from "warm church site" moodboards built from candles-in-general and stained glass — those read as any diocese, anywhere. Ours should only make sense for a chapel named for a 19th-century Kerala saint, sitting on a campus in Bengaluru during monsoon.

**3. Dialogue as a typographic signature, not a decoration.** Prayer in this tradition is call-and-response — leader and congregation. Most community sites never have to solve this typesetting problem at all. Building it properly (indentation, weight, and rule-line structure carrying the speaker distinction, no little icons) on the Prayers page, and letting the same dialogue-setting logic show up in the single scripture passage on Home, gives the site a visual signature that literally could not belong to a generic "warm community" site — it only exists because this content exists.

---

## 6. Self-critique against §3.3

Going through the anti-defaults list against what's above, honestly:

- **Dark + gold + serif as luxury shorthand.** This is the one I have to watch hardest, because the palette does contain a deep saturated field color, a brass accent, and a serif. Three concrete differences from last year's version: (1) `--field-deep` is a saturated teal-green at L≈17%, not a near-desaturated void at L≈3% — it has a name and a source, "banana leaf in shadow," not "dark mode background." (2) The gold is brassy/olive (`#B8862E`, S60 L42) not a flat saturated flame orange (last year's `#ff6f00` is S100 L50) and it's rationed to fills/borders/large type only, per the contrast note in §1 — it cannot become "gold text everywhere." (3) Most importantly, **paper is the default theme, not field-deep.** A visitor's first impression is daylight on khadi cotton, not an evening room. Dark is something you opt into. If in Phase 3 the home page ships with the dark theme as default just because it "looks more premium" in a screenshot, that's this anti-default winning and I should stop and re-read this section.
- **Cream `#F4F1EA` + terracotta `#D97757` + high-contrast serif display.** Checked directly: `--paper` is `#E3E6D7` (G channel above R — a sage-grey cast, not cream), and the closest accent, `--accent-ember` at `#9C4A2E`, is a full step darker and duller than `#D97757` and is explicitly a secondary/state color, never the display accent. The display accent is the brass, and Fraunces isn't a high-contrast serif in the Playfair sense — it's a soft, low-contrast, humanist-leaning serif by design.
- **Near-black + acid accent.** Not present — no near-black anywhere (`--ink` is L≈15% but warm, not neutral), and the accent is brass, not acid.
- **Identical rounded cards with `rgba(0,0,0,.1)` shadows everywhere.** The wireframe deliberately has zero card grids: "this week" is a ledger of lines, the horarium is a timetable strip, and domains is a linked list with hairline rules. The only raised surface on Home is the single hero notice, and its shadow recipe is warm-derived from `--ink`, two-pass, not a flat grey blur.
- **Glassmorphism everywhere.** Reserved for exactly one moment — flagged as "the one glass surface" and not yet placed; I'll decide where it earns its keep in Phase 3 rather than defaulting to it on every raised panel.
- **All-caps tracked-out labels.** None in the type scale (§2) — including the "This week" and "The week, as we keep it" section labels, which are sentence case at a normal or heading size, not small-caps eyebrows.
- **Accenting one word in a headline.** No headline in the wireframes has a colored/italic word. The hero (Option A) uses no headline at all, and Fraunces's weight/optical-size range does the "this word matters" work if it's ever needed, not color.
- **`→` on buttons/links.** Written "Join us" not "Join us →" throughout; will hold this in Phase 1 component work.
- **Meta strings joined with middle dots.** I used `·` in the "This week" wireframe rows above (`Adoration · 6:30pm · Chapel`) — flagging this now as a direct violation I need to fix before Phase 3: replace with a structured layout (date column / time / location as separate typeset fields with spacing or a hairline, not a joined string) rather than a punctuated one-liner.
- **Numbered markers on non-sequential content.** Explicitly avoided for the six domains, which are peers — no 01–06.
- **Fade-and-slide-up on every section.** §3.8 restricts motion to one orchestrated hero sequence; everything else either sits still or answers a direct action (hover swap in the domains list, notice panel opening). *[Superseded, Phase 3 addendum in `docs/DESIGN_NOTES.md`: client explicitly asked for scroll-triggered reveals across sections after reviewing both options in a design canvas — kept from re-becoming this exact anti-pattern via per-section distinct reveals, once-only firing, and full reduced-motion support. The hero's own load sequence described here is unchanged.]*
- **Stock footage of a generic church.** Hero depends entirely on real ACC photography; if that photography isn't available yet for a given moment, Option B (type-led) is the fallback rather than a stock substitute — this should go in `docs/CONTENT_NEEDED.md` if it comes up.
- **Rotating single words in a headline.** Not used anywhere in this plan.

Net: the biggest real risk in this plan is the first bullet. I'm treating "paper as default theme" as a load-bearing decision, not a footnote — it's the difference between this reading as "warm community site, evening option available" versus "dark-mode luxury site, incidentally has a light toggle."

---

## 7. Open items before Phase 1

- Confirm actual contrast ratios for `--accent-lamp` and `--accent-ember` against both `--paper` and `--field-deep` with a real checker (noted in §1) — adjust lightness if needed rather than the hue.
- Fraunces and General Sans license/self-hosting confirmed OFL — will subset to the glyphs actually used (Latin, no need for extended sets) in Phase 1.
- "This week" data source and "the week, as we keep it" horarium data are the same content module — will define the type for it in Phase 2, not duplicate it.
- The one deliberate glass-surface moment (§6) — not placed yet. Will propose a location in Phase 3 rather than force it into Phase 0.

Waiting for approval on this before starting Phase 1 (scaffold, tokens, fonts, header/footer, one fully styled page).

---

## Addendum — Palette v2 (Phase 1, client direction)

Replaces §1 entirely. Client's words: "not my color palette, white, mostly primarily, some
black and orange too." A previous version of this site already exists
(`ACC_website/`, not this repo) with real photography, real copy, and an established orange
(`#ff6f00`) — the direction here is to build *on* that existing identity, not invent a new one.

| Token | Hex | Role |
|---|---|---|
| `--paper` | `#FDFCF9` | White, warmed just enough not to glare. The dominant ground — the default theme, not an occasional accent. |
| `--ink` | `#171310` | Black, warmed just enough not to go blue. Primary text, and a real secondary *surface* (footer, the scripture panel, the "evening" theme's ground) — not confined to body copy. |
| `--accent-orange` | `#FF6F00` | ACC's own orange, carried over unchanged from the existing site. Fills, large display, buttons. |

Three named colors, not six — the client's ask was explicitly simpler than the Phase 0
materials system, and I'm not re-adding complexity it didn't ask for. Everything else is a
derived, contrast-checked mix of these three (see `src/styles/tokens.css` for the exact
ratios): a text-safe darker orange for links (raw `#FF6F00` on `--paper` is 2.72:1, well under
the 4.5:1 floor — `#BE5504` at 4.56:1 carries orange text instead), muted greys for secondary
text and hairlines, and one-step-off raised surfaces for cards.

Two themes, same three colors, literally inverted: light theme is white ground / black text /
orange accent (the default — this is "white, primarily"); dark ("evening") theme is black
ground / white text / the same orange, which already clears 7.05:1 there unmodified. No new
hues invented for dark mode.

What's unchanged from §3 of this plan: still no pure-black-flat-fill-everywhere, still
rationing the accent, still avoiding card-grid/glassmorphism defaults, still real photography
over illustration. What's changed is only which three colors those principles apply to — and
that the source of truth for photography, copy, and facts is now the existing site's own
content, not a placeholder.
