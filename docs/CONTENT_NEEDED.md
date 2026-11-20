# Content Needed

Nothing has been invented to fill these gaps. Each entry names exactly what's missing and which
page needs it. Items resolved by reusing the existing site (`ACC_website/`, a separate folder,
not this repo) are marked and removed from the active list — see `docs/DESIGN_NOTES.md` for
where each one came from.

## Still needed

> **Live content (November 2026):** most of what's below can now be filled in by ACC
> themselves, after the site is live, from the studio or the Google Sheet (see `HANDOVER.md`
> §4). Each entry says where. The built-in copy in `src/content/` only matters until then.

> **Phase 12:** the on-page `[NEEDS …]` tags now render only in `astro dev` (or a build with
> `PUBLIC_SHOW_NEEDS=true`), never on the live site. Where a gap exists, production simply
> leaves that line out. This list is the single source of what's still owed. The Calendar
> now also carries a dev-only tag for the 2026 ACC event dates.

- ~~Core team roster~~ — replaced with this year's roster (45 people) and new photos from the team's photoshoot. Still to come: photos for Joseph John (Liturgy), Diya Wilson (Psychology) and Rebecca Joan Sebastian (Architecture), who show initials until then; and confirm "Ann H" in the photo folder is Ann Maria Aby (Dance).
- `[NEEDS COPY: direct contact per domain head]`: Domains (one line per domain page). **Now editable:** studio, Settings, Domains, "How to reach the heads" (the Sheet's Domains tab). Until it's filled, production leaves the line out.
- `[NEEDS COPY: hours per week for each domain]`: Domains (x6). **Now editable:** studio, Settings, Domains, "Hours a week".
- `[NEEDS CONFIG: who actually reads prayer requests submitted through the Contact form]` — Contact. Visible on the live page now (`src/pages/contact/index.astro`, next to the "Keep this private" checkbox), not just noted here.
- `[NEEDS DATA: dates for named ACC events (Bereshith, Transcend, the Inaugural Mass, Liturgy and Outreach activities)]`: Calendar. **Now editable:** studio, Calendar, "Add a date", kind "ACC event", "Liturgy" or "Outreach". The moving feasts (Easter, Good Friday, Pentecost, Corpus Christi) also need their dates for each new year; the studio lists which are missing.
- ~~Whether the site keeps an admin panel~~: **resolved.** The studio (`/studio/`, reached by a hidden gesture on About, locked by Google sign-in) edits the team, calendar, Mass times, settings and events, with the ACC Google Sheet and Drive as the store. See `docs/DESIGN_NOTES.md`, "Live content and the studio".
- `[NEEDS COPY: ACC founding story / year]` — About. The Phase 11 redesign's About page opens with a "how we began" section (the real `knowUs` paragraphs), but `knowUs` is general description, not a founding narrative — there's no founding year or founder attribution in ACC's content. Visible as an on-page `[NEEDS COPY]` tag at the end of that section.
- `[NEEDS CONFIG: a real Instagram feed source for the home page]`: the home Instagram section shows a fixed grid of real ACC event photos from the repo, standing in for the six latest `@acc_kengeri` posts; the links themselves are live (studio, Settings, Instagram). A real feed would need a long-lived Instagram Graph API token and a build step to pull the latest posts. Not set up.
- ~~A deployed Apps Script gallery endpoint~~: **replaced.** Media now reads the ACC Drive's Events folder directly (one folder per event); no script and no `config.js`. What's needed instead is the events themselves: folders named like `2026-12-20 Carol Night` with their photos, in *ACC Website / Events*. The folder is empty today, so Media shows "No events yet."
- `[NEEDS CONFIG: the live site's address added to the Google key and sign-in client]`: until the address the university serves the site from is added (`HANDOVER.md` §6), the live site shows its built-in copy and the studio can't sign in.

## Resolved by reusing the existing site

- ~~This week / weekly rhythm data~~ — using the real "Service Timings" from `ACC_website/index.html` (Daily Mass, Rosary, Adoration, Confessions, Monthly Mass, Sunday Mass, Way of the Cross).
- ~~Home introduction paragraph~~ — using the real About blurb from `ACC_website/index.html`.
- ~~Scripture passage + translation~~ — Matthew 23:11, verified against ESV wording (also used, unattributed, on the old site).
- ~~Domain one-line taglines~~ — using the real `subtitle` field from `ACC_website/domains_extracted.json`.
- ~~Home hero photography~~ — using `ACC_website/Images/Chapel_photo_43.png`, the real chapel photo already used as the old Calendar page's banner.
- ~~Campus social links, WhatsApp group, map address~~ — from `ACC_website/index.html` footer, now in `Footer.astro`.
- ~~Domain head assignments and galleries~~ — `ACC_website/js/dynamic_loader.js` had a `domainHeadMap` and per-domain gallery image lists that weren't visible in the extracted domains JSON. Now in `src/content/team.json` (`domains` field per person) and `src/lib/domain-images.ts` (`getDomainGallery()`), backed by the real gallery photos in `src/assets/images/domains/gallery/`.
- ~~Liturgical feast days for the Calendar~~ — a full real 2026 feast calendar (32 days) existed as seed data in the same file. Now `src/content/feasts.json`, typed and validated, ready for Phase 6 — not rendered anywhere yet.
- ~~About page origin story, mission, vision, and the founders' quote~~ — from `ACC_website/about.html`'s "Know Us" and "Mission & Vision" sections. Now `src/lib/about-content.ts`, rendered on `/about/`.
