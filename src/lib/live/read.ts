/*
  Reading the live content in a visitor's browser, with the API key alone.

  One request fetches every public tab of the Sheet. The answer is kept in
  localStorage for five minutes, so moving between pages costs nothing; an
  older copy is still shown at once while a fresh one is fetched behind it.
  ?fresh in the address skips the copy (the studio's "Open the site" uses it).

  Nothing here ever throws at a page: if Google can't be reached, is slow
  (6 s), or the Sheet isn't set up yet, subscribers simply never hear back
  and the page keeps the content it was built with.
*/
import { LIVE } from './config';
import {
  PUBLIC_TABS, TABS, readTeam, readCalendar, readServices, readDomains, readEvents, readSettings,
  type TabId, type LivePerson, type LiveDate, type LiveService, type LiveDomain, type LiveEventMeta,
} from './schema';

export interface LiveData {
  at: number;
  /** each is undefined when its tab is missing or empty: keep what the page has */
  team?: LivePerson[];
  calendar?: LiveDate[];
  services?: LiveService[];
  domains?: LiveDomain[];
  events: LiveEventMeta[];
  settings: Record<string, string>;
}
type Raw = { at: number; tabs: Partial<Record<TabId, unknown[][]>> };

const KEY = 'acc-live:sheet:v1';
const TTL = 5 * 60 * 1000;
export const wantsFresh = () => typeof location !== 'undefined' && /[?&]fresh\b/.test(location.search);

export async function getJson<T>(url: string, ms = 6000, init?: RequestInit): Promise<T> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    const res = await fetch(url, { ...init, signal: ctl.signal });
    if (!res.ok) throw Object.assign(new Error(`${res.status} ${url.split('?')[0]}`), { status: res.status });
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export function store<T>(key: string, value?: T): T | null {
  try {
    if (value !== undefined) {
      localStorage.setItem(key, JSON.stringify(value));
      return value;
    }
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}

const SHEETS = `https://sheets.googleapis.com/v4/spreadsheets/${LIVE.sheetId}`;
async function fetchRaw(): Promise<Raw> {
  const get = (tabs: TabId[]) =>
    getJson<{ valueRanges: { values?: unknown[][] }[] }>(
      `${SHEETS}/values:batchGet?${tabs.map((t) => `ranges=${encodeURIComponent(TABS[t].name)}`).join('&')}` +
        `&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER&key=${LIVE.apiKey}`,
    ).then((r) => Object.fromEntries(tabs.map((t, i) => [t, r.valueRanges[i]?.values ?? []])));
  let tabs: Raw['tabs'];
  try {
    tabs = await get(PUBLIC_TABS);
  } catch (e) {
    // a tab that doesn't exist yet fails the whole request: ask for the ones that do
    if ((e as { status?: number }).status !== 400) throw e;
    const meta = await getJson<{ sheets: { properties: { title: string } }[] }>(`${SHEETS}?fields=sheets.properties.title&key=${LIVE.apiKey}`);
    const have = new Set(meta.sheets.map((s) => s.properties.title.toLowerCase()));
    const some = PUBLIC_TABS.filter((t) => have.has(TABS[t].name.toLowerCase()));
    tabs = some.length ? await get(some) : {};
  }
  return { at: Date.now(), tabs };
}

/** The domains every page knows (BaseLayout writes them into #live-domains). */
export function siteDomains(): { id: string; name: string }[] {
  try {
    return JSON.parse(document.getElementById('live-domains')?.textContent || '[]');
  } catch {
    return [];
  }
}

function shape(raw: Raw): LiveData {
  const d = siteDomains();
  const some = <T>(v: T[]) => (v.length ? v : undefined);
  return {
    at: raw.at,
    team: some(readTeam(raw.tabs.team, d)),
    calendar: some(readCalendar(raw.tabs.calendar)),
    services: some(readServices(raw.tabs.services)),
    domains: some(readDomains(raw.tabs.domains, d)),
    events: readEvents(raw.tabs.events),
    settings: readSettings(raw.tabs.settings),
  };
}

/* one fetch per page, however many parts of it are listening */
let pending: Promise<Raw | null> | null = null;
const refresh = () =>
  (pending ??= fetchRaw()
    .then((r) => store(KEY, r))
    .catch((e) => {
      console.info('Live content unavailable, showing the built-in copy.', e);
      return null;
    }));

/**
 * Calls back with the live content: at once from the stored copy if there is
 * one, then again if a fetch brings something different. Never if neither.
 */
export function onLive(cb: (d: LiveData) => void) {
  const cached = wantsFresh() ? null : store<Raw>(KEY);
  let shown = '';
  const give = (r: Raw) => {
    const sig = JSON.stringify(r.tabs);
    if (sig === shown) return;
    shown = sig;
    try {
      cb(shape(r));
    } catch (e) {
      console.warn('Live content could not be applied.', e);
    }
  };
  if (cached) queueMicrotask(() => give(cached));
  if (!cached || Date.now() - cached.at > TTL) refresh().then((r) => r && give(r));
}
