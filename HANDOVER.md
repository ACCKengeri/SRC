# Handover: ACC Website

Two kinds of reader:

- **The university's web team**, who receive the ZIP and put it on the server. Read §1 to §3.
  There is nothing to configure: no keys, no database, no PHP, no settings file.
- **ACC**, who keep the site up to date from then on, without the web team and without a new
  ZIP. Read §4 to §7.

## 1. What's in the ZIP

Everything under `dist/` is the whole website: HTML, CSS, JavaScript and images.

```
dist/
  index.html, about/, domains/, prayers/, calendar/, media/, contact/, 404.html
  studio/            ACC's private editing page (see §4); harmless to anyone else
  _astro/            generated CSS/JS/images; filenames are auto-versioned, don't rename them
  og/                the preview images shown when a page is shared on WhatsApp and the like
  .htaccess          tells Apache to show 404.html for missing pages; keep it
  favicon.ico
```

## 2. How to put it live

Copy everything **inside** `dist/` (not the `dist` folder itself) into the web root, or a
subfolder (see §8). Point the domain at it as usual. That's all.

Two things to keep as they are, please: the pages talk to Google from the visitor's browser
(`sheets.googleapis.com`, `www.googleapis.com`, `drive.google.com`, `lh3.googleusercontent.com`,
`accounts.google.com`), so a **Content-Security-Policy** header must not block those, and a
`Referrer-Policy: no-referrer` header must not be added (the pages ask for
`strict-origin-when-cross-origin` themselves). If either is ever set, the site still works but
shows the content it was built with, and ACC's editing page stops working.

**Please tell ACC the exact address the site is served from** (for example
`https://kengeri.christuniversity.in/acc/`). They need it once, for §6.

To replace the site later: delete the old files and copy in the new ones, always the whole
folder together, since filenames inside `_astro/` change between builds.

## 3. Testing notes

- **Don't test by double-clicking `index.html`.** Pages reference their files with root
  paths (`/_astro/...`), right when served, wrong as a bare `file://`. Use any local server
  (`python -m http.server`, `php -S`, XAMPP).
- The home page's 3D card uses WebGL through one script that downloads only after a visitor
  scrolls or touches the page. With reduced motion, Data Saver, or no WebGL, a still image
  with the same text shows instead.
- Fonts (Satoshi, EB Garamond) are self-hosted in `_astro/`. Nothing loads from a font CDN.

## 4. Keeping the site up to date (ACC)

Everything that changes year to year lives in the **ACC Google account**, not in the ZIP:

| What | Where it lives | Where it shows |
| --- | --- | --- |
| Coordinators and heads, with photos | Sheet, **Team** tab; photos in Drive, *Team photos* | About, each domain page, Domains |
| Feasts and ACC events | Sheet, **Calendar** tab | Calendar |
| Mass times and the weekly rhythm | Sheet, **Services** tab | Calendar |
| Each domain's contact line and hours | Sheet, **Domains** tab | each domain page, Domains |
| Contact email, WhatsApp link, Instagram links, the home notice | Sheet, **Settings** tab | everywhere |
| Event photos and videos | Drive, *ACC Website / Events*, one folder per event | Media |
| Notes on events (title, description, cover, hidden, featured) | Sheet, **Events** tab | Media |
| Every save made from the studio | Sheet, **Log** tab | (the studio) |

A change shows on the site within five minutes. To see it at once, add `?fresh` to the
address (`.../about/?fresh`); the studio's "Open the site" button does that.

If Google can't be reached, every page still shows the content it was built with (Media
shows a short note and a link to the Drive folder instead), so the site never goes blank.

### The studio

The studio is an editing page on the site itself. It is not linked anywhere: the way in is
on the About page, and is kept among the people who run ACC. Once there, **Sign in with
Google** using the ACC account (or an account the ACC Sheet is shared with as an editor).
Anyone else who finds the page can sign in but can't change anything: Google refuses them.

| Section | What it does |
| --- | --- |
| Team | Add, edit, reorder, hide or remove people. Click a photo to paste a new one (Ctrl+V, or paste on a phone), drop one in, choose a file, or paste a Drive link; drag and zoom to frame the face. It's saved as a 720 x 900 photo in *Team photos*. "Start a new year" keeps a copy of the current team as its own tab (like *Team 2026-27*) before you change it. |
| Calendar | Add dates. Tick **Every year** for a feast that never moves (Christmas); it then shows every year by itself. Feasts that move with Easter need their date entered each year; the studio reminds you which are missing for next year. |
| Events | Make a new event folder (named correctly for you), add photos and videos (large videos are fine), choose the cover, write a description, hide an event, or make it lead the Media page. Warns about a folder with no date, an empty folder, or one with only videos. |
| Mass times | The weekly rhythm, in order. |
| Settings | Contact email, WhatsApp, Instagram links, the home notice (on or off, its text and link), each domain's contact line and hours. |
| Log | Every save, newest first. |

Nothing is saved until you press **Save to the site**. Unsaved changes are kept in that
browser if the tab is closed or the sign-in runs out (Google keeps it an hour). If someone
else changed the same tab in the Sheet meanwhile, the studio says so and asks whose version
to keep.

