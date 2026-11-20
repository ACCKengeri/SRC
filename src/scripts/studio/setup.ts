/*
  The one-time setup: makes the Sheet's tabs and fills them with what the
  site shows today, so nothing has to be typed in again. Team photos are
  taken from the About page as built, cut to 4:5, and put in the Team photos
  folder in Drive. Tabs that already exist are left exactly as they are.
*/
import { TABS, SETTINGS, toRows, slug, type TabId } from '../../lib/live/schema';
import { LIVE, folderUrl } from '../../lib/live/config';
import { addTabs, writeTab, removeTab, readTabs, upload, appendRow } from './google';
import { framedFromUrl } from './crop';
import type { Row } from './store';

export interface Seed {
  team: Row[]; // name, role, tier (label), group, domain
  calendar: Row[];
  services: Row[];
  domains: Row[];
}

/** Each person's largest photo on the built About page, by name. */
async function aboutPhotos(base: string): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  try {
    const html = await (await fetch(`${base}about/`)).text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    for (const f of Array.from(doc.querySelectorAll('.face'))) {
      const name = f.querySelector('.face__name')?.textContent?.trim();
      const img = f.querySelector('img');
      if (!name || !img) continue;
      const best = (img.getAttribute('srcset') || '')
        .split(',')
        .map((s) => s.trim().split(/\s+/))
        .filter((p) => p[0])
        .sort((a, b) => parseInt(b[1] || '0') - parseInt(a[1] || '0'))[0]?.[0];
      const url = best || img.getAttribute('src');
      if (url) out.set(name, new URL(url, location.href).href);
    }
  } catch {
    /* no photos: the people still go in, and photos can be added one by one */
  }
  return out;
}

export async function runSetup(
  seed: Seed,
  missing: TabId[],
  sheetTabs: { id: number; title: string }[],
  base: string,
  who: string,
  say: (line: string) => void,
) {
  if (!missing.length) return;
  say(`Making ${missing.length === 1 ? 'the tab' : `${missing.length} tabs`}: ${missing.map((t) => TABS[t].name).join(', ')}.`);
  await addTabs(missing.map((t) => TABS[t].name));

  const rowsFor: Partial<Record<TabId, Row[]>> = {
    calendar: seed.calendar,
    services: seed.services,
    domains: seed.domains,
    events: [],
    log: [],
    settings: SETTINGS.map((s) => ({
      key: s.key,
      value: s.key === 'events_folder' ? folderUrl(LIVE.eventsFolder) : s.key === 'team_folder' ? folderUrl(LIVE.teamFolder) : s.fallback,
      about: s.about || s.label,
    })),
  };

  if (missing.includes('team')) {
    say('Finding the team photos on the About page…');
    const photos = await aboutPhotos(base);
    const team: Row[] = [];
    let i = 0, done = 0;
    for (const p of seed.team) {
      i++;
      const url = photos.get(p.name);
      let photo = '';
      if (url) {
        try {
          say(`Putting photos in Drive: ${i} of ${seed.team.length} (${p.name})`);
          const f = await upload(await framedFromUrl(url), `${slug(p.name)}.jpg`, LIVE.teamFolder);
          photo = f.id;
          done++;
        } catch (e) {
          say(`${p.name}'s photo couldn't be copied (${(e as Error).message}); add it later from Team.`);
        }
      }
      team.push({ ...p, photo, show: 'yes' });
    }
    say(`${done} photos are in the Team photos folder.`);
    rowsFor.team = team;
  }

  for (const t of missing) {
    say(`Filling ${TABS[t].name}…`);
    await writeTab(TABS[t].name, toRows(t, rowsFor[t] ?? []), 0);
  }

  // Google makes a new Sheet with an empty "Sheet1": take it away once there are real tabs.
  const spare = sheetTabs.find((t) => /^sheet1$/i.test(t.title));
  if (spare) {
    try {
      const got = await readTabs([spare.title]);
      if (!(got[spare.title] ?? []).length) await removeTab(spare.id);
    } catch {}
  }
  try {
    const now = new Date();
    await appendRow(TABS.log.name, [now.toISOString().slice(0, 16).replace('T', ' '), who, `Set up: ${missing.map((t) => TABS[t].name).join(', ')}`]);
  } catch {}
  say('Done. Everything the site shows is in the Sheet now.');
}
