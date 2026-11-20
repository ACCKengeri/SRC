/*
  Day and night. Night is the Christmas easter egg (the sun in the home
  card, or the switch in the footer). It lasts for this visit only: it is
  kept in sessionStorage, read by an inline script in BaseLayout before the
  page paints, and never turns on by itself.

  setTheme() swaps html[data-theme] inside a view transition, revealed as a
  circle growing from where it was asked for (the sun, the star, the
  switch). Anything that paints its own colours (the hero, the ribbons)
  listens for the acc:theme event.
*/
export type Theme = 'day' | 'night';

const KEY = 'acc-theme';
const BAR = { day: '#f2f6f6', night: '#0b1124' };

export const getTheme = (): Theme => (document.documentElement.dataset.theme === 'night' ? 'night' : 'day');

type VTDoc = Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };

export function setTheme(t: Theme, from?: { x: number; y: number }) {
  if (t === getTheme()) return;
  try {
    if (t === 'night') sessionStorage.setItem(KEY, 'night');
    else sessionStorage.removeItem(KEY);
  } catch {
    /* private mode: it simply won't carry to the next page */
  }
  const apply = () => {
    const root = document.documentElement;
    if (t === 'night') root.dataset.theme = 'night';
    else delete root.dataset.theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BAR[t]);
    document.dispatchEvent(new CustomEvent<Theme>('acc:theme', { detail: t }));
  };

  const doc = document as VTDoc;
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (still || !doc.startViewTransition) {
    apply();
    return;
  }
  const x = from?.x ?? window.innerWidth / 2;
  const y = from?.y ?? window.innerHeight / 2;
  const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  const vt = doc.startViewTransition(apply);
  vt.ready
    .then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 1100, easing: 'cubic-bezier(0.45, 0, 0.2, 1)', pseudoElement: '::view-transition-new(root)' },
      );
    })
    .catch(() => {});
}
