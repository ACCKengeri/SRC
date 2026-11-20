/*
  The live content's shape: the Sheet's tabs and columns, and how a tab's rows
  become the site's data (and back, for the studio).

  Every tab has a header row. Columns are found by their header, not their
  position, so someone editing the Sheet by hand can reorder them, and a few
  spellings are accepted for each. Empty rows are skipped. Anything that
  can't be read is left out rather than guessed at.
*/

export type Tier = 'coordinators' | 'student_coordinators' | 'domain_heads' | 'department_heads';
export type Category = 'feast' | 'event' | 'liturgy' | 'outreach';

export interface LivePerson {
  name: string;
  role: string;
  tier: Tier;
  group?: string;
  domain?: string;
  photo?: string; // Drive file ID
  hidden?: boolean;
}
export interface LiveDate {
  date: string; // YYYY-MM-DD
  time: string;
  title: string;
  description: string;
  category: Category;
  yearly: boolean;
}
export interface LiveService {
  when: string;
  what: string;
  time: string;
  where: string;
  note: string;
}
export interface LiveDomain {
  domain: string;
  contact: string;
  hours: string;
}
export interface LiveEventMeta {
  folder: string;
  title: string;
  description: string;
  cover: string; // Drive file ID
  hidden: boolean;
  featured: boolean;
}
export interface LiveLog {
  when: string;
  who: string;
  what: string;
}

/* ---------------- tabs and columns ---------------- */

interface Col {
  key: string;
  header: string;
  also?: string[];
}
export const TABS = {
  team: {
    name: 'Team',
    cols: [
      { key: 'name', header: 'Name' },
      { key: 'role', header: 'Role' },
      { key: 'tier', header: 'Tier', also: ['level', 'type'] },
      { key: 'group', header: 'Group', also: ['domain or department', 'department'] },
      { key: 'domain', header: 'Domain page', also: ['domain', 'page'] },
      { key: 'photo', header: 'Photo', also: ['photo id', 'picture', 'image'] },
      { key: 'show', header: 'Show', also: ['visible', 'shown'] },
    ],
  },
  calendar: {
    name: 'Calendar',
    cols: [
      { key: 'date', header: 'Date' },
      { key: 'time', header: 'Time' },
      { key: 'title', header: 'Title', also: ['event', 'name'] },
      { key: 'description', header: 'Description', also: ['details', 'about'] },
      { key: 'category', header: 'Category', also: ['kind', 'type'] },
      { key: 'yearly', header: 'Every year', also: ['yearly', 'repeats yearly', 'repeat'] },
    ],
  },
  services: {
    name: 'Services',
    cols: [
      { key: 'when', header: 'When', also: ['how often', 'frequency'] },
      { key: 'what', header: 'What', also: ['service', 'name'] },
      { key: 'time', header: 'Time' },
      { key: 'where', header: 'Where', also: ['place', 'venue'] },
      { key: 'note', header: 'Note', also: ['notes'] },
    ],
  },
  domains: {
    name: 'Domains',
    cols: [
      { key: 'domain', header: 'Domain' },
      { key: 'contact', header: 'Heads contact', also: ['contact', 'contact line'] },
      { key: 'hours', header: 'Hours a week', also: ['hours', 'hours per week'] },
    ],
  },
  events: {
    name: 'Events',
    cols: [
      { key: 'folder', header: 'Folder', also: ['folder id'] },
      { key: 'title', header: 'Title' },
      { key: 'description', header: 'Description', also: ['about'] },
      { key: 'cover', header: 'Cover', also: ['cover photo'] },
      { key: 'hidden', header: 'Hidden', also: ['hide'] },
      { key: 'featured', header: 'Featured', also: ['lead', 'on home page', 'feature'] },
    ],
  },
  settings: {
    name: 'Settings',
    cols: [
      { key: 'key', header: 'Key' },
      { key: 'value', header: 'Value' },
      { key: 'about', header: 'What it is', also: ['about', 'description'] },
    ],
  },
  log: {
    name: 'Log',
    cols: [
      { key: 'when', header: 'When' },
      { key: 'who', header: 'Who' },
      { key: 'what', header: 'What' },
    ],
  },
} satisfies Record<string, { name: string; cols: Col[] }>;
export type TabId = keyof typeof TABS;
/** The tabs the public site reads (the log is the studio's alone). */
export const PUBLIC_TABS: TabId[] = ['team', 'calendar', 'services', 'domains', 'events', 'settings'];

/* ---------------- settings ---------------- */

