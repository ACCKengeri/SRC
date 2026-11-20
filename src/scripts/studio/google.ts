/*
  The studio's line to Google: sign-in (Google Identity Services, in the
  browser, no server), and the few Sheet and Drive calls the editors need.

  The sign-in gives a one-hour token for the account that signs in. Google
  itself decides what that account may do: only one with edit access to the
  ACC Sheet and folders can save anything, whoever finds this page.
*/
import { LIVE } from '../../lib/live/config';

const SCOPES = 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets';
const SHEETS = `https://sheets.googleapis.com/v4/spreadsheets/${LIVE.sheetId}`;
const DRIVE = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
const TOKEN_KEY = 'acc-studio:token';

/* ---------------- sign-in ---------------- */

type Token = { token: string; until: number };
declare const google: {
  accounts: {
    oauth2: {
      initTokenClient(o: {
        client_id: string;
        scope: string;
        callback: (r: { access_token?: string; expires_in?: number; error?: string; scope?: string }) => void;
        error_callback?: (e: { type: string; message?: string }) => void;
      }): { requestAccessToken(o?: { prompt?: string; login_hint?: string }): void };
      revoke(token: string, done?: () => void): void;
    };
  };
};

let token: Token | null = (() => {
  try {
    const t = JSON.parse(sessionStorage.getItem(TOKEN_KEY) || 'null') as Token | null;
    return t && t.until > Date.now() + 60_000 ? t : null;
  } catch {
    return null;
  }
})();
export const signedIn = () => !!token && token.until > Date.now();
export const tokenLeft = () => (token ? token.until - Date.now() : 0);

let gis: Promise<void> | null = null;
function loadGis() {
  return (gis ??= new Promise<void>((ok, fail) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => ok();
    s.onerror = () => {
      gis = null;
      fail(new Error("Google's sign-in couldn't be reached. Check the connection and try again."));
    };
    document.head.appendChild(s);
  }));
}

/** Opens Google's sign-in. Resolves once there is a token. */
export async function signIn(hint?: string): Promise<void> {
  await loadGis();
  return new Promise((ok, fail) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: LIVE.clientId,
      scope: SCOPES,
      callback: (r) => {
        if (!r.access_token) return fail(new Error(r.error === 'access_denied' ? 'Sign-in was cancelled.' : `Sign-in failed (${r.error}).`));
        if (!/auth\/drive\b/.test(r.scope ?? '') || !/spreadsheets/.test(r.scope ?? ''))
          return fail(new Error('The studio needs both Drive and Sheets access. Sign in again and tick both boxes.'));
        token = { token: r.access_token, until: Date.now() + (r.expires_in ?? 3600) * 1000 };
        try {
          sessionStorage.setItem(TOKEN_KEY, JSON.stringify(token));
        } catch {}
        ok();
      },
      error_callback: (e) => fail(new Error(e.type === 'popup_closed' ? 'Sign-in was closed before it finished.' : 'Sign-in could not open. Allow pop-ups for this site and try again.')),
    });
    client.requestAccessToken({ prompt: '', login_hint: hint });
  });
}

export function signOut() {
  const t = token?.token;
  token = null;
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {}
  if (t) loadGis().then(() => google.accounts.oauth2.revoke(t)).catch(() => {});
}

/* ---------------- calls ---------------- */

export class GoogleError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}
/** Something the studio should offer to fix by signing in again. */
export const isAuthError = (e: unknown) => e instanceof GoogleError && e.status === 401;

let onExpired: () => void = () => {};
export const whenExpired = (f: () => void) => (onExpired = f);

export async function call<T>(url: string, init: RequestInit = {}): Promise<T> {
  if (!signedIn()) {
    onExpired();
    throw new GoogleError('Your sign-in has run out. Sign in again to carry on; nothing you changed is lost.', 401);
  }
  const res = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token!.token}`, ...(init.headers ?? {}) } });
  if (res.status === 401) {
    token = null;
    onExpired();
    throw new GoogleError('Your sign-in has run out. Sign in again to carry on; nothing you changed is lost.', 401);
  }
  if (!res.ok) {
    let msg = `${res.status}`;
    try {
      msg = ((await res.json()) as { error?: { message?: string } }).error?.message ?? msg;
    } catch {}
    if (res.status === 403) msg = `This account can't change that. ${msg}`;
    throw new GoogleError(msg, res.status);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}
const json = (body: unknown, method = 'POST'): RequestInit => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

/* ---------------- who, and may they ---------------- */

export interface Me {
  name: string;
  email: string;
  photo?: string;
}
export async function whoAmI(): Promise<Me> {
  const r = await call<{ user: { displayName: string; emailAddress: string; photoLink?: string } }>(`${DRIVE}/about?fields=user(displayName,emailAddress,photoLink)`);
  return { name: r.user.displayName, email: r.user.emailAddress, photo: r.user.photoLink };
}
export async function canEdit(id: string): Promise<boolean> {
  try {
    const r = await call<{ capabilities?: { canEdit?: boolean; canAddChildren?: boolean } }>(`${DRIVE}/files/${id}?fields=capabilities(canEdit,canAddChildren)&supportsAllDrives=true`);
    return !!(r.capabilities?.canEdit || r.capabilities?.canAddChildren);
  } catch (e) {
    if (isAuthError(e)) throw e;
    return false;
  }
}

/* ---------------- the Sheet ---------------- */

export interface TabInfo {
  id: number;
  title: string;
}
export async function tabs(): Promise<TabInfo[]> {
  const r = await call<{ sheets: { properties: { sheetId: number; title: string } }[] }>(`${SHEETS}?fields=sheets.properties(sheetId,title)`);
  return r.sheets.map((s) => ({ id: s.properties.sheetId, title: s.properties.title }));
}

