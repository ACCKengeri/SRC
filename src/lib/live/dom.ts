/*
  Small DOM helpers for putting live content into pages built by Astro.

  Astro scopes each component's styles with a data-astro-cid-* attribute on
  its elements, so anything built in the browser has to carry the same
  attribute to be styled. `el()` copies it from an element of that component
  already on the page.
*/
import { photoUrl, photoUrlAlt } from './drive';
import { setting } from './schema';

const base = import.meta.env.BASE_URL;

/** An element styled like `like`'s component (its scope attributes copied). */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  like: Element | null,
  cls = '',
  text?: string,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (like) for (const a of Array.from(like.attributes)) if (a.name.startsWith('data-astro-cid')) e.setAttribute(a.name, '');
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

/** A Drive photo, sized by `sizes`, falling back to Google's other image host. */
export function drivePhoto(id: string, sizes: string, widths = [240, 400, 560], alt = ''): HTMLImageElement {
  const img = document.createElement('img');
  img.alt = alt;
  img.loading = 'lazy';
  img.decoding = 'async';
  img.sizes = sizes;
  img.srcset = widths.map((w) => `${photoUrl(id, w)} ${w}w`).join(', ');
  img.src = photoUrl(id, widths[widths.length - 1]);
  img.addEventListener(
    'error',
    () => {
      img.srcset = widths.map((w) => `${photoUrlAlt(id, w)} ${w}w`).join(', ');
      img.src = photoUrlAlt(id, widths[widths.length - 1]);
    },
    { once: true },
  );
  return img;
}

/** A site path from the Sheet ("/prayers/#rosary") under the site's base; full addresses pass through. */
export const sitePath = (v: string) => (/^(https?:|mailto:|tel:)/.test(v) ? v : `${base}${v.replace(/^\//, '')}`);

/**
 * Settings onto the page, wherever an element asks for one:
 *   data-live-href="whatsapp"     its href
 *   data-live-text="email"        its text
 *   data-live-mailto="email"      its href, as mailto:
 */
export function applySettings(s: Record<string, string>) {
  for (const e of Array.from(document.querySelectorAll<HTMLElement>('[data-live-href]'))) {
    const v = setting(s, e.dataset.liveHref!);
    if (v) e.setAttribute('href', sitePath(v));
  }
  for (const e of Array.from(document.querySelectorAll<HTMLElement>('[data-live-text]'))) {
    const v = setting(s, e.dataset.liveText!);
    if (v) e.textContent = v;
  }
  for (const e of Array.from(document.querySelectorAll<HTMLElement>('[data-live-mailto]'))) {
    const v = setting(s, e.dataset.liveMailto!);
    if (v) e.setAttribute('href', `mailto:${v}`);
  }
}

/** Initials for a person without a photo, the way TeamFace makes them. */
export const initials = (name: string) =>
  name
    .replace(/^Fr\.\s*/, '')
    .split(' ')
    .filter((w) => /^[A-Z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join('') || name[0];