export const SETTINGS: { key: string; label: string; about: string; fallback: string }[] = [
  { key: 'email', label: 'Contact email', about: 'Shown in the footer and on the Contact page.', fallback: 'acc.kengeri@christuniversity.in' },
  { key: 'whatsapp', label: 'WhatsApp group link', about: 'The "Join us" and WhatsApp links across the site.', fallback: 'https://chat.whatsapp.com/KoTpbOt0HZB8Uq0PbNUqrj' },
  { key: 'notice_show', label: 'Show the home notice', about: 'yes or no: the ticket under the home page card.', fallback: 'yes' },
  { key: 'notice_title', label: 'Home notice: what', about: 'The bold first line of the ticket.', fallback: 'Rosary, every evening' },
  { key: 'notice_when', label: 'Home notice: when and where', about: 'The line beside it.', fallback: '7:00 pm, St. Kuriakose Elias Chapel' },
  { key: 'notice_link_label', label: 'Home notice: link text', about: 'The link at the end of the ticket.', fallback: 'Pray along' },
  { key: 'notice_link', label: 'Home notice: link', about: 'A page on this site (like /prayers/#rosary) or a full web address.', fallback: '/prayers/#rosary' },
  { key: 'instagram_kengeri', label: 'Instagram: Kengeri', about: '', fallback: 'https://www.instagram.com/acc_kengeri/' },
  { key: 'instagram_central', label: 'Instagram: Central', about: '', fallback: 'https://www.instagram.com/acc_christ/' },
  { key: 'instagram_bannerghatta', label: 'Instagram: Bannerghatta', about: '', fallback: 'https://www.instagram.com/acc_bgr/' },
  { key: 'instagram_yeshwanthpur', label: 'Instagram: Yeshwanthpur', about: '', fallback: 'https://www.instagram.com/acc_byc/' },
  { key: 'instagram_delhi-ncr', label: 'Instagram: Delhi NCR', about: '', fallback: 'https://www.instagram.com/acc_christ_ncr/' },
  { key: 'events_folder', label: 'Events folder', about: 'The Drive folder whose folders are the events. A folder link or ID.', fallback: '' },
  { key: 'team_folder', label: 'Team photos folder', about: 'Where the studio saves team photos. A folder link or ID.', fallback: '' },
];

/* ---------------- reading cells ---------------- */

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const pad = (n: number) => String(n).padStart(2, '0');

/** A Sheets serial date (days since 1899-12-30) as YYYY-MM-DD. */
function serialDate(n: number) {
  const d = new Date(Date.UTC(1899, 11, 30) + Math.round(n * 86400000));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
/** A Sheets time (a fraction of a day) as "7:30 pm". */
function serialTime(n: number) {
  const mins = Math.round((n % 1) * 1440);
  const h = Math.floor(mins / 60), m = mins % 60;
  return `${h % 12 || 12}:${pad(m)} ${h < 12 ? 'am' : 'pm'}`;
}
const text = (v: unknown) => (v === undefined || v === null ? '' : String(v).trim());
const yes = (v: unknown) => v === true || /^(y|yes|true|1|show|shown|on)$/i.test(text(v));
const no = (v: unknown) => v === false || /^(n|no|false|0|hide|hidden|off)$/i.test(text(v));

/** YYYY-MM-DD from a typed date, a serial number, or "20/12/2026"-style text. */
export function readDate(v: unknown): string {
  if (typeof v === 'number' && v > 20000) return serialDate(v);
  const s = text(v);
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s);
  if (m) return `${m[3]}-${pad(+m[2])}-${pad(+m[1])}`; // day first, as written in India
  return '';
}
export function readTime(v: unknown): string {
  if (typeof v === 'number' && v < 1) return serialTime(v);
  return text(v);
}

/** A Drive file or folder ID from an ID, a share link, or an "open?id=" link. */
export function driveId(v: unknown): string {
  const s = text(v);
  const m = /\/(?:d|folders)\/([\w-]{20,})/.exec(s) || /[?&]id=([\w-]{20,})/.exec(s);
  if (m) return m[1];
  return /^[\w-]{20,}$/.test(s) ? s : '';
}

/** Rows of a tab as objects keyed by column key. */
export function readTable(values: unknown[][] | undefined, tab: TabId): Record<string, unknown>[] {
  if (!values || values.length < 2) return [];
  const cols = TABS[tab].cols as Col[];
  const head = values[0].map((h) => norm(text(h)));
  const at: Record<string, number> = {};
  for (const c of cols) {
    const names = [c.header, ...(c.also ?? [])].map(norm);
    const i = head.findIndex((h) => names.includes(h));
    if (i >= 0) at[c.key] = i;
  }
  const out: Record<string, unknown>[] = [];
  for (const row of values.slice(1)) {
    if (!row || row.every((v) => text(v) === '')) continue;
    const o: Record<string, unknown> = {};
    for (const k in at) o[k] = row[at[k]];
    out.push(o);
  }
  return out;
}

/* ---------------- typed tabs ---------------- */