/** Each named tab's cells (unformatted, dates as serial numbers). */
export async function readTabs(names: string[]): Promise<Record<string, unknown[][]>> {
  if (!names.length) return {};
  const r = await call<{ valueRanges: { values?: unknown[][] }[] }>(
    `${SHEETS}/values:batchGet?${names.map((n) => `ranges=${encodeURIComponent(`'${n}'`)}`).join('&')}&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER`,
  );
  return Object.fromEntries(names.map((n, i) => [n, r.valueRanges[i]?.values ?? []]));
}

/**
 * Replaces a tab's rows with `rows`. Rows the tab had beyond them are blanked
 * in the same call, so a shorter list never leaves old rows behind.
 */
export async function writeTab(name: string, rows: string[][], had: number) {
  const width = Math.max(...rows.map((r) => r.length));
  const values = [...rows, ...Array.from({ length: Math.max(0, had - rows.length) }, () => Array(width).fill(''))];
  await call(`${SHEETS}/values/${encodeURIComponent(`'${name}'!A1`)}?valueInputOption=RAW`, json({ values }, 'PUT'));
}

export async function addTabs(names: string[]): Promise<TabInfo[]> {
  const r = await call<{ replies: { addSheet: { properties: { sheetId: number; title: string } } }[] }>(
    `${SHEETS}:batchUpdate`,
    json({ requests: names.map((title) => ({ addSheet: { properties: { title, gridProperties: { frozenRowCount: 1 } } } })) }),
  );
  const made = r.replies.map((x) => ({ id: x.addSheet.properties.sheetId, title: x.addSheet.properties.title }));
  // headers in bold, so a hand edit in Sheets can tell them from the rows
  await call(
    `${SHEETS}:batchUpdate`,
    json({
      requests: made.map((t) => ({
        repeatCell: { range: { sheetId: t.id, startRowIndex: 0, endRowIndex: 1 }, cell: { userEnteredFormat: { textFormat: { bold: true } } }, fields: 'userEnteredFormat.textFormat.bold' },
      })),
    }),
  );
  return made;
}

export async function removeTab(id: number) {
  await call(`${SHEETS}:batchUpdate`, json({ requests: [{ deleteSheet: { sheetId: id } }] }));
}

export async function copyTab(id: number, title: string) {
  await call(`${SHEETS}:batchUpdate`, json({ requests: [{ duplicateSheet: { sourceSheetId: id, newSheetName: title, insertSheetIndex: 99 } }] }));
}

export async function appendRow(name: string, row: string[]) {
  await call(`${SHEETS}/values/${encodeURIComponent(`'${name}'!A:Z`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, json({ values: [row] }));
}

/* ---------------- Drive ---------------- */

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
}

export async function createFolder(name: string, parent: string): Promise<DriveFile> {
  return call<DriveFile>(`${DRIVE}/files?fields=id,name,mimeType&supportsAllDrives=true`, json({ name, parents: [parent], mimeType: 'application/vnd.google-apps.folder' }));
}

export async function fileBlob(id: string): Promise<Blob> {
  if (!signedIn()) throw new GoogleError('Sign in again first.', 401);
  const res = await fetch(`${DRIVE}/files/${id}?alt=media&supportsAllDrives=true`, { headers: { Authorization: `Bearer ${token!.token}` } });
  if (!res.ok) throw new GoogleError(res.status === 404 ? "That file isn't in Drive, or this account can't open it." : `Drive said ${res.status}.`, res.status);
  return res.blob();
}

export async function fileName(id: string): Promise<string> {
  return (await call<{ name: string }>(`${DRIVE}/files/${id}?fields=name&supportsAllDrives=true`)).name;
}

/** Sends `blob` into `parent`, reporting progress 0..1. Big files go up in one resumable session. */
export async function upload(blob: Blob, name: string, parent: string, progress: (f: number) => void = () => {}): Promise<DriveFile> {
  if (!signedIn()) {
    onExpired();
    throw new GoogleError('Your sign-in has run out. Sign in again to carry on.', 401);
  }
  const type = blob.type || 'application/octet-stream';
  const meta = { name, parents: [parent] };
  const send = (method: string, url: string, body: XMLHttpRequestBodyInit, headers: Record<string, string>) =>
    new Promise<DriveFile>((ok, fail) => {
      const x = new XMLHttpRequest();
      x.open(method, url);
      for (const [k, v] of Object.entries(headers)) x.setRequestHeader(k, v);
      x.upload.onprogress = (e) => e.lengthComputable && progress(e.loaded / e.total);
      x.onload = () => {
        if (x.status >= 200 && x.status < 300) {
          progress(1);
          ok(JSON.parse(x.responseText));
        } else {
          if (x.status === 401) onExpired();
          fail(new GoogleError(x.status === 403 ? "This account can't add files there." : `The upload failed (${x.status}).`, x.status));
        }
      };
      x.onerror = () => fail(new GoogleError('The upload was cut off. Check the connection and try again.', 0));
      x.send(body);
    });
  const auth = { Authorization: `Bearer ${token!.token}` };
  if (blob.size < 5 * 1024 * 1024) {
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }));
    form.append('file', blob);
    return send('POST', `${UPLOAD}?uploadType=multipart&fields=id,name,mimeType&supportsAllDrives=true`, form, auth);
  }
  const start = await fetch(`${UPLOAD}?uploadType=resumable&fields=id,name,mimeType&supportsAllDrives=true`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': type, 'X-Upload-Content-Length': String(blob.size) },
    body: JSON.stringify(meta),
  });
  const at = start.headers.get('Location');
  if (!start.ok || !at) throw new GoogleError(`The upload couldn't start (${start.status}).`, start.status);
  return send('PUT', at, blob, { 'Content-Type': type });
}
