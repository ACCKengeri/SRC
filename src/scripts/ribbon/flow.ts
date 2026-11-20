/*
  A ribbon that falls down the page the way a real one would: long, lazy
  sweeps from side to side, never stiff, with now and then a curl where it
  turns over itself.

  The path is planned, not drawn by hand:
  1. The page is measured into two coarse grids: where the ribbon must not go
     (text lying on the bare ground, padded by the ribbon's width) and where
     it would be hidden anyway (under photos and paper sheets, which simply
     cover it).
  2. A wandering target swings slowly across the full width, with its own
     seeded rhythm per page. Dynamic programming then finds, row by row, the
     cheapest line down the page: close to the target, never through text,
     preferring to be seen, and never steeper than about 75 degrees off the
     vertical, so it always falls.
  3. The search moves in a staircase, so the line is then relaxed inside the
     open corridor around it to the least bent curve (a fourth-difference
     smoother, like a bent strip of spring steel), and curls are spliced in
     where a whole loop fits in open ground.
  Planning is async: it yields between stages and every few milliseconds of
  the search, so a long page never blocks input.
*/
import type { P2 } from './paint';

/** Seeded random in [0, 1). */
export function seeded(seed: number) {
  let s = (seed >>> 0) || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}
export const hashString = (t: string) => {
  let h = 2166136261;
  for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619);
  return h >>> 0;
};

export interface Grid {
  x0: number; // page x of column 0
  y0: number; // page y of row 0
  cell: number;
  cols: number;
  rows: number;
  data: Uint8Array;
}
export function makeGrid(x0: number, y0: number, w: number, h: number, cell: number): Grid {
  const cols = Math.max(1, Math.ceil(w / cell)), rows = Math.max(1, Math.ceil(h / cell));
  return { x0, y0, cell, cols, rows, data: new Uint8Array(cols * rows) };
}
export function markRect(g: Grid, l: number, t: number, r: number, b: number) {
  const c0 = Math.max(0, Math.floor((l - g.x0) / g.cell)), c1 = Math.min(g.cols - 1, Math.floor((r - g.x0) / g.cell));
  const r0 = Math.max(0, Math.floor((t - g.y0) / g.cell)), r1 = Math.min(g.rows - 1, Math.floor((b - g.y0) / g.cell));
  for (let y = r0; y <= r1; y++) for (let x = c0; x <= c1; x++) g.data[y * g.cols + x] = 1;
}
export function at(g: Grid, x: number, y: number) {
  const c = Math.floor((x - g.x0) / g.cell), r = Math.floor((y - g.y0) / g.cell);
  if (c < 0 || r < 0 || c >= g.cols || r >= g.rows) return 0;
  return g.data[r * g.cols + c];
}

export interface FlowInput {
  W: number;
  yStart: number;
  yEnd: number;
  xStart: number;
  width: number;
  vh: number;
  seed: number;
  block: Grid; // never cross
  cover: Grid; // hidden here (fine, but less good)
}

/**
 * Plans the ribbon's centreline down the page. Returns dense points (about
 * 3 px apart). Async: it hands the main thread back between stages (`pause`),
 * so planning a long page never blocks input.
 */
