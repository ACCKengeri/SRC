/*
  Events, straight from Drive: every folder inside the Events folder is an
  event, named "YYYY-MM-DD Event name" (or "YYYY-MM Event name", or just a
  name). Its photos and videos are the event's gallery; a file named
  "cover..." leads, and a Google Doc called "About" is its description.

  One query lists the folders and a few more list every file in all of them
  at once (folders are asked about 25 at a time), so a gallery of any size is
  a handful of requests, cached for five minutes like the Sheet.
*/
import { LIVE } from './config';
import { getJson, store, wantsFresh } from './read';
import { driveId, slug, type LiveEventMeta } from './schema';

export interface DriveItem {
  id: string;
  name: string;
  kind: 'image' | 'video';
  w?: number;
  h?: number;
}
export interface LiveEvent {
  id: string; // the folder
  slug: string;
  title: string;
  /** "2026-12-20", "2026-12" or "" */
  date: string;
  created: string;
  items: DriveItem[];
  cover?: DriveItem;
  about?: string; // the About doc's ID
  description: string;
  featured: boolean;
}

const API = 'https://www.googleapis.com/drive/v3/files';
const KEY = 'acc-live:events:v1';
const TTL = 5 * 60 * 1000;

/** A photo at about `w` px wide (Drive makes the size; HEIC comes back as JPEG). */
export const photoUrl = (id: string, w: number) => `https://drive.google.com/thumbnail?id=${id}&sz=w${w}`;
/** The same photo from Google's image host, for when the first address fails. */
export const photoUrlAlt = (id: string, w: number) => `https://lh3.googleusercontent.com/d/${id}=w${w}`;
export const videoUrl = (id: string) => `https://drive.google.com/file/d/${id}/preview`;

/** "2026-12-20 Carol Night" → date and title. */
export function parseFolderName(name: string) {
  const m = /^\s*(\d{4})[-.](\d{1,2})(?:[-.](\d{1,2}))?\s*[-_:,.]?\s*(.*)$/.exec(name);
  if (!m) return { date: '', title: name.trim() };
  const p = (s: string) => s.padStart(2, '0');
  return { date: m[3] ? `${m[1]}-${p(m[2])}-${p(m[3])}` : `${m[1]}-${p(m[2])}`, title: m[4].trim() || name.trim() };
}

type File = {
  id: string;
  name: string;
  mimeType: string;
  parents?: string[];
  createdTime?: string;
  imageMediaMetadata?: { width?: number; height?: number; rotation?: number };
  videoMediaMetadata?: { width?: number; height?: number };
};

async function list(q: string, fields: string): Promise<File[]> {
  const out: File[] = [];
  let token = '';
  do {
    const r = await getJson<{ files: File[]; nextPageToken?: string }>(
      `${API}?q=${encodeURIComponent(q)}&fields=${encodeURIComponent(`nextPageToken,files(${fields})`)}` +
        `&pageSize=1000&orderBy=name&key=${LIVE.apiKey}${token ? `&pageToken=${token}` : ''}`,
      12000,
    );
    out.push(...r.files);
    token = r.nextPageToken ?? '';
  } while (token);
  return out;
}

export type RawEvents = { at: number; folder: string; folders: File[]; files: File[] };

export async function fetchEventFiles(folder: string): Promise<RawEvents> {
  const folders = await list(`'${folder}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`, 'id,name,createdTime');
  const files: File[] = [];
  for (let i = 0; i < folders.length; i += 25) {
    const ids = folders.slice(i, i + 25).map((f) => `'${f.id}' in parents`).join(' or ');
    files.push(
      ...(await list(
        `(${ids}) and trashed = false and (mimeType contains 'image/' or mimeType contains 'video/' or mimeType = 'application/vnd.google-apps.document')`,
        'id,name,mimeType,parents,imageMediaMetadata(width,height,rotation),videoMediaMetadata(width,height)',
      )),
    );
  }
  return { at: Date.now(), folder, folders, files };
}

