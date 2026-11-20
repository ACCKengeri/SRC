/*
  What the studio holds: each tab of the Sheet as plain rows of text, keyed
  by column, exactly as they'll be written back. Edits change these rows;
  "Save" writes the tabs that changed, after checking nobody else changed
  them in the Sheet meanwhile. Unsaved rows are kept as a draft in this
  browser, so a closed tab or a lapsed sign-in loses nothing.
*/
import { TABS, readTable, readDate, readTime, toRows, type TabId } from '../../lib/live/schema';
import { readTabs, writeTab, appendRow, tabs as listTabs, type TabInfo } from './google';

export type Row = Record<string, string>;
export const EDITED: TabId[] = ['team', 'calendar', 'services', 'domains', 'events', 'settings'];

interface Held {
  raw: unknown[][]; // the cells as last read from the Sheet
  rows: Row[]; // what the editor shows and changes
  base: string; // rows as read, to tell what changed
}
const held = new Map<TabId, Held>();
export let sheetTabs: TabInfo[] = [];
const DRAFT = 'acc-studio:draft:v1';

const cell = (tab: TabId, key: string, v: unknown): string => {
  if (tab === 'calendar' && key === 'date') return readDate(v) || (v === undefined ? '' : String(v));
  if ((tab === 'calendar' || tab === 'services') && key === 'time') return readTime(v);
  return v === undefined || v === null ? '' : typeof v === 'boolean' ? (v ? 'yes' : '') : String(v).trim();
};
function rowsOf(tab: TabId, raw: unknown[][]): Row[] {
  return readTable(raw, tab).map((r) => {
    const o: Row = {};
    for (const c of TABS[tab].cols) o[c.key] = cell(tab, c.key, r[c.key]);
    return o;
  });
}
// Rows an editor adds only to have a field to type in (a setting left blank, a
// domain with no details, an event with no notes) don't count as a change.
const blankish = (r: Row) =>
  'key' in r ? !r.value : 'contact' in r && 'hours' in r ? !r.contact && !r.hours : 'folder' in r ? !(r.title || r.description || r.cover || r.hidden || r.featured) : false;
const sig = (rows: Row[]) => JSON.stringify(rows.filter((r) => !blankish(r)).map((r) => TABS_KEYS(r)));
const TABS_KEYS = (r: Row) => Object.keys(r).sort().map((k) => [k, r[k] ?? '']);
/** Cells as Google gives them back: no trailing blanks, everything as text. */
const same = (a: unknown[][], b: unknown[][]) => {
  const n = (v: unknown[][]) => {
    const r = v.map((row) => {
      const x = row.map((c) => (c === undefined || c === null ? '' : String(c)));
      while (x.length && x[x.length - 1] === '') x.pop();
      return x;
    });
    while (r.length && !r[r.length - 1].length) r.pop();
    return JSON.stringify(r);
  };
  return n(a) === n(b);
};

/** Reads every tab the studio edits, plus the log. Missing tabs come back empty. */
export async function loadAll() {
  sheetTabs = await listTabs();
  const have = new Set(sheetTabs.map((t) => t.title.toLowerCase()));
  const names = [...EDITED, 'log' as TabId].filter((t) => have.has(TABS[t].name.toLowerCase()));
  const got = await readTabs(names.map((t) => TABS[t].name));
  for (const t of [...EDITED, 'log' as TabId]) {
    const raw = got[TABS[t].name] ?? [];
    const rows = rowsOf(t, raw);
    held.set(t, { raw, rows, base: sig(rows) });
  }
  restoreDrafts();
}

export const missingTabs = () => [...EDITED, 'log' as TabId].filter((t) => !sheetTabs.some((s) => s.title.toLowerCase() === TABS[t].name.toLowerCase()));
export const rows = (t: TabId) => held.get(t)!.rows;
export const setRows = (t: TabId, r: Row[]) => {
  held.get(t)!.rows = r;
  changed();
};
export const isDirty = (t: TabId) => !!held.get(t) && sig(held.get(t)!.rows) !== held.get(t)!.base;
export const dirtyTabs = () => EDITED.filter(isDirty);

/* ---- listeners: the save bar, and the nav's dots ---- */
const subs = new Set<() => void>();
export const onChange = (f: () => void) => subs.add(f);
let draftTimer = 0;
export function changed() {
  subs.forEach((f) => f());
  clearTimeout(draftTimer);
  draftTimer = window.setTimeout(saveDrafts, 400);
}