export async function planFlow(o: FlowInput, pause: () => Promise<void> = async () => {}): Promise<P2[]> {
  const { W, yStart, yEnd, width, vh } = o;
  const rnd = seeded(o.seed);
  const R = 14; // row height
  const C = 6; // column width
  const xmin = -width * 0.3, xmax = W + width * 0.3;
  const cols = Math.ceil((xmax - xmin) / C) + 1;
  const rows = Math.max(2, Math.ceil((yEnd - yStart) / R) + 1);
  const colX = (c: number) => xmin + c * C;
  const reach = Math.max(1, Math.floor((R * Math.tan((72 * Math.PI) / 180)) / C)); // steepest step per row

  // The wandering target: two slow swings at unrelated rhythms, so the
  // ribbon crosses the page every screen or so without ever repeating.
  const p1 = rnd() * 6.28, p2 = rnd() * 6.28, L1 = vh * (1.25 + rnd() * 0.5), L2 = vh * (0.55 + rnd() * 0.3);
  const target = (y: number) => {
    const u = y - yStart;
    const v = 0.72 * Math.sin((u / L1) * 6.283 + p1) + 0.28 * Math.sin((u / L2) * 6.283 + p2);
    return W * (0.5 + 0.47 * v);
  };

  // Cost of standing in a cell: text is forbidden, hidden is mildly worse
  // than seen, and straying from the target costs a little.
  const half = width / 2;
  const cellCost = (x: number, y: number, tx: number) => {
    // test the band's full width across
    if (at(o.block, x - half, y) || at(o.block, x, y) || at(o.block, x + half, y)) return 1e9;
    let c = 0;
    if (at(o.cover, x, y)) c += 0.6;
    const d = (x - tx) / W;
    c += d * d * 14;
    // a gentle pull off the very edge
    if (x < width * 0.3 || x > W - width * 0.3) c += 0.25;
    return c;
  };

  const cost = new Float32Array(cols * rows);
  const from = new Int16Array(cols * rows);
  // row 0: start near xStart
  for (let c = 0; c < cols; c++) {
    const x = colX(c);
    cost[c] = Math.abs(x - o.xStart) < width ? cellCost(x, yStart, o.xStart) : 1e9;
  }
  let slice = performance.now();
  for (let r = 1; r < rows; r++) {
    // hand the thread back every few milliseconds on long pages
    if (performance.now() - slice > 6) {
      await pause();
      slice = performance.now();
    }
    const y = yStart + r * R, tx = target(y);
    const base = r * cols, prev = (r - 1) * cols;
    for (let c = 0; c < cols; c++) {
      const own = cellCost(colX(c), y, tx);
      let best = 1e12, bi = c;
      const lo = Math.max(0, c - reach), hi = Math.min(cols - 1, c + reach);
      for (let k = lo; k <= hi; k++) {
        const s = (k - c) / reach;
        const v = cost[prev + k] + s * s * 0.35;
        if (v < best) {
          best = v;
          bi = k;
        }
      }
      cost[base + c] = best + own;
      from[base + c] = bi;
    }
  }
  // Best end, then walk back.
  let c = 0, best = Infinity;
  const last = (rows - 1) * cols;
  for (let k = 0; k < cols; k++) if (cost[last + k] < best) {
    best = cost[last + k];
    c = k;
  }
  const xs = new Float32Array(rows);
  for (let r = rows - 1; r >= 0; r--) {
    xs[r] = colX(c);
    c = from[r * cols + c];
  }

  await pause();
  // Bend it smooth. The search moves in a staircase (straight runs, then a
  // sideways step), and snapping samples back onto that staircase is what
  // made the old ribbon look boxy. Instead: find, for each row, the stretch of
  // open ground around the planned line (the corridor), then relax the line
  // to the least bent curve that stays inside it. Bending is penalised by the
  // fourth difference (the discrete beam equation), so long sweeps survive and
  // every corner rounds off; clamping to the corridor keeps it off the text.
  const free = (x: number, y: number) => !(at(o.block, x - half, y) || at(o.block, x, y) || at(o.block, x + half, y));
  const lo = new Float32Array(rows), hi = new Float32Array(rows);
  for (let r = 0; r < rows; r++) {
    const y = yStart + r * R;
    let l = xs[r], h = xs[r];
    while (l - C >= xmin && free(l - C, y)) l -= C;
    while (h + C <= xmax && free(h + C, y)) h += C;
    lo[r] = l;
    hi[r] = h;
  }
  const clampRow = (v: number, r: number) => Math.min(hi[r], Math.max(lo[r], v));
  const sm = Float32Array.from(xs);
  {
    // start from a Gaussian blur of the staircase, kept in the corridor
    const sig = 5, src = Float32Array.from(xs);
    for (let r = 0; r < rows; r++) {
      let t = 0, wsum = 0;
      for (let k = -sig * 2; k <= sig * 2; k++) {
        const j = Math.min(rows - 1, Math.max(0, r + k)), w = Math.exp(-(k * k) / (2 * sig * sig));
        t += src[j] * w;
        wsum += w;
      }
      sm[r] = clampRow(t / wsum, r);
    }
  }
  sm[0] = o.xStart;
  // The relaxation runs on a copy padded by two rows at each end (the ends
  // repeat), so the inner loop has no bounds checks.
  const pad = new Float32Array(rows + 4), nxt = new Float32Array(rows + 4);
  pad.set(sm, 2);
  for (let it = 0; it < 600; it++) {
    pad[0] = pad[1] = pad[2];
    pad[rows + 2] = pad[rows + 3] = pad[rows + 1];
    for (let r = 1; r < rows; r++) {
      const k = r + 2;
      const v = pad[k] - 0.055 * (pad[k - 2] - 4 * pad[k - 1] + 6 * pad[k] - 4 * pad[k + 1] + pad[k + 2]);
      nxt[k] = v < lo[r] ? lo[r] : v > hi[r] ? hi[r] : v;
    }
    nxt[2] = o.xStart;
    pad.set(nxt.subarray(2, rows + 2), 2);
    if (it % 200 === 199) await pause();
  }
  sm.set(pad.subarray(2, rows + 2));

  await pause();
  const K: P2[] = [];
  K.push([o.xStart, yStart - width * 1.5]);
  for (let r = 0; r < rows; r++) K.push([sm[r], yStart + r * R]);
  let pts = resample(K, 3);

  // Curls, about one a screen, only where a whole loop sits in open ground.
  const a = width * 1.2, b = width * 2.6; // see addLoop
  const span = 2 * Math.PI * a;
  const lens = arcLengths(pts);
  let s = vh * 0.5 + rnd() * vh * 0.4;
  const loops: { s: number; side: number }[] = [];
  while (s < lens[lens.length - 1] - span - vh * 0.3) {
    const i = indexAt(lens, s);
    const fits = (side: number) => {
      // sample the loop's footprint
      const j = indexAt(lens, s + span), q = pts[i], e = pts[j];
      const tx = e[0] - q[0], ty = e[1] - q[1], l = Math.hypot(tx, ty) || 1;
      const nx = (-ty / l) * side, ny = (tx / l) * side;
      for (let u = 0; u <= 1.0001; u += 0.1) {
        for (let v = 0; v <= 1.0001; v += 0.2) {
          const bx = q[0] + tx * u + nx * v * 2 * b, by = q[1] + ty * u + ny * v * 2 * b;
          if (at(o.block, bx, by) || at(o.cover, bx, by)) return false;
          if (bx < width || bx > W - width) return false;
        }
      }
      return true;
    };
    const order = pts[i][0] < W / 2 ? [1, -1] : [-1, 1];
    // side +1 bulges to the right of the direction of travel (which, going down, is screen left)
    const side = fits(order[0]) ? order[0] : fits(order[1]) ? order[1] : 0;
    if (side) {
      loops.push({ s, side });
      s += vh * (0.85 + rnd() * 0.5);
    } else s += 40;
  }
  for (let k = loops.length - 1; k >= 0; k--) pts = addLoop(pts, loops[k].s, a, b, loops[k].side);
  return pts;
}

