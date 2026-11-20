/*
  Before a build: notes in src/content/team.json which Drive photo each
  person has in the live Sheet (as `photoId`), so the built pages carry the
  same roster the Sheet does and the browser has nothing to redraw.

  Only `photoId` is ever written; names, roles and everything else in
  team.json stay as they are. If the Sheet can't be reached (offline, not
  set up yet), it says so and leaves the file alone: the build goes on.

  Run by `npm run build`, or alone with `node scripts/snapshot.mjs`.
*/
import { readFile, writeFile } from 'node:fs/promises';

const FILE = new URL('../src/content/team.json', import.meta.url);
const config = await readFile(new URL('../src/lib/live/config.ts', import.meta.url), 'utf8');
const pick = (k) => config.match(new RegExp(`${k}: '([^']+)'`))?.[1];
const key = pick('apiKey'), sheet = pick('sheetId');

const idOf = (v) => {
  const s = String(v ?? '').trim();
  const m = /\/(?:d|folders)\/([\w-]{20,})/.exec(s) || /[?&]id=([\w-]{20,})/.exec(s);
  return m ? m[1] : /^[\w-]{20,}$/.test(s) ? s : '';
};
const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

try {
  const ctl = new AbortController();
  setTimeout(() => ctl.abort(), 10000);
  // the key answers this site only; any of its addresses will do as the Referer
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheet}/values/Team?key=${key}`, {
    headers: { Referer: 'http://localhost:4321/' },
    signal: ctl.signal,
  });
  if (!res.ok) throw new Error(res.status === 400 ? 'the Sheet has no Team tab yet' : `Google said ${res.status}`);
  const rows = (await res.json()).values ?? [];
  const head = (rows[0] ?? []).map(norm);
  const col = (...names) => head.findIndex((h) => names.includes(h));
  const ni = col('name'), pi = col('photo', 'photo id', 'picture', 'image');
  if (ni < 0 || pi < 0) throw new Error('the Team tab has no Name or Photo column');
  const live = new Map(rows.slice(1).filter((r) => r[ni]).map((r) => [norm(r[ni]), idOf(r[pi])]));

  const team = JSON.parse(await readFile(FILE, 'utf8'));
  let changed = 0;
  const unmatched = [];
  for (const p of team) {
    if (!live.has(norm(p.name))) {
      unmatched.push(p.name);
      continue;
    }
    const id = live.get(norm(p.name)) || undefined;
    if (p.photoId !== id) {
      if (id) p.photoId = id;
      else delete p.photoId;
      changed++;
    }
  }
  if (changed) await writeFile(FILE, JSON.stringify(team, null, 2) + '\n');
  console.log(`snapshot: ${changed ? `${changed} photo IDs updated` : 'team.json already matches the Sheet'}.`);
  if (unmatched.length) console.log(`snapshot: not in the Sheet's Team tab (the live site won't show them): ${unmatched.join(', ')}`);
} catch (e) {
  console.log(`snapshot: skipped, ${e.name === 'AbortError' ? 'Google took too long' : e.message}. team.json is unchanged.`);
}