/* ---- drafts ---- */
function saveDrafts() {
  const d: Record<string, { base: string; rows: Row[] }> = {};
  for (const t of dirtyTabs()) d[t] = { base: held.get(t)!.base, rows: held.get(t)!.rows };
  try {
    if (Object.keys(d).length) localStorage.setItem(DRAFT, JSON.stringify(d));
    else localStorage.removeItem(DRAFT);
  } catch {}
}
export let restored: TabId[] = [];
export let stale: TabId[] = [];
function restoreDrafts() {
  restored = [];
  stale = [];
  let d: Record<string, { base: string; rows: Row[] }> = {};
  try {
    d = JSON.parse(localStorage.getItem(DRAFT) || '{}');
  } catch {}
  for (const [t, v] of Object.entries(d) as [TabId, { base: string; rows: Row[] }][]) {
    const h = held.get(t);
    if (!h) continue;
    if (v.base === h.base) {
      h.rows = v.rows;
      restored.push(t);
    } else stale.push(t); // the Sheet moved on since: the draft would undo someone's edit
  }
  if (stale.length) saveDrafts();
}
export function discard(t?: TabId) {
  for (const k of t ? [t] : EDITED) {
    const h = held.get(k);
    if (h) h.rows = JSON.parse(JSON.stringify(rowsOf(k, h.raw)));
  }
  changed();
}

/* ---- saving ---- */

/** What changed in a tab, in a few words, for the log. */
function describe(t: TabId, before: Row[], after: Row[]) {
  const a = new Set(before.map((r) => JSON.stringify(TABS_KEYS(r))));
  const b = new Set(after.map((r) => JSON.stringify(TABS_KEYS(r))));
  const gone = [...a].filter((x) => !b.has(x)).length, came = [...b].filter((x) => !a.has(x)).length;
  const parts: string[] = [];
  const edited = Math.min(gone, came);
  if (came > edited) parts.push(`${came - edited} added`);
  if (gone > edited) parts.push(`${gone - edited} removed`);
  if (edited) parts.push(`${edited} changed`);
  if (!parts.length) parts.push('reordered');
  return `${TABS[t].name}: ${parts.join(', ')}`;
}

export class Conflict extends Error {
  constructor(public tabs: TabId[]) {
    super('conflict');
  }
}

/**
 * Writes every changed tab. Unless `force`, first re-reads them and stops
 * with a Conflict if any was changed in the Sheet since it was loaded.
 */
export async function saveAll(who: string, force = false): Promise<string[]> {
  const todo = dirtyTabs();
  if (!todo.length) return [];
  const fresh = await readTabs(todo.map((t) => TABS[t].name));
  const moved = todo.filter((t) => !same(fresh[TABS[t].name] ?? [], held.get(t)!.raw));
  if (moved.length && !force) throw new Conflict(moved);
  const said: string[] = [];
  for (const t of todo) {
    const h = held.get(t)!;
    const now = fresh[TABS[t].name] ?? [];
    // rows left completely empty go; the rest are kept as the very objects the
    // open editor is bound to, so typing after a save still counts
    for (let i = h.rows.length - 1; i >= 0; i--) if (!Object.values(h.rows[i]).some((v) => v.trim() !== '')) h.rows.splice(i, 1);
    const out = toRows(t, h.rows);
    await writeTab(TABS[t].name, out, now.length);
    said.push(describe(t, rowsOf(t, h.raw), h.rows));
    h.raw = out;
    h.base = sig(h.rows);
  }
  const when = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  const stamp = `${when.getFullYear()}-${p(when.getMonth() + 1)}-${p(when.getDate())} ${p(when.getHours())}:${p(when.getMinutes())}`;
  try {
    for (const line of said) await appendRow(TABS.log.name, [stamp, who, line]);
    const log = held.get('log');
    if (log) log.rows.push(...said.map((what) => ({ when: stamp, who, what })));
  } catch {
    /* the log is a courtesy: a failed line doesn't undo a save */
  }
  changed();
  return said;
}

/** Re-reads tabs from the Sheet, throwing away unsaved rows in them (after a conflict). */
export async function reload(ts: TabId[]) {
  const got = await readTabs(ts.map((t) => TABS[t].name));
  for (const t of ts) {
    const raw = got[TABS[t].name] ?? [];
    const r = rowsOf(t, raw);
    held.set(t, { raw, rows: r, base: sig(r) });
  }
  changed();
}

export const logRows = () => held.get('log')?.rows ?? [];