export function arcLengths(p: P2[]) {
  const L = new Float32Array(p.length);
  for (let i = 1; i < p.length; i++) L[i] = L[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
  return L;
}
function indexAt(L: Float32Array, s: number) {
  let lo = 0, hi = L.length - 1;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (L[m] < s) lo = m + 1;
    else hi = m;
  }
  return lo;
}

/** Catmull-Rom through K, resampled about `step` px apart. */
export function resample(K: P2[], step = 3): P2[] {
  const out: P2[] = [];
  const n = K.length;
  for (let i = 0; i < n - 1; i++) {
    const p0 = K[Math.max(0, i - 1)], p1 = K[i], p2 = K[i + 1], p3 = K[Math.min(n - 1, i + 2)];
    const m = Math.max(1, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let j = 0; j < m; j++) {
      const t = j / m, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map(
        (k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3),
      ) as P2);
    }
  }
  out.push(K[n - 1]);
  return out;
}

/**
 * Splices a curl into a path at arclength s: a prolate trochoid, the shape a
 * ribbon makes when it turns over itself. It leaves and rejoins the path on
 * the path's own tangent, so the curve stays smooth; it crosses itself once.
 * a sets the loop's length along the path (2 pi a), b its size; the tightest
 * radius, inside the turn, is (b - a)^2 / b, kept wider than half the band.
 * side: +1 or -1, which way it bulges.
 */
export function addLoop(pts: P2[], s: number, a: number, b: number, side: number): P2[] {
  const L = arcLengths(pts);
  const span = 2 * Math.PI * a;
  const i0 = indexAt(L, s), i1 = indexAt(L, s + span);
  if (i1 <= i0 + 2) return pts;
  // The loop is laid in the path's own local frame (its tangent and normal
  // where it is), not along a straight chord, so it leaves and rejoins a
  // bending path on that path's direction, with no corner.
  // Positions and tangents are interpolated along the path by arclength:
  // snapping to the nearest sample made the loop's points step, and the
  // band's edges came out serrated.
  const pointAt = (u: number): P2 => {
    const j = Math.max(1, Math.min(pts.length - 1, indexAt(L, u)));
    const seg = L[j] - L[j - 1] || 1, f = Math.min(1, Math.max(0, (u - L[j - 1]) / seg));
    return [pts[j - 1][0] + (pts[j][0] - pts[j - 1][0]) * f, pts[j - 1][1] + (pts[j][1] - pts[j - 1][1]) * f];
  };
  const out: P2[] = pts.slice(0, i0);
  const n = Math.ceil((2 * Math.PI * (a + b) * 1.1) / 3);
  for (let k = 0; k <= n; k++) {
    const t = (k / n) * 2 * Math.PI;
    const base = s + (t / (2 * Math.PI)) * span;
    const c = pointAt(base), p0 = pointAt(base - 12), p1 = pointAt(base + 12);
    let tx = p1[0] - p0[0], ty = p1[1] - p0[1];
    const l = Math.hypot(tx, ty) || 1;
    tx /= l;
    ty /= l;
    const nx = -ty * side, ny = tx * side;
    const along = b * Math.sin(t), across = b * (1 - Math.cos(t));
    out.push([c[0] + tx * along + nx * across, c[1] + ty * along + ny * across]);
  }
  return out.concat(pts.slice(i1 + 1));
}
