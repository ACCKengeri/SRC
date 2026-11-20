/*
  A satin ribbon painted in 2D: a band of constant width that slowly twists
  along its length, so its teal front and coral back take turns facing the
  viewer, narrowing to a fine edge at each turn. Each sliver is lit as a real
  surface (diffuse from the top left, plus a soft satin highlight), and the
  whole band casts a faint shadow on the page. The free end is cut in a
  swallowtail, the way a ribbon is cut.

  Used by the home hero (HeroScene.astro) and the page ribbon (page.ts).
*/
export type P2 = [number, number];

type Satin = { dark: number[]; base: number[]; light: number[] };
const DAY: [Satin, Satin, string] = [
  { dark: [8, 46, 50], base: [19, 94, 99], light: [167, 211, 206] }, // deep teal satin
  { dark: [150, 52, 36], base: [240, 106, 85], light: [255, 227, 216] }, // coral reverse
  'rgba(11, 63, 67, 0.2)',
];
// Christmas night, in the crib's colours: gold satin with a deep violet reverse
const NIGHT: [Satin, Satin, string] = [
  { dark: [112, 76, 20], base: [214, 164, 66], light: [255, 238, 186] },
  { dark: [34, 22, 72], base: [86, 64, 160], light: [206, 192, 255] },
  'rgba(0, 0, 0, 0.45)',
];
let [FRONT, BACK, SHADOW] = typeof document !== 'undefined' && document.documentElement.dataset.theme === 'night' ? NIGHT : DAY;
let palette = 0; // bumped on every change, so each line re-mixes its colours once
/** Day or night colours for every ribbon painted from now on. */
export function ribbonTheme(night: boolean) {
  const next = night ? NIGHT : DAY;
  if (next[0] === FRONT) return;
  [FRONT, BACK, SHADOW] = next;
  palette++;
}
const L = (() => {
  const v = [-0.35, -0.55, 0.76], n = Math.hypot(v[0], v[1], v[2]);
  return v.map((x) => x / n);
})();
const HV = (() => {
  const v = [L[0], L[1], L[2] + 1], n = Math.hypot(v[0], v[1], v[2]);
  return v.map((x) => x / n);
})();

/** The ribbon's turn (radians) at arclength s: a slow steady twist with a little wander. */
const twist = (s: number) => (Math.PI * s) / 1100 + 0.6 * Math.sin(s / 380 + 1.1);

/** Samples cubic Béziers given as [start, c1, c2, end, c1, c2, end, ...], about `step` px apart. */
export function bezierPath(K: P2[], step = 3): P2[] {
  const out: P2[] = [K[0]];
  for (let i = 1; i + 2 < K.length; i += 3) {
    const a = K[i - 1], b = K[i], c = K[i + 1], d = K[i + 2];
    const est = Math.hypot(b[0] - a[0], b[1] - a[1]) + Math.hypot(c[0] - b[0], c[1] - b[1]) + Math.hypot(d[0] - c[0], d[1] - c[1]);
    const n = Math.max(4, Math.ceil(est / step));
    for (let j = 1; j <= n; j++) {
      const t = j / n, u = 1 - t;
      out.push([
        u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0],
        u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1],
      ]);
    }
  }
  return out;
}

/** A smooth curve through points (Catmull-Rom), about `step` px apart. */
export function throughPath(K: P2[], step = 3): P2[] {
  const out: P2[] = [];
  const n = K.length;
  for (let i = 0; i < n - 1; i++) {
    const p0 = K[Math.max(0, i - 1)], p1 = K[i], p2 = K[i + 1], p3 = K[Math.min(n - 1, i + 2)];
    const m = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let j = 0; j < m; j++) {
      const t = j / m, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((k) =>
        0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3),
      ) as P2);
    }
  }
  out.push(K[n - 1]);
  return out;
}

/** A dense ribbon centreline with its normals, twist and lit colours precomputed. */
export class RibbonLine {
  readonly n: number;
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly s: Float32Array;
  readonly nx: Float32Array;
  readonly ny: Float32Array;
  readonly c: Float32Array; // cos of the twist: signed half-width factor
  /** The colour of each sample, mixed from its lighting and the current palette. */
  get col(): string[] {
    if (this.mixed !== palette) {
      for (let i = 0; i < this.n; i++) {
        const P = this.c[i] >= 0 ? FRONT : BACK, k = this.k[i], sp = this.sp[i];
        const ch = (j: number) => Math.min(255, Math.round(P.dark[j] + (P.base[j] - P.dark[j]) * k + P.light[j] * sp * 0.55));
        this.cols[i] = `rgb(${ch(0)},${ch(1)},${ch(2)})`;
      }
      this.mixed = palette;
    }
    return this.cols;
  }
  private readonly cols: string[];
  private readonly k: Float32Array;
  private readonly sp: Float32Array;
  private mixed = -1;
  readonly total: number;

