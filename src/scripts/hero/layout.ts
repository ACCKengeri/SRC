/*
  Where the hero's picture goes: the part of the stage the copy leaves free.
  Wide screens: the space to the right of the copy. Tall screens: the space
  below it. The friends (hero-scene.ts) and the ribbon (HeroScene.astro)
  both lay themselves out in this box, so they always agree and never sit
  under the text.
*/
export interface Region {
  x: number;
  y: number;
  w: number;
  h: number;
  wide: boolean;
}

export function heroRegion(stage: HTMLElement, copy: HTMLElement[]): Region {
  const s = stage.getBoundingClientRect();
  const W = stage.clientWidth, H = stage.clientHeight;
  let right = 0, bottom = 0;
  for (const el of copy) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    right = Math.max(right, r.right - s.left);
    bottom = Math.max(bottom, r.bottom - s.top);
  }
  // Matches the hero's CSS: copy beside the picture above 60rem, above it below.
  const wide = !window.matchMedia('(max-width: 60rem)').matches;
  if (wide) {
    const x = Math.max(W * 0.4, right + Math.min(64, Math.max(24, W * 0.03)));
    return { x, y: H * 0.12, w: W - x - Math.max(16, W * 0.025), h: H * 0.8, wide };
  }
  const y = Math.max(H * 0.42, bottom + 20);
  return { x: 12, y, w: W - 24, h: Math.max(160, H - y - 20), wide };
}
