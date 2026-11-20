/*
  The outline of a hand-torn paper strip: a straight-cut right end and a
  deckled top and bottom edge, seeded so the server render and the fold
  script draw the very same strip.

  Points run clockwise from the top left: along the top edge, down the cut
  end, back along the bottom. x is a fraction of the strip's width, y a
  px inset from its own edge (top: from the top, bottom: up from the bottom).
*/
export interface TornEdge {
  top: [number, number][];
  bottom: [number, number][];
}

export function tornEdge(seed: number, n = 56, depth = 3.6): TornEdge {
  let s = (seed * 9301 + 49297) % 233280;
  const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const edge = () => {
    const pts: [number, number][] = [];
    for (let i = 0; i <= n; i++) {
      // a little uneven spacing, so the tear never reads as a pattern
      const x = i === 0 || i === n ? i / n : (i + (rnd() - 0.5) * 0.7) / n;
      pts.push([x, 0.4 + rnd() * depth]);
    }
    return pts;
  };
  return { top: edge(), bottom: edge() };
}

/** A CSS clip-path for the strip as drawn with no fold (x in %, y in px). */
export function tornClipPath(e: TornEdge): string {
  const top = e.top.map(([x, y]) => `${(x * 100).toFixed(2)}% ${y.toFixed(1)}px`);
  const bottom = [...e.bottom].reverse().map(([x, y]) => `${(x * 100).toFixed(2)}% calc(100% - ${y.toFixed(1)}px)`);
  return `polygon(${[...top, ...bottom].join(',')})`;
}

/** The same outline in px for a strip w by h. */
export function tornPolygon(e: TornEdge, w: number, h: number): [number, number][] {
  return [...e.top.map(([x, y]) => [x * w, y] as [number, number]), ...[...e.bottom].reverse().map(([x, y]) => [x * w, h - y] as [number, number])];
}