  /**
   * `settle`: over its last this-many px the band turns to lie flat, face up,
   * so a free end that hangs loose shows its satin rather than an edge.
   */
  constructor(pts: P2[], s0 = 0, settle = 0) {
    const n = (this.n = pts.length);
    this.x = new Float32Array(n);
    this.y = new Float32Array(n);
    this.s = new Float32Array(n);
    this.nx = new Float32Array(n);
    this.ny = new Float32Array(n);
    this.c = new Float32Array(n);
    this.cols = new Array(n);
    this.k = new Float32Array(n);
    this.sp = new Float32Array(n);
    let acc = 0;
    for (let i = 0; i < n; i++) {
      this.x[i] = pts[i][0];
      this.y[i] = pts[i][1];
      if (i) acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      this.s[i] = acc;
    }
    this.total = acc;
    const thEnd = twist(acc + s0), flat = Math.round(thEnd / Math.PI) * Math.PI;
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1];
      const l = Math.hypot(tx, ty) || 1;
      tx /= l;
      ty /= l;
      const nx = -ty, ny = tx;
      this.nx[i] = nx;
      this.ny[i] = ny;
      let th = twist(this.s[i] + s0);
      const toEnd = acc - this.s[i];
      if (toEnd < settle) {
        const u = 1 - toEnd / settle;
        th += (flat - thEnd) * u * u * (3 - 2 * u);
      }
      const cs = Math.cos(th), sn = Math.sin(th);
      this.c[i] = cs;
      // Face normal of the twisted band: Z cos - N sin; flip to the side we see.
      const sg = cs >= 0 ? 1 : -1;
      const fx = -nx * sn * sg, fy = -ny * sn * sg, fz = cs * sg;
      const d = Math.max(0, fx * L[0] + fy * L[1] + fz * L[2]);
      const sp = Math.pow(Math.max(0, fx * HV[0] + fy * HV[1] + fz * HV[2]), 28);
      this.k[i] = Math.min(1, d * 1.25);
      this.sp[i] = sp;
    }
  }

  /** Fractional sample index at arclength `s`. */
  at(s: number) {
    if (s <= 0) return 0;
    if (s >= this.total) return this.n - 1;
    let lo = 0, hi = this.n - 1;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (this.s[m] < s) lo = m;
      else hi = m;
    }
    return lo + (s - this.s[lo]) / Math.max(1e-6, this.s[hi] - this.s[lo]);
  }

  /** Fractional sample index where the line reaches page height `y` (lines that run downwards). */
  atY(y: number) {
    if (y <= this.y[0]) return 0;
    if (y >= this.y[this.n - 1]) return this.n - 1;
    let lo = 0, hi = this.n - 1;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (this.y[m] < y) lo = m;
      else hi = m;
    }
    return lo + (y - this.y[lo]) / Math.max(1e-6, this.y[hi] - this.y[lo]);
  }
}

/**
 * Paints samples i0..i1 (i1 may be fractional) of a ribbon, offset by (ox, oy).
 * With `tail`, the band ends at i1 in a swallowtail cut, wherever i1 is, so a
 * ribbon being drawn out always ends the way a cut ribbon does (pass false
 * where the band only runs on into the next tile).
 * `wave`, if given, moves each sample sideways along its normal by that many
 * px (the page ribbon uses it to let the free end trail like fabric).
 * `shift`, if given, moves each sample by that offset (the About page's
 * pull on the ribbon's end, see src/scripts/fold/fold.ts).
 */