### Events without the studio

Making an event needs only Google Drive: inside *ACC Website / Events*, make a folder named
`2026-12-20 Carol Night` (the date first, then the name; `2026-12 Carol Night` works too)
and put its photos and videos in it. That's the whole job. A file called `cover.jpg` (or
anything starting with "cover") becomes the cover; otherwise the first photo does. A Google
Doc called `About` in the folder becomes the event's description. iPhone photos (HEIC) are
fine: Google converts them.

### The Sheet, by hand

The Sheet can be edited directly in Google Sheets as well: the site reads it the same way.
Keep the first row of each tab (the column names) as it is. **File, Version history** in
Google Sheets brings back any earlier state of everything, studio saves included.

## 5. Keep in mind

- **The Sheet and the ACC Website folder are public to anyone with their link**, and their
  IDs are inside the site's code (that's how the site reads them). Never put phone numbers,
  private photos, prayer requests or anything personal in them. The Log names who saved by
  first name only, for the same reason.
- **Both must stay owned by the ACC account**, never a student's personal account, which
  would take them along when the student leaves.
- **Very popular videos:** Drive's player can refuse to play a video watched by a great many
  people at once. For a big one, a YouTube link in the event's description is safer.
- Domains themselves are fixed: a brand new domain needs its own page, which means a new ZIP.
  Everything about the existing six is editable.

## 6. The Google side (done once; redo only if something here changes)

The site uses one Google Cloud project, owned by the ACC account, with the Google Drive API
and Google Sheets API turned on, and two credentials in it:

1. **An API key** (the site uses it to read). Under *APIs & Services, Credentials*, it is
   restricted to the two APIs and to the site's addresses (*Website restrictions*).
2. **An OAuth client ID** of type *Web application* (the studio uses it to sign in). Its
   *Authorized JavaScript origins* are the site's addresses.

**When the site goes live, add its address to both:** `https://the-real-address/*` to the
key's website restrictions, and `https://the-real-address` (no path) to the client's
authorized origins. Until then the live site shows its built-in content and the studio
can't sign in. `http://localhost:4321` is already on both, for working on the project.

The OAuth consent screen stays in **Testing** mode with the ACC account listed as a test
user. Anyone else who should use the studio must be added as a test user there too, and be
given edit access to the Sheet and the ACC Website folder.

None of these values is a secret (a browser key is public by design; the website
restriction is what protects it). They live in `src/lib/live/config.ts` in the project. The
Sheet and folder IDs can also be changed later in the Settings tab (*Events folder*, *Team
photos folder*), with no new ZIP.

## 7. Each new academic year (ACC)

1. Studio, **Team**: "Start a new year", then change the roster: new names, roles, photos.
   Hide anyone who should stay off the site for now rather than deleting them.
2. Studio, **Calendar**: enter next year's moving feasts (Easter, Good Friday, Pentecost,
   Corpus Christi) and the year's ACC events.
3. Studio, **Settings**: check the contact email, WhatsApp link and each domain's contact
   line.
4. If the people running ACC change: share the Sheet and the ACC Website folder with the
   new ones (as editors), add them as test users on the consent screen (§6), and tell them
   the way into the studio.

## 8. If the site moves to a subdirectory instead of the domain root

This build assumes the domain root. For a subfolder (`https://yoursite.edu/acc/`) the
project's `base: '/'` in `astro.config.mjs` becomes `base: '/acc/'`, and the
`ErrorDocument 404 /404.html` line in `public/.htaccess` gets the same prefix; then a new
ZIP. Both are commented in the source pointing at each other.

## 9. If you maintain the source project

- `npm run build` does everything: `scripts/snapshot.mjs` first copies the live Team tab's
  photo IDs into `src/content/team.json` (so the built pages match the Sheet and nothing
  redraws; it skips quietly if Google can't be reached), then the social-preview images in
  `og/`, the build, and `scripts/postbuild.mjs` (media query normalisation for older iOS
  Safari, and removal of unused original photos).
- The content in `src/content/` is now the **built-in copy**: what a page shows before the
  live content arrives, and what it keeps if Google can't be reached. The studio's one-time
  setup filled the Sheet from it. Editing those files changes only that copy; the live
  site follows the Sheet.
- The live content code is in `src/lib/live/` (reading) and `src/scripts/studio/` (the
  studio). `docs/DESIGN_NOTES.md`, "Live content and the studio", explains how it fits.
- The hero stills (`src/assets/hero/hero-still-*.webp`) are captures of the real 3D scene,
  made with the dev-only `/?hero-poster` flag at 1440x900 (plus a 960x600 resize) and
  390x844 at 1.5x, transparent, then encoded as WebP (quality 72, alpha quality 70). The
  night versions use `/?hero-poster&night`.
- The paper grain (`src/assets/paper/grain.webp`) comes from `scripts/make-paper-grain.py`.
- `redesign-canvas/` and `refs/` are design references; neither ships in the ZIP.