/** The events, newest first, with the Sheet's notes on them applied. */
export function shapeEvents(raw: RawEvents, meta: LiveEventMeta[], withHidden = false): LiveEvent[] {
  const notes = new Map(meta.map((m) => [m.folder, m]));
  const byFolder = new Map<string, File[]>();
  for (const f of raw.files) for (const p of f.parents ?? []) byFolder.set(p, [...(byFolder.get(p) ?? []), f]);
  const used = new Set<string>();
  const events: LiveEvent[] = [];
  for (const f of raw.folders) {
    const note = notes.get(f.id);
    if (note?.hidden && !withHidden) continue;
    const { date, title } = parseFolderName(f.name);
    const files = byFolder.get(f.id) ?? [];
    const items: DriveItem[] = [];
    let about: string | undefined;
    for (const x of files) {
      if (x.mimeType === 'application/vnd.google-apps.document') {
        if (/^about\b/i.test(x.name)) about = x.id;
        continue;
      }
      const video = x.mimeType.startsWith('video/');
      const md = video ? x.videoMediaMetadata : x.imageMediaMetadata;
      const turned = !video && (x.imageMediaMetadata?.rotation ?? 0) % 2 === 1;
      items.push({ id: x.id, name: x.name, kind: video ? 'video' : 'image', w: turned ? md?.height : md?.width, h: turned ? md?.width : md?.height });
    }
    // the cover leads: the Sheet's choice, else a file called "cover", else the first photo
    let lead = note?.cover ? items.findIndex((x) => x.id === note.cover) : -1;
    if (lead < 0) lead = items.findIndex((x) => /^cover\b/i.test(x.name));
    if (lead < 0) lead = items.findIndex((x) => x.kind === 'image');
    if (lead > 0) items.unshift(...items.splice(lead, 1));
    let s = slug(note?.title || title) || f.id;
    while (used.has(s)) s += '-2';
    used.add(s);
    events.push({
      id: f.id,
      slug: s,
      title: note?.title || title,
      date,
      created: f.createdTime ?? '',
      items,
      cover: items.find((x) => x.kind === 'image') ?? items[0],
      about,
      description: note?.description ?? '',
      featured: !!note?.featured,
    });
  }
  const key = (e: LiveEvent) => e.date || e.created.slice(0, 10);
  // newest first; a featured event leads the page whatever its date
  return events.sort((a, b) => Number(b.featured) - Number(a.featured) || key(b).localeCompare(key(a)));
}

/** The events folder: the Sheet's setting if it names one, else the built-in one. */
export const eventsFolder = (settings?: Record<string, string>) => driveId(settings?.events_folder) || LIVE.eventsFolder;

/**
 * Calls back with the raw event listing: from the stored copy at once, then
 * again when a fetch brings something different. `failed` hears if there is
 * neither.
 */
export function onEvents(folder: string, cb: (r: RawEvents) => void, failed: () => void) {
  const cached = wantsFresh() ? null : store<RawEvents>(KEY);
  const usable = cached && cached.folder === folder ? cached : null;
  let shown = '';
  const give = (r: RawEvents) => {
    const sig = JSON.stringify([r.folders, r.files]);
    if (sig !== shown) {
      shown = sig;
      cb(r);
    }
  };
  if (usable) queueMicrotask(() => give(usable));
  if (!usable || Date.now() - usable.at > TTL)
    fetchEventFiles(folder)
      .then((r) => give(store(KEY, r)!))
      .catch((e) => {
        console.info('Events unavailable.', e);
        if (!usable) failed();
      });
}

/** The text of an event's About doc, or "" if it can't be read. */
export async function aboutText(docId: string): Promise<string> {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 6000);
    const res = await fetch(`${API}/${docId}/export?mimeType=text/plain&key=${LIVE.apiKey}`, { signal: ctl.signal });
    clearTimeout(t);
    return res.ok ? (await res.text()).replace(/^﻿/, '').trim() : '';
  } catch {
    return '';
  }
}