export function paintRibbon(
  ctx: CanvasRenderingContext2D,
  r: RibbonLine,
  i0: number,
  i1: number,
  width: number,
  ox = 0,
  oy = 0,
  tail = true,
  wave: ((i: number) => number) | null = null,
  shift: ((i: number) => P2) | null = null,
) {
  const a = Math.max(0, Math.floor(i0));
  const end = Math.min(r.n - 1, i1);
  if (end - a < 0.5) return;
  const half = width / 2;
  const P = (i: number) => {
    const j = Math.min(r.n - 1, Math.floor(i)), f = i - j, k = Math.min(r.n - 1, j + 1);
    const c0 = r.c[j] + (r.c[k] - r.c[j]) * f;
    const c = Math.abs(c0) < 0.05 ? (c0 < 0 ? -0.05 : 0.05) : c0;
    const nx = r.nx[j], ny = r.ny[j];
    const w = wave ? wave(i) : 0;
    const sh = shift ? shift(i) : null;
    const x = r.x[j] + (r.x[k] - r.x[j]) * f + ox + nx * w + (sh ? sh[0] : 0);
    const y = r.y[j] + (r.y[k] - r.y[j]) * f + oy + ny * w + (sh ? sh[1] : 0);
    return [x + nx * half * c, y + ny * half * c, x - nx * half * c, y - ny * half * c, x, y];
  };

  // The swallowtail: two points past the end and a notch cut back into the
  // middle, along the band's direction at the end (as it lies, bent or not).
  let cut: number[][] | null = null;
  if (tail) {
    const j = Math.max(1, Math.min(r.n - 1, Math.ceil(end)));
    let tx = r.x[j] - r.x[j - 1], ty = r.y[j] - r.y[j - 1];
    const f = P(end), len = width * 0.9;
    if (wave || shift) {
      const g = P(Math.max(0, end - 2));
      if (Math.hypot(f[4] - g[4], f[5] - g[5]) > 0.5) {
        tx = f[4] - g[4];
        ty = f[5] - g[5];
      }
    }
    const l = Math.hypot(tx, ty) || 1;
    tx /= l;
    ty /= l;
    cut = [
      [f[0] + tx * len, f[1] + ty * len],
      [f[4] + tx * len * 0.35, f[5] + ty * len * 0.35],
      [f[2] + tx * len, f[3] + ty * len],
    ];
  }

  // The outline of the band as it actually lies (narrow where it twists),
  // used for its shadow, so the shadow never shows past a narrow turn.
  const left: number[][] = [], right: number[][] = [];
  for (let i = a; i < end; i++) {
    const p = P(i);
    left.push([p[0], p[1]]);
    right.push([p[2], p[3]]);
  }
  const e = P(end);
  left.push([e[0], e[1]]);
  right.push([e[2], e[3]]);

  // Soft shadow on the page: the band's outline drawn far off the canvas,
  // with only its shadow thrown back onto it.
  const m = ctx.getTransform(), sc = Math.hypot(m.a, m.b) || 1, OFF = 20000;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(left[0][0] + OFF, left[0][1]);
  for (let k = 1; k < left.length; k++) ctx.lineTo(left[k][0] + OFF, left[k][1]);
  if (cut) for (const c of cut) ctx.lineTo(c[0] + OFF, c[1]);
  for (let k = right.length - 1; k >= 0; k--) ctx.lineTo(right[k][0] + OFF, right[k][1]);
  ctx.closePath();
  ctx.fillStyle = '#000';
  ctx.shadowColor = SHADOW;
  ctx.shadowBlur = width * 0.4 * sc;
  ctx.shadowOffsetX = (-OFF + width * 0.12) * sc;
  ctx.shadowOffsetY = width * 0.3 * sc;
  ctx.fill();
  ctx.restore();

  // The band, one lit sliver per sample. Each sliver spans two samples and
  // starts on the very edge points of the one before (left[] / right[] are
  // shared), so consecutive slivers overlap exactly: no seams, no wedges in
  // tight turns.
  const last = left.length - 1;
  for (let k = 0; k < last; k++) {
    const k0 = Math.max(0, k - 1), k2 = k + 1;
    ctx.beginPath();
    ctx.moveTo(left[k0][0], left[k0][1]);
    if (k0 !== k) ctx.lineTo(left[k][0], left[k][1]);
    ctx.lineTo(left[k2][0], left[k2][1]);
    ctx.lineTo(right[k2][0], right[k2][1]);
    if (k0 !== k) ctx.lineTo(right[k][0], right[k][1]);
    ctx.lineTo(right[k0][0], right[k0][1]);
    ctx.closePath();
    ctx.fillStyle = r.col[a + k];
    ctx.fill();
  }

  if (cut) {
    // starts a sample back, over the last sliver, so no hairline shows between them
    const j = Math.min(r.n - 1, Math.floor(end)), b = P(Math.max(a, end - 1));
    ctx.beginPath();
    ctx.moveTo(b[0], b[1]);
    ctx.lineTo(e[0], e[1]);
    ctx.lineTo(cut[0][0], cut[0][1]);
    ctx.lineTo(cut[1][0], cut[1][1]);
    ctx.lineTo(cut[2][0], cut[2][1]);
    ctx.lineTo(e[2], e[3]);
    ctx.lineTo(b[2], b[3]);
    ctx.closePath();
    ctx.fillStyle = r.col[j];
    ctx.fill();
  }
}