const TIERS: [Tier, string, RegExp][] = [
  ['coordinators', 'Faculty coordinator', /faculty|^coordinators?$/],
  ['student_coordinators', 'Student coordinator', /student/],
  ['domain_heads', 'Domain head', /domain/],
  ['department_heads', 'Department head', /department|dept/],
];
export const tierLabel = (t: Tier) => TIERS.find((x) => x[0] === t)![1];
export const tierOptions = TIERS.map(([value, label]) => ({ value, label }));
export function readTier(v: unknown): Tier | null {
  const s = norm(text(v)).replace(/_/g, ' ');
  for (const [id, , re] of TIERS) if (s === id.replace('_', ' ') || re.test(s)) return id;
  return null;
}
const CATS: Category[] = ['feast', 'event', 'liturgy', 'outreach'];
function readCategory(v: unknown): Category {
  const s = norm(text(v));
  return CATS.find((c) => s.startsWith(c)) ?? 'event';
}

/** domains: [{ id, name }], so a domain can be written by its name or its ID. */
export function readTeam(values: unknown[][] | undefined, domains: { id: string; name: string }[]): LivePerson[] {
  const byName = new Map(domains.flatMap((d) => [[norm(d.id), d.id], [norm(d.name), d.id]]));
  const out: LivePerson[] = [];
  for (const r of readTable(values, 'team')) {
    const name = text(r.name), tier = readTier(r.tier);
    if (!name || !tier) continue;
    const group = text(r.group);
    const domain = byName.get(norm(text(r.domain)));
    out.push({
      name,
      role: text(r.role) || (group ? `${group} Head` : tierLabel(tier)),
      tier,
      group: group || undefined,
      domain: domain || undefined,
      photo: driveId(r.photo) || undefined,
      hidden: no(r.show) || undefined,
    });
  }
  return out;
}
export function readCalendar(values: unknown[][] | undefined): LiveDate[] {
  const out: LiveDate[] = [];
  for (const r of readTable(values, 'calendar')) {
    const date = readDate(r.date), title = text(r.title);
    if (!date || !title) continue;
    out.push({ date, title, time: readTime(r.time) || 'All Day', description: text(r.description), category: readCategory(r.category), yearly: yes(r.yearly) });
  }
  return out;
}
export function readServices(values: unknown[][] | undefined): LiveService[] {
  return readTable(values, 'services')
    .map((r) => ({ when: text(r.when), what: text(r.what), time: readTime(r.time), where: text(r.where), note: text(r.note) }))
    .filter((s) => s.what);
}
export function readDomains(values: unknown[][] | undefined, domains: { id: string; name: string }[]): LiveDomain[] {
  const byName = new Map(domains.flatMap((d) => [[norm(d.id), d.id], [norm(d.name), d.id]]));
  const out: LiveDomain[] = [];
  for (const r of readTable(values, 'domains')) {
    const domain = byName.get(norm(text(r.domain)));
    if (domain) out.push({ domain, contact: text(r.contact), hours: text(r.hours) });
  }
  return out;
}
export function readEvents(values: unknown[][] | undefined): LiveEventMeta[] {
  const out: LiveEventMeta[] = [];
  for (const r of readTable(values, 'events')) {
    const folder = driveId(r.folder);
    if (folder)
      out.push({ folder, title: text(r.title), description: text(r.description), cover: driveId(r.cover), hidden: yes(r.hidden), featured: yes(r.featured) });
  }
  return out;
}
export function readSettings(values: unknown[][] | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const r of readTable(values, 'settings')) {
    const k = norm(text(r.key)).replace(/ /g, '_');
    if (k) out[k] = text(r.value);
  }
  return out;
}
export function readLog(values: unknown[][] | undefined): LiveLog[] {
  return readTable(values, 'log').map((r) => ({ when: text(r.when), who: text(r.who), what: text(r.what) }));
}
/** A setting's value, its fallback when it's blank or missing. */
export const setting = (s: Record<string, string> | undefined, key: string) =>
  (s?.[key] || SETTINGS.find((x) => x.key === key)?.fallback) ?? '';

/* ---------------- writing (the studio) ---------------- */

/** A tab as rows for the Sheet: the header, then one row per object. */
export function toRows(tab: TabId, items: Record<string, string | boolean | undefined>[]): string[][] {
  const cols = TABS[tab].cols as Col[];
  return [cols.map((c) => c.header), ...items.map((o) => cols.map((c) => {
    const v = o[c.key];
    return v === true ? 'yes' : v === false || v === undefined ? '' : String(v);
  }))];
}
export const personRow = (p: LivePerson) => ({
  name: p.name,
  role: p.role,
  tier: tierLabel(p.tier),
  group: p.group ?? '',
  domain: p.domain ?? '',
  photo: p.photo ?? '',
  show: p.hidden ? 'no' : 'yes',
});
export const dateRow = (d: LiveDate) => ({ ...d, yearly: d.yearly ? 'yes' : '' });

/* ---------------- shared helpers ---------------- */

export const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
