/*
  The home hero: a pop-up greeting card.

  A card of thick paper lies open on the page: the base flat on the table, the
  back hinged up from it. Inside, cut-paper layers are glued as parallel
  folds, so they stand up by themselves as the card opens and lie flat again
  as it closes, the way a real pop-up card works: a layer glued at depth d
  from the spine always stays parallel to the back of the card, d in front
  of it. Back to front:

    the sky inside the back of the card, a sunburst and two birds
    clouds
    far hills and the campus, after CHRIST University, Kengeri: the brick
      engineering block, the PU block (white, navy bands, a curved glass
      tower) running on into the chapel on its ground floor, araucarias and
      a coconut palm; at night Bethlehem along the ridge in front, and the
      campus in Christmas lights of every colour
    a dove with an olive sprig
    near lawns: the campus gate, the fountain, a brick path to the chapel
    the paper chain of friends, cut from one folded strip and joined at the
      hands, which unfolds like an accordion as the card opens
    grass and paper flowers along the front edge

  Every layer is painted once into its own texture (paper grain, a lighter
  cut edge where the light catches it, and the soft little shadows each
  pasted piece throws on the one beneath), then lit as real paper: a warm key
  light from the upper left throws soft shadows from each layer onto the
  layers behind it, and from the card onto the table.

  Scroll story: the card starts half open, its layers leaning; it opens to a
  right angle, the scene standing up and the chain unfolding; it ends with
  the friends gathered in a shallow arc and the dove settled above them. The
  paper keeps a slight flutter at rest.

  Everything in the card answers a press (picked by a ray through the
  pointer, checked against each paper's painted outline so only real paper
  counts): a friend hops and the hop runs down the chain, the dove flaps up
  and circles, pressing the sky pushes the back of the card open a little
  and it springs back, the hills and the grass bend back and wobble, the
  card itself bounces. On a mouse, a friend under the pointer lets go of
  one hand and waves (on a phone, a tap makes them hop and wave).

  The wave is a separate paper arm hinged at the shoulder. While a friend
  waves, their sheets swap to a second texture painted without that arm
  and hand, so the loose arm can swing up from where it held the hand, wave,
  and come back down to take it again.

  IntersectionObserver-gated rAF loop; there is no scroll listener.
*/
import {
  BoxGeometry,
  CanvasTexture,
  Color,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  PointLight,
  Quaternion,
  DirectionalLight,
  DoubleSide,
  Group,
  HemisphereLight,
  Mesh,
  Box3,
  Raycaster,
  Vector2,
  Vector3,
  type Intersection,
  type Object3D,
  MeshLambertMaterial,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShadowMaterial,
  SRGBColorSpace,
  WebGLRenderer,
  type Material,
} from 'three';
import { heroRegion } from './hero/layout';
import { getTheme, setTheme, type Theme } from './theme';

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
/** 0 -> 1 -> 0 over u in [0, 1], soft at both ends (a hop). */
const bump = (u: number) => (u <= 0 || u >= 1 ? 0 : Math.sin(Math.PI * u) ** 1.4);

/** A damped spring: paper pressed and let go. */
class Spring {
  x = 0;
  v = 0;
  constructor(
    private k = 120,
    private c = 7,
  ) {}
  step(dt: number) {
    const n = Math.max(1, Math.ceil(dt / 0.012));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      this.v += (-this.k * this.x - this.c * this.v) * h;
      this.x += this.v * h;
    }
  }
}

const NARROW = window.matchMedia('(max-width: 60rem)').matches;

/* ---------------- palette (the site's papers, see tokens.css) ---------------- */

const SHEET = '#fbfdfc';
const TEAL = '#135e63';
const DEEP = '#0b3f43';
const CORAL = '#f06a55';
const SEAFOAM = '#a7d3ce';
const BUTTER = '#f4d58d';
const SKY = '#bfd9ea';
const PEACH = '#f3b9a9';
const LEAF = '#3f8a82'; // seafoam pressed darker: trees, near hills
const PINE = '#256a66';
const HILL_FAR = '#9ccac4';
const HILL_NEAR = '#6caea5';
const SKY_LIGHT = '#d3e6f2';
const SHADE = 'rgba(8, 40, 44, ';

/* ---------------- the card ---------------- */

const CARD_W = NARROW ? 2.1 : 2.8; // across
const CARD_D = 1.5; // spine to edge, both halves
const THICK = 0.014;
const TPU = NARROW ? 360 : 420; // texture px per scene unit

type Ctx = CanvasRenderingContext2D;

function makeCanvas(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas');
  c.width = Math.max(2, Math.round(w));
  c.height = Math.max(2, Math.round(h));
  const x = c.getContext('2d')!;
  x.lineJoin = 'round';
  x.lineCap = 'round';
  return [c, x];
}

let noise: HTMLCanvasElement | null = null;
/** Fine paper grain over whatever is already painted. */
function grain(c: Ctx) {
  if (!noise) {
    noise = document.createElement('canvas');
    noise.width = noise.height = 128;
    const nc = noise.getContext('2d')!;
    const img = nc.createImageData(128, 128);
    let s = 7;
    for (let i = 0; i < img.data.length; i += 4) {
      s = (s * 9301 + 49297) % 233280;
      const v = 110 + (s / 233280) * 120;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 22;
    }
    nc.putImageData(img, 0, 0);
  }
  c.save();
  c.globalCompositeOperation = 'source-atop';
  c.fillStyle = c.createPattern(noise, 'repeat')!;
  c.fillRect(0, 0, c.canvas.width, c.canvas.height);
  c.restore();
}

/** Draws `draw` as a soft shadow only, offset by (dx, dy). */
function shadowOnly(c: Ctx, draw: () => void, dx: number, dy: number, blur: number, alpha: number) {
  c.save();
  c.shadowColor = `${SHADE}${alpha})`;
  c.shadowBlur = blur;
  c.shadowOffsetX = 10000 + dx;
  c.shadowOffsetY = dy;
  c.translate(-10000, 0);
  draw();
  c.restore();
}

/**
 * A piece of paper pasted on: its soft shadow on what is beneath, a lighter
 * cut edge along its top left where the light catches it, then the piece.
 * `shape` must build and fill/stroke a path with the current fill/stroke style.
 */
let RIM = 'rgba(255,255,255,0.55)'; // the lit cut edge; dimmer on the night papers
function paste(c: Ctx, fill: string, shape: () => void, lift = 1, rim = RIM) {
  shadowOnly(c, () => {
    c.fillStyle = c.strokeStyle = '#000';
    shape();
  }, 2 * lift, 4 * lift, 7 * lift, 0.26);
  c.save();
  c.translate(-1.2, -1.4);
  c.fillStyle = c.strokeStyle = rim;
  shape();
  c.restore();
  c.fillStyle = c.strokeStyle = fill;
  shape();
}

const seeded = (seed: number) => {
  let s = seed;
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
};

/** A smooth ridge across the width: y at x. */
function ridge(W: number, y0: number, amp: number, seed: number) {
  const r = seeded(seed);
  const w = [0, 1, 2].map((k) => ({ f: [0.8, 1.9, 4.1][k] + r() * 0.6, a: amp * [1, 0.45, 0.16][k], p: r() * 6.28 }));
  return (x: number) => y0 + w.reduce((t, q) => t + q.a * Math.sin((x / W) * 6.283 * q.f + q.p), 0);
}
function fillUnder(c: Ctx, W: number, H: number, y: (x: number) => number) {
  c.beginPath();
  c.moveTo(-4, H + 4);
  for (let x = -4; x <= W + 4; x += 6) c.lineTo(x, y(x));
  c.lineTo(W + 4, H + 4);
  c.closePath();
  c.fill();
}

function lollipop(c: Ctx, x: number, base: number, h: number, crown: string) {
  const r = h * 0.32;
  paste(c, crown, () => {
    c.beginPath();
    c.arc(x, base - h + r, r, 0, Math.PI * 2);
    c.moveTo(x + r * 0.72 + r * 0.55, base - h + r * 1.5);
    c.arc(x + r * 0.72, base - h + r * 1.5, r * 0.55, 0, Math.PI * 2);
    c.moveTo(x - r * 0.7 + r * 0.5, base - h + r * 1.55);
    c.arc(x - r * 0.7, base - h + r * 1.55, r * 0.5, 0, Math.PI * 2);
    c.fill();
    c.lineWidth = Math.max(3, h * 0.07);
    c.beginPath();
    c.moveTo(x, base + 6);
    c.lineTo(x, base - h + r * 1.6);
    c.stroke();
  });
}
function pine(c: Ctx, x: number, base: number, h: number, col: string) {
  paste(c, col, () => {
    c.beginPath();
    for (let k = 0; k < 3; k++) {
      const t = base - h * (0.12 + k * 0.3), w = h * (0.34 - k * 0.07);
      c.moveTo(x - w, t);
      c.lineTo(x, t - h * 0.42);
      c.lineTo(x + w, t);
      c.closePath();
    }
    c.fill();
    c.lineWidth = Math.max(3, h * 0.06);
    c.beginPath();
    c.moveTo(x, base + 6);
    c.lineTo(x, base - h * 0.2);
    c.stroke();
  });
}
function flower(c: Ctx, x: number, y: number, r: number, petal: string, mid: string) {
  paste(c, petal, () => {
    c.beginPath();
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
      const px = x + Math.cos(a) * r * 0.62, py = y + Math.sin(a) * r * 0.62;
      c.moveTo(px + r * 0.48, py);
      c.arc(px, py, r * 0.48, 0, Math.PI * 2);
    }
    c.fill();
  }, 0.7);
  c.fillStyle = mid;
  c.beginPath();
  c.arc(x, y, r * 0.32, 0, Math.PI * 2);
  c.fill();
}

/* ---- the sky, inside the back of the card ---- */
function paintSky(): HTMLCanvasElement {
  const W = CARD_W * TPU, H = CARD_D * TPU;
  const [cv, c] = makeCanvas(W, H);
  c.fillStyle = SKY;
  c.fillRect(0, 0, W, H);
  // a sunburst of long pale rays (the sun itself is its own sheet, so it can set)
  const sx = W * SUN_X, sy = H * SUN_Y;
  c.fillStyle = SKY_LIGHT;
  c.beginPath();
  for (let k = 0; k < 18; k++) {
    const a = (k / 18) * Math.PI * 2, b = a + Math.PI / 30;
    c.moveTo(sx, sy);
    c.lineTo(sx + Math.cos(a) * W, sy + Math.sin(a) * W);
    c.lineTo(sx + Math.cos(b) * W, sy + Math.sin(b) * W);
    c.closePath();
  }
  c.fill();
  // two birds
  c.strokeStyle = DEEP;
  c.lineWidth = 3;
  for (const [bx, by, s] of [[0.56, 0.2, 1], [0.62, 0.15, 0.75], [0.48, 0.26, 0.6]]) {
    const x = W * bx, y = H * by, w = 16 * s;
    c.beginPath();
    c.moveTo(x - w, y - w * 0.3);
    c.quadraticCurveTo(x - w * 0.4, y - w * 0.55, x, y);
    c.quadraticCurveTo(x + w * 0.4, y - w * 0.55, x + w, y - w * 0.3);
    c.stroke();
  }
  // distant mountains, pale, low on the sky
  c.fillStyle = '#a9cbe0';
  fillUnder(c, W, H, ridge(W, H * 0.72, H * 0.06, 3));
  grain(c);
  return cv;
}

/* ---- the cover: teal, a coral dove, a fine butter border ---- */
function dovePath(c: Ctx, x: number, y: number, s: number) {
  // body, head and a raised wing, as one cut shape (facing right)
  c.beginPath();
  c.moveTo(x - 1.0 * s, y + 0.1 * s); // tail tip
  c.quadraticCurveTo(x - 0.6 * s, y + 0.05 * s, x - 0.35 * s, y + 0.18 * s);
  c.quadraticCurveTo(x + 0.1 * s, y + 0.36 * s, x + 0.45 * s, y + 0.12 * s);
  c.quadraticCurveTo(x + 0.62 * s, y + 0.02 * s, x + 0.66 * s, y - 0.12 * s); // breast to head
  c.quadraticCurveTo(x + 0.68 * s, y - 0.3 * s, x + 0.52 * s, y - 0.3 * s); // crown
  c.lineTo(x + 0.82 * s, y - 0.2 * s); // beak
  c.lineTo(x + 0.6 * s, y - 0.14 * s);
  c.quadraticCurveTo(x + 0.5 * s, y - 0.1 * s, x + 0.3 * s, y - 0.06 * s);
  // the raised wing, scalloped
  c.quadraticCurveTo(x + 0.2 * s, y - 0.5 * s, x - 0.05 * s, y - 0.86 * s);
  c.quadraticCurveTo(x - 0.12 * s, y - 0.6 * s, x - 0.22 * s, y - 0.62 * s);
  c.quadraticCurveTo(x - 0.26 * s, y - 0.4 * s, x - 0.38 * s, y - 0.4 * s);
  c.quadraticCurveTo(x - 0.38 * s, y - 0.2 * s, x - 0.5 * s, y - 0.16 * s);
  c.quadraticCurveTo(x - 0.75 * s, y - 0.1 * s, x - 1.0 * s, y - 0.18 * s);
  c.closePath();
}
function paintCover(): HTMLCanvasElement {
  const W = CARD_W * 220, H = CARD_D * 220;
  const [cv, c] = makeCanvas(W, H);
  c.fillStyle = TEAL;
  c.fillRect(0, 0, W, H);
  c.strokeStyle = BUTTER;
  c.lineWidth = 2;
  c.strokeRect(14, 14, W - 28, H - 28);
  paste(c, CORAL, () => {
    dovePath(c, W / 2, H * 0.56, H * 0.32);
    c.fill();
  });
  grain(c);
  return cv;
}
function paintPlain(col: string): HTMLCanvasElement {
  const [cv, c] = makeCanvas(256, 160);
  c.fillStyle = col;
  c.fillRect(0, 0, 256, 160);
  grain(c);
  return cv;
}

/* ---- clouds ---- */
const CLOUD_H = 0.34;
function paintClouds(): HTMLCanvasElement {
  const W = CARD_W * TPU, H = CLOUD_H * TPU;
  const [cv, c] = makeCanvas(W, H);
  const cloud = (cx: number, cy: number, s: number) =>
    paste(c, SHEET, () => {
      c.beginPath();
      c.moveTo(cx - s * 1.1, cy + s * 0.3);
      c.arc(cx - s * 0.55, cy + s * 0.02, s * 0.36, Math.PI, Math.PI * 1.9);
      c.arc(cx, cy - s * 0.22, s * 0.5, Math.PI * 1.1, Math.PI * 1.95);
      c.arc(cx + s * 0.58, cy, s * 0.38, Math.PI * 1.2, Math.PI * 2.05);
      c.lineTo(cx + s * 1.05, cy + s * 0.3);
      c.closePath();
      c.fill();
    }, 1.2);
  cloud(W * 0.47, H * 0.56, H * 0.34);
  if (!NARROW) cloud(W * 0.9, H * 0.38, H * 0.26);
  cloud(W * 0.07, H * 0.68, H * 0.2);
  grain(c);
  return cv;
}

/* ---- the far hills and the campus: the engineering block, the PU block and its chapel ---- */
const FAR_H = 1.02;
/** A pointed (Gothic) arch from the sill at y, w wide, h tall to its point. */
function pointed(k: Ctx, x: number, y: number, w: number, h: number) {
  k.moveTo(x - w / 2, y);
  k.lineTo(x - w / 2, y - h + w * 0.55);
  k.quadraticCurveTo(x - w / 2, y - h + w * 0.1, x, y - h);
  k.quadraticCurveTo(x + w / 2, y - h + w * 0.1, x + w / 2, y - h + w * 0.55);
  k.lineTo(x + w / 2, y);
  k.closePath();
}
/** An araucaria, tall and narrow, its branches in level tiers. */
function araucaria(c: Ctx, x: number, base: number, h: number, col: string) {
  paste(c, col, () => {
    c.lineWidth = Math.max(2, h * 0.025);
    c.beginPath();
    c.moveTo(x, base + 4);
    c.lineTo(x, base - h);
    c.stroke();
    c.beginPath();
    const tiers = 9;
    for (let k = 0; k < tiers; k++) {
      const t = k / tiers, y = base - h * (0.12 + t * 0.86), w = h * (0.2 - t * 0.17);
      c.moveTo(x - w, y + h * 0.03);
      c.quadraticCurveTo(x - w * 0.4, y - h * 0.035, x, y - h * 0.05);
      c.quadraticCurveTo(x + w * 0.4, y - h * 0.035, x + w, y + h * 0.03);
      c.quadraticCurveTo(x, y + h * 0.005, x - w, y + h * 0.03);
    }
    c.fill();
  });
}
/** A coconut palm: a leaning ringed trunk and a crown of fronds. */
function coconut(c: Ctx, x: number, base: number, h: number, lean: number, trunk: string, leaf: string, g?: Ctx) {
  const tx = x + lean * h, ty = base - h;
  paste(c, trunk, () => {
    c.lineWidth = Math.max(3, h * 0.045);
    c.beginPath();
    c.moveTo(x, base + 4);
    c.quadraticCurveTo(x + lean * h * 0.15, base - h * 0.6, tx, ty);
    c.stroke();
  });
  for (let k = 0; k < 9; k++) {
    const a = -2.3 + (k / 8) * 4.6;
    frond(c, tx, ty, h * (0.42 - Math.abs(a) * 0.03), a, g, leaf);
  }
}
/** Christmas lights in every colour the campus puts up. */
const LIGHTS = ['#5b8cff', '#ff5fa8', '#4fe08a', '#ffd166', '#b47cff', '#ff8a3d', '#eaf4ff'];
/** Bulbs at the given points, cycling through the colours, each with its glow. */
function bulbs(c: Ctx, g: Ctx, pts: [number, number][], r: number, cols = LIGHTS, from = 0) {
  cols.forEach((col, k) => {
    const dots = (q: Ctx) => {
      q.beginPath();
      pts.forEach(([x, y], i) => {
        if ((i + from) % cols.length !== k) return;
        q.moveTo(x + r, y);
        q.arc(x, y, r, 0, Math.PI * 2);
      });
      q.fill();
    };
    c.fillStyle = col;
    dots(c);
    glow(g, col, r * 4, () => dots(g), 0.95);
  });
}
/** An upright LED strip centred on x, from y0 down to y1. */
function strip(c: Ctx, g: Ctx, x: number, y0: number, y1: number, w: number, col: string) {
  const bar = (q: Ctx) => {
    q.beginPath();
    for (let y = y0; y < y1; y += w * 1.5) q.rect(x - w / 2, y, w, w * 1.05);
    q.fill();
  };
  c.fillStyle = col;
  bar(c);
  glow(g, col, w * 3.5, () => bar(g), 1);
}
/** A cone of warm fairy lights on a gold frame with a star on top; beside it, a crescent and star in lights. */
function lightTree(c: Ctx, g: Ctx, x: number, base: number, h: number, u: number, moon: number) {
  const w = h * 0.36, apex = base - h, r = seeded(404);
  const cone = (q: Ctx) => {
    q.beginPath();
    q.moveTo(x, apex);
    q.lineTo(x + w, base);
    q.ellipse(x, base, w, w * 0.12, 0, 0, Math.PI);
    q.closePath();
    q.fill();
  };
  // a warm haze inside the cone
  glow(g, '#6b4a14', 3 * u, () => cone(g), 0.7);
  c.strokeStyle = '#c9a24a';
  c.lineWidth = 0.35 * u;
  c.beginPath();
  for (const f of [-1, -0.5, 0, 0.5, 1]) {
    c.moveTo(x, apex);
    c.lineTo(x + f * w, base + w * 0.12 * Math.sqrt(1 - f * f));
  }
  c.moveTo(x + w, base);
  c.ellipse(x, base, w, w * 0.12, 0, 0, Math.PI * 2);
  c.stroke();
  const fairy: [number, number][] = [];
  for (let k = 0; k < 300; k++) {
    const t = Math.sqrt(r()), half = w * t;
    fairy.push([x + (r() * 2 - 1) * half, apex + t * h + (r() - 0.5) * 0.6 * u]);
  }
  bulbs(c, g, fairy, 0.42 * u, ['#fff3c4', '#ffe08a', '#fffaf0']);
  const star = (q: Ctx) => {
    starPath(q, x, apex - 2.2 * u, 3.4 * u, 1.3 * u, 5);
    q.fill();
  };
  paste(c, GOLD, () => star(c), 0.5);
  glow(g, '#ffe39a', 3 * u, () => star(g), 1);
  // the crescent, open to the right, a star at its upper tip
  const R = h * 0.2, mx = x + moon, my = base - R - 2 * u;
  const arc: [number, number][] = [];
  for (let a = 0.58; a <= 1.42; a += 0.035) arc.push([mx + R * Math.cos(a * Math.PI), my + R * Math.sin(a * Math.PI)]);
  for (let a = 0.66; a <= 1.34; a += 0.045) arc.push([mx + 0.35 * R + 0.8 * R * Math.cos(a * Math.PI), my + 0.8 * R * Math.sin(a * Math.PI)]);
  bulbs(c, g, arc, 0.45 * u, ['#fff3c4', '#ffe08a']);
  const tip = (q: Ctx) => {
    starPath(q, mx + R * 0.55, my - R * 1.05, 2 * u, 0.8 * u, 5);
    q.fill();
  };
  c.fillStyle = '#fff3c4';
  tip(c);
  glow(g, '#ffe39a', 2 * u, () => tip(g), 1);
}

function paintFar(night = false): [HTMLCanvasElement, HTMLCanvasElement | null] {
  const W = CARD_W * TPU, H = FAR_H * TPU;
  const [cv, c] = makeCanvas(W, H);
  const [gv, g] = night ? glowSheet(W, H) : [null, null];
  const was = RIM;
  if (night) RIM = NIGHT_RIM;
  const u = H * 0.0075, x = (f: number) => W * f;
  const WHITE = night ? '#e3e5ef' : SHEET, NAVY = night ? '#1d2552' : '#22357a';
  const FLOOR = 11 * u;
  /** Windows: glass by day; at night lit, with their glow. */
  const panes = (draw: (k: Ctx) => void, glass = '#6d8cab', lamp = AMBER) => {
    c.fillStyle = night ? lamp : glass;
    draw(c);
    if (g) glow(g, WARM, 1.2 * u, () => draw(g), 0.8);
  };

  // the far hills, as they were; at night snow along the ridge
  const y = ridge(W, H * 0.62, H * 0.05, 11);
  c.fillStyle = night ? N_HILL_FAR : HILL_FAR;
  fillUnder(c, W, H, y);
  c.strokeStyle = night ? N_SNOW : 'rgba(255,255,255,0.5)';
  c.lineWidth = night ? 6 : 2;
  c.beginPath();
  for (let px = 0; px <= W; px += 6) (px ? c.lineTo(px, y(px) - 1) : c.moveTo(px, y(px) - 1));
  c.stroke();
  /** Where a block stands: the lowest point of the ridge under it, so it never floats. */
  const foot = (x0: number, x1: number) => {
    let m = 0;
    for (let px = x0; px <= x1; px += 4) m = Math.max(m, y(px));
    return m + 5;
  };

  // the campus across the whole ridge, with room between the blocks
  // (Bethlehem is down on the near lawns at night, round the crib)
  const ENG: [number, number] = [x(0.04), x(0.24)];
  const ARCH: [number, number] = [x(0.32), x(0.5)];
  const CHAPEL: [number, number] = [x(0.56), x(0.7)];
  const PU: [number, number] = [x(0.7), x(0.975)];
  const TH = (NARROW ? 8 : 11) * u; // half the glass tower

  // a tree line along the ridge, kept clear of the blocks (and of the town)
  const tr = seeded(5);
  for (let px = x(0.03); px < W; px += x(0.035 + tr() * 0.03)) {
    const inside = ([a, b]: [number, number]) => px > a - 7 * u && px < b + 4 * u;
    const busy = inside(ENG) || inside(ARCH) || px > CHAPEL[0] - 9 * u || Math.abs(px - x(0.28)) < 8 * u;
    if (busy) {
      tr();
      tr();
      continue;
    }
    const h = H * (0.1 + tr() * 0.1);
    if (tr() < 0.45) pine(c, px, y(px) + 6, h, night ? N_PINE : PINE);
    else lollipop(c, px, y(px) + 6, h, night ? N_LEAF : LEAF);
  }

  /* the engineering block: brick panels between beige piers, a brown cornice, a drum at its left end */
  const engineering = (x0: number, x1: number, G: number) => {
    const FLOORS = 3, top = G - FLOORS * FLOOR, DRUM = Math.min(17 * u, (x1 - x0) * 0.32), dTop = top + 2 * u;
    const BR = night ? '#7b4433' : '#c4683f', PIER = night ? '#8d8576' : '#d9cdb5', BROWN = night ? '#4a2c24' : '#7a4532';
    paste(c, BR, () => {
      c.beginPath();
      c.rect(x0, dTop, DRUM, G - dTop);
      c.rect(x0 + DRUM, top, x1 - x0 - DRUM, G - top);
      c.fill();
    }, 1.3);
    // coursing in the brick
    c.strokeStyle = night ? 'rgba(20, 8, 4, 0.22)' : 'rgba(110, 40, 15, 0.2)';
    c.lineWidth = 0.25 * u;
    c.beginPath();
    for (let yy = top + 1.2 * u; yy < G; yy += 1.2 * u) {
      c.moveTo(yy < dTop ? x0 + DRUM : x0, yy);
      c.lineTo(x1, yy);
    }
    c.stroke();
    // floor bands
    c.fillStyle = BROWN;
    for (let f = 1; f < FLOORS; f++) c.fillRect(x0, G - f * FLOOR - 0.5 * u, x1 - x0, 0.9 * u);
    // the drum: pilasters crowding toward its curved edge, shade on that side
    const piers: number[] = [];
    for (const a of [0.2, 0.55, 0.95, 1.35]) piers.push(x0 + DRUM - DRUM * Math.sin(a));
    const P = 3 * u, STEP = 9.5 * u;
    for (let px = x0 + DRUM; px + P <= x1 + 0.5; px += STEP) piers.push(px + P / 2);
    piers.push(x1 - P / 2);
    c.fillStyle = PIER;
    for (const px of piers) {
      const w = px < x0 + DRUM ? P * (0.4 + 0.6 * ((px - x0) / DRUM)) : P;
      c.fillRect(px - w / 2, px < x0 + DRUM ? dTop : top, w, G - (px < x0 + DRUM ? dTop : top));
    }
    const shade = c.createLinearGradient(x0, 0, x0 + DRUM, 0);
    shade.addColorStop(0, 'rgba(40, 15, 5, 0.3)');
    shade.addColorStop(1, 'rgba(40, 15, 5, 0)');
    c.fillStyle = shade;
    c.fillRect(x0, dTop, DRUM, G - dTop);
    // windows with blue sills, one to a panel on each floor
    const mids: number[] = [];
    for (let px = x0 + DRUM + P; px + STEP - P <= x1; px += STEP) mids.push(px + (STEP - P) / 2);
    panes((k) => {
      k.beginPath();
      for (const mx of mids)
        for (let f = 0; f < FLOORS; f++) k.rect(mx - 1.8 * u, G - (f + 1) * FLOOR + 3 * u, 3.6 * u, 5 * u);
      k.fill();
    }, '#5d6f80');
    c.fillStyle = night ? '#3a5fa0' : '#3f86c8';
    for (const mx of mids) for (let f = 0; f < FLOORS; f++) c.fillRect(mx - 2.3 * u, G - (f + 1) * FLOOR + 8 * u, 4.6 * u, 0.7 * u);
    // the cornices, overhanging
    paste(c, BROWN, () => {
      c.beginPath();
      c.rect(x0 + DRUM - 1 * u, top - 2.2 * u, x1 - x0 - DRUM + 2.5 * u, 2.6 * u);
      c.rect(x0 - 1.2 * u, dTop - 2.2 * u, DRUM + 1.2 * u, 2.6 * u);
      c.fill();
    }, 0.9);
    // the drum's white canopy over a lit entrance
    const door = (k: Ctx) => k.fillRect(x0 + 1.5 * u, G - 5.4 * u, DRUM - 4 * u, 5.4 * u);
    c.fillStyle = night ? AMBER : '#6a4a34';
    door(c);
    if (g) glow(g, WARM, 1.5 * u, () => door(g), 0.85);
    paste(c, WHITE, () => {
      c.beginPath();
      c.roundRect(x0 - 4 * u, G - 7 * u, DRUM + 2 * u, 1.5 * u, 0.7 * u);
      c.rect(x0 - 3.4 * u, G - 6 * u, 0.7 * u, 6 * u);
      c.fill();
    }, 0.7);
    return { top: top - 2.2 * u, piers, dTop: dTop - 2.2 * u, drum: x0 + DRUM };
  };

  /* the architecture block: a glass box, the louvred block under a floating roof, a white wing with a brick band */
  const architecture = (x0: number, x1: number, G: number) => {
    const w = x1 - x0, STEEL = night ? '#232832' : '#3b4048';
    const A = x0 + 0.3 * w, B = x0 + 0.74 * w, top = G - 30 * u;
    // the dark tower behind
    const t0 = x0 + 0.16 * w, t1 = x0 + 0.38 * w, tTop = G - 44 * u;
    paste(c, night ? '#1d2534' : '#5b6878', () => c.fillRect(t0, tTop, t1 - t0, G - tTop), 1.1);
    const tLit = (k: Ctx) => {
      k.beginPath();
      for (let yy = tTop + 2 * u; yy < G - 22 * u; yy += 3.4 * u)
        for (let px = t0 + 1 * u; px < t1 - 2 * u; px += 2.6 * u) k.rect(px, yy, 1.6 * u, 1.8 * u);
      k.fill();
    };
    c.fillStyle = night ? '#cfe6ff' : 'rgba(255, 255, 255, 0.18)';
    tLit(c);
    if (g) glow(g, '#9cc8ff', 1 * u, () => tLit(g), 0.6);
    // the white wing on the right, a red brick band up its face
    paste(c, night ? '#d9dce6' : '#eef0f0', () => c.fillRect(B, top + 2 * u, x1 - B, G - top - 2 * u), 1.2);
    c.fillStyle = night ? '#7a3328' : '#b5523b';
    c.fillRect(B + (x1 - B) * 0.22, top + 0.6 * u, (x1 - B) * 0.22, G - top - 0.6 * u);
    c.fillRect(B, top + 2 * u, x1 - B, 1 * u);
    panes((k) => {
      k.beginPath();
      for (let f = 0; f < 3; f++) k.rect(B + (x1 - B) * 0.55, G - (f + 1) * 9.4 * u + 2.6 * u, (x1 - B) * 0.3, 4.4 * u);
      k.fill();
    }, '#55616e');
    // the glass box on the left
    const glassBox = (k: Ctx) => k.fillRect(x0, G - 20 * u, A + 1 * u - x0, 20 * u);
    const gl = c.createLinearGradient(x0, 0, A, 0);
    gl.addColorStop(0, night ? '#24506c' : '#7fb3c8');
    gl.addColorStop(0.5, night ? '#3d7da0' : '#b5dde9');
    gl.addColorStop(1, night ? '#24506c' : '#86b9cd');
    paste(c, '#000', () => glassBox(c), 1);
    c.fillStyle = gl;
    glassBox(c);
    if (g) glow(g, '#5fc8ff', 2 * u, () => glassBox(g), 0.55);
    c.strokeStyle = night ? 'rgba(190, 230, 255, 0.35)' : 'rgba(255, 255, 255, 0.55)';
    c.lineWidth = 0.3 * u;
    c.beginPath();
    for (let px = x0 + 3 * u; px < A; px += 3 * u) {
      c.moveTo(px, G - 20 * u);
      c.lineTo(px, G);
    }
    c.moveTo(x0, G - 10 * u);
    c.lineTo(A, G - 10 * u);
    c.stroke();
    c.fillStyle = STEEL;
    c.fillRect(x0, G - 21 * u, A + 1 * u - x0, 1.2 * u);
    // the louvred block: a steel frame, terracotta fins in every bay, dark glass at the ground
    paste(c, STEEL, () => c.fillRect(A, top, B - A, G - top), 1.2);
    const cols = Math.max(3, Math.round((B - A) / (4.4 * u))), cw = (B - A) / cols;
    const fins = (k: Ctx) => {
      k.beginPath();
      for (let f = 0; f < 3; f++)
        for (let n = 0; n < cols; n++) k.rect(A + n * cw + 0.5 * u, G - 9 * u - (f + 1) * 7 * u + 0.6 * u, cw - 1 * u, 6 * u);
      k.fill();
    };
    c.fillStyle = night ? '#e3a25c' : '#b3713f';
    fins(c);
    if (g) glow(g, WARM, 1.2 * u, () => fins(g), 0.75);
    c.strokeStyle = night ? 'rgba(90, 45, 15, 0.55)' : 'rgba(80, 40, 15, 0.45)';
    c.lineWidth = 0.3 * u;
    c.beginPath();
    for (let yy = G - 30 * u; yy < G - 9 * u; yy += 1 * u) {
      c.moveTo(A, yy);
      c.lineTo(B, yy);
    }
    c.stroke();
    const low = (k: Ctx) => k.fillRect(A + 0.6 * u, G - 7.4 * u, B - A - 1.2 * u, 7.4 * u);
    c.fillStyle = night ? AMBER : '#4c5a66';
    low(c);
    if (g) glow(g, WARM, 1.5 * u, () => low(g), 0.8);
    // the floating roof, tilted, on slim posts; a lower canopy over the ground floor
    const posts = [A - 1.5 * u, A + (B - A) * 0.5, B + 1.5 * u];
    paste(c, STEEL, () => {
      c.beginPath();
      c.moveTo(A - 4 * u, top - 3 * u);
      c.lineTo(B + 4 * u, top - 6 * u);
      c.lineTo(B + 4 * u, top - 4.4 * u);
      c.lineTo(A - 4 * u, top - 1.6 * u);
      c.closePath();
      c.rect(A - 3 * u, G - 9 * u, B - A + 6 * u, 1.2 * u);
      for (const px of posts) c.rect(px - 0.35 * u, top - 4 * u, 0.7 * u, G - top + 4 * u);
      c.fill();
    }, 1);
    return { roof: [A - 4 * u, top - 1.6 * u, B + 4 * u, top - 4.4 * u], posts, wing: [B, x1, top + 2 * u], glass: [x0, A, G - 21 * u] };
  };


  /* a PU wing: white bays between navy bands, an arched parapet over each bay */
  const BAY = 11 * u, BAND = 3.4 * u;
  const wing = (x0: number, x1: number, G: number, floors: number, stone: boolean) => {
    const top = G - floors * FLOOR;
    const bays: number[] = [];
    for (let px = x0 + BAND; px + BAY <= x1 - BAND + 0.5; px += BAY + BAND) bays.push(px);
    const parapets = (k: Ctx) => {
      for (const bx of bays) {
        k.moveTo(bx, top);
        k.quadraticCurveTo(bx + BAY / 2, top - 5 * u, bx + BAY, top);
      }
    };
    paste(c, WHITE, () => {
      c.beginPath();
      c.rect(x0, top, x1 - x0, G - top);
      parapets(c);
      c.fill();
    }, 1.3);
    // navy bands, running up past the roof
    const bands: number[] = [];
    for (let px = x0; px < x1 - BAND - 1; px += BAY + BAND) bands.push(px);
    bands.push(x1 - BAND);
    c.fillStyle = NAVY;
    for (const bx of bands) c.fillRect(bx, top - 1.5 * u, BAND, G - top + 1.5 * u);
    c.strokeStyle = NAVY;
    c.lineWidth = 0.7 * u;
    c.beginPath();
    parapets(c);
    c.stroke();
    // windows: two to a bay on each floor (the chapel has its own ground floor)
    panes((k) => {
      k.beginPath();
      for (const bx of bays)
        for (let f = stone ? 1 : 0; f < floors; f++) {
          const fy = G - (f + 1) * FLOOR + 2.4 * u;
          for (const dx of [-2.5, 2.5]) k.rect(bx + BAY / 2 + dx * u - 1.8 * u, fy, 3.6 * u, 4.6 * u);
        }
      k.fill();
    });
    return { top, bands: bands.map((bx) => bx + BAND / 2), bays };
  };

  /* the chapel, on the ground floor at the end of the PU block */
  const chapel = (x0: number, x1: number, door: number, G: number) => {
    const top = G - FLOOR - 1 * u;
    plaster(c, x0, top, x1 - x0, G - top + 2, (k) => {
      k.fillStyle = night ? '#8f8e98' : '#aaa8a3';
      k.fillRect(x0, top, x1 - x0, G - top + 2);
      // the stone cladding: irregular stones in greys
      const r = seeded(211);
      for (let yy = top; yy < G; yy += 1.9 * u) {
        let px = x0 - r() * 3 * u;
        while (px < x1) {
          const w = (2.2 + r() * 3) * u, v = r();
          k.fillStyle = night ? (v < 0.33 ? '#7c7b86' : v < 0.66 ? '#a3a2ad' : '#8e8d98') : v < 0.33 ? '#8f8d89' : v < 0.66 ? '#c4c1bb' : '#a9a6a0';
          k.beginPath();
          k.roundRect(px + 0.2 * u, yy + 0.2 * u, w - 0.4 * u, 1.5 * u, 0.3 * u);
          k.fill();
          px += w;
        }
      }
    }, 5, 0.8);
    // pointed windows: a white trim, wooden shutters (lit at night)
    const wins = [-20, -12, 12, 20].map((d) => door + d * u).filter((wx) => wx - 3 * u > x0 && wx + 3 * u < x1);
    const arches = (w: number, h: number) => (k: Ctx) => {
      k.beginPath();
      for (const wx of wins) pointed(k, wx, G - 1.2 * u, w, h);
      k.fill();
    };
    c.fillStyle = WHITE;
    arches(5.6 * u, 9.6 * u)(c);
    panes(arches(4.2 * u, 8.6 * u), '#8a5530');
    // the door: white trim, wood, a coloured fanlight
    c.fillStyle = WHITE;
    c.beginPath();
    pointed(c, door, G, 9 * u, 12.6 * u);
    c.fill();
    const wood = (k: Ctx) => k.fillRect(door - 3.4 * u, G - 7.8 * u, 6.8 * u, 7.8 * u);
    c.fillStyle = night ? WARM : '#9a6236';
    wood(c);
    if (g) glow(g, WARM, 2 * u, () => wood(g), 0.9);
    const fan = ['#c8443a', '#2f5ea8', '#e3b53b', '#2f5ea8', '#c8443a'];
    fan.forEach((col, n) => {
      const a0 = Math.PI + (n / fan.length) * Math.PI, a1 = Math.PI + ((n + 1) / fan.length) * Math.PI;
      const seg = (k: Ctx) => {
        k.beginPath();
        k.moveTo(door, G - 7.8 * u);
        k.arc(door, G - 7.8 * u, 3.4 * u, a0, a1);
        k.closePath();
        k.fill();
      };
      c.fillStyle = col;
      seg(c);
      if (g) glow(g, col, 1.5 * u, () => seg(g), 0.7);
    });
    // the curved white canopy over the door
    paste(c, WHITE, () => {
      c.beginPath();
      c.ellipse(door, G - FLOOR - 0.4 * u, 12 * u, 2.2 * u, 0, 0, Math.PI);
      c.rect(door - 12 * u, G - FLOOR - 1.6 * u, 24 * u, 1.2 * u);
      c.fill();
    }, 0.8);
  };

  /* the curved glass tower at the middle of the PU block */
  const tower = (tx: number, G: number) => {
    const half = TH, top = G - 44 * u, low = G - 10 * u;
    paste(c, WHITE, () => {
      c.beginPath();
      c.roundRect(tx - half - 1.5 * u, top - 3 * u, (half + 1.5 * u) * 2, 3.2 * u, 1.6 * u);
      c.roundRect(tx - half - 3 * u, low - 1 * u, (half + 3 * u) * 2, 2.6 * u, 1.3 * u);
      c.rect(tx - half - 1 * u, low + 1.6 * u, 1.6 * u, G - low - 1.6 * u);
      c.rect(tx + half - 0.6 * u, low + 1.6 * u, 1.6 * u, G - low - 1.6 * u);
      c.fill();
    }, 1.2);
    const glass = c.createLinearGradient(tx - half, 0, tx + half, 0);
    const stops = night ? ['#183156', '#3f6ea6', '#2a5288', '#14284a'] : ['#2d6f9a', '#a6dcf0', '#5aa7cc', '#2a5d86'];
    stops.forEach((col, n) => glass.addColorStop([0, 0.32, 0.68, 1][n], col));
    paste(c, '#000', () => {
      c.fillStyle = glass;
      c.fillRect(tx - half, top, half * 2, low - top - 1 * u);
    }, 1);
    c.fillStyle = glass;
    c.fillRect(tx - half, top, half * 2, low - top - 1 * u);
    c.strokeStyle = night ? 'rgba(200, 220, 255, 0.22)' : 'rgba(255, 255, 255, 0.4)';
    c.lineWidth = 0.3 * u;
    c.beginPath();
    for (let px = tx - half + 3.2 * u; px < tx + half; px += 3.2 * u) {
      c.moveTo(px, top);
      c.lineTo(px, low - 1 * u);
    }
    for (let yy = top + 4.8 * u; yy < low - 1 * u; yy += 4.8 * u) {
      c.moveTo(tx - half, yy);
      c.lineTo(tx + half, yy);
    }
    c.stroke();
    if (g) {
      const inside = g.createLinearGradient(tx - half, 0, tx + half, 0);
      inside.addColorStop(0, 'rgba(70, 120, 200, 0.25)');
      inside.addColorStop(0.4, 'rgba(150, 200, 255, 0.55)');
      inside.addColorStop(1, 'rgba(70, 120, 200, 0.25)');
      g.fillStyle = inside;
      g.fillRect(tx - half, top, half * 2, low - top - 1 * u);
    }
    // the entrance under it: a wooden lattice (lit at night)
    const door = (k: Ctx) => k.fillRect(tx - half + 1 * u, low + 1.6 * u, half * 2 - 2 * u, G - low - 1.6 * u);
    c.fillStyle = night ? AMBER : '#7a5638';
    door(c);
    if (g) glow(g, WARM, 1.5 * u, () => door(g), 0.8);
    return { top: top - 3 * u, half };
  };

  // the blocks, each on its own footing
  const eG = foot(ENG[0] - 4 * u, ENG[1]);
  const eng = engineering(ENG[0], ENG[1], eG);
  const aG = foot(ARCH[0], ARCH[1]);
  const arc = architecture(ARCH[0], ARCH[1], aG);
  // the chapel is the PU block's left end
  const pG = foot(CHAPEL[0], PU[1]);
  const towerX = x(0.84);
  const cw = wing(CHAPEL[0], CHAPEL[1], pG, 2, true);
  chapel(CHAPEL[0], CHAPEL[1], (CHAPEL[0] + CHAPEL[1]) / 2, pG);
  const lw = wing(PU[0], towerX - TH, pG, 3, false);
  const rw = wing(towerX + TH, PU[1], pG, 3, false);
  const tw = tower(towerX, pG);

  // the trees: an araucaria between the first two blocks, a coconut palm by the chapel
  const lean = -0.08, palmX = x(0.548), palmH = 34 * u;
  const pines: [number, number, number][] = [[x(0.28), y(x(0.28)) + 4, 46 * u]];
  for (const [px, b, h] of pines) araucaria(c, px, b, h, night ? N_PINE : PINE);
  coconut(c, palmX, pG + 1 * u, palmH, lean, night ? '#5d5446' : '#8b7656', night ? N_LEAF : LEAF);

  if (g) {
    // Christmas: every kind of light the campus puts up
    const k0 = { n: 0 };
    const next = () => LIGHTS[k0.n++ % LIGHTS.length];
    // LED strips up the piers and the navy bands
    for (const px of eng.piers) strip(c, g, px, px < eng.drum ? eng.dTop + 2.6 * u : eng.top + 2.6 * u, eG - 0.6 * u, 0.9 * u, next());
    for (const px of arc.posts) strip(c, g, px, arc.roof[1] + 1 * u, aG - 0.6 * u, 0.9 * u, next());
    for (const px of [arc.wing[0] + 0.6 * u, arc.wing[1] - 0.6 * u]) strip(c, g, px, arc.wing[2] + 1 * u, aG - 0.6 * u, 0.9 * u, next());
    for (const bx of [...lw.bands, ...rw.bands]) strip(c, g, bx, lw.top - 1.2 * u, pG - 0.6 * u, 0.9 * u, next());
    for (const bx of cw.bands) strip(c, g, bx, cw.top - 1.2 * u, pG - FLOOR - 1.4 * u, 0.9 * u, next());
    // pink and blue down the edges of the glass tower
    strip(c, g, towerX - tw.half + 0.5 * u, tw.top + 3.4 * u, pG - TH, 0.9 * u, '#ff5fa8');
    strip(c, g, towerX + tw.half - 0.5 * u, tw.top + 3.4 * u, pG - TH, 0.9 * u, '#5b8cff');
    // bulb strings along the rooflines, swagged between the bays
    const roof = (a: number, b: number, t: number, step = 2.2 * u): [number, number][] => {
      const pts: [number, number][] = [];
      for (let px = a + 1 * u; px < b; px += step) pts.push([px, t + 1.4 * u + Math.abs(Math.sin(((px - a) / (BAY + BAND)) * Math.PI)) * 1.3 * u]);
      return pts;
    };
    bulbs(c, g, [
      ...roof(eng.drum, ENG[1], eng.top + 2 * u),
      ...roof(ENG[0], eng.drum, eng.dTop + 2 * u),
      ...Array.from({ length: 16 }, (_, n): [number, number] => {
        const t = n / 15;
        return [arc.roof[0] + t * (arc.roof[2] - arc.roof[0]), arc.roof[1] + t * (arc.roof[3] - arc.roof[1]) + 0.5 * u];
      }),
      ...roof(arc.wing[0], arc.wing[1], arc.wing[2] - 1.5 * u, 1.8 * u),
      ...roof(arc.glass[0], arc.glass[1], arc.glass[2] - 1.2 * u, 2 * u),
      ...roof(PU[0], towerX - TH, lw.top),
      ...roof(towerX + TH, PU[1], rw.top),
      ...roof(CHAPEL[0], CHAPEL[1], cw.top),
      ...roof(CHAPEL[0], CHAPEL[1], pG - FLOOR - 3 * u, 2 * u),
    ], 0.55 * u);
    // a spiral of bulbs up each araucaria
    for (const [px, b, h] of pines) {
      const pts: [number, number][] = [];
      for (let t = 0.04; t < 0.95; t += 0.012) pts.push([px + h * (0.19 - t * 0.17) * Math.sin(t * Math.PI * 14), b - h * (0.1 + t * 0.86)]);
      bulbs(c, g, pts, 0.5 * u, LIGHTS, 2);
    }
    // rope lights wound up the palm trunk
    const rope: [number, number][] = [];
    const [sx, sy, cx, cy, ex, ey] = [palmX, pG + 1 * u, palmX + lean * palmH * 0.15, pG + 1 * u - palmH * 0.6, palmX + lean * palmH, pG + 1 * u - palmH];
    for (let t = 0; t <= 0.92; t += 0.018) {
      const m = 1 - t;
      rope.push([m * m * sx + 2 * m * t * cx + t * t * ex, m * m * sy + 2 * m * t * cy + t * t * ey]);
    }
    bulbs(c, g, rope, 0.55 * u, ['#ff8a3d', '#ffd166']);
    // the star on the tower
    const star = (k: Ctx) => {
      starPath(k, towerX, tw.top - 5 * u, 4 * u, 1.4 * u, 5);
      k.fill();
    };
    paste(c, GOLD, () => star(c), 0.6);
    glow(g, '#ffe39a', 3 * u, () => star(g), 1);
    // the tree of lights on the lawn between the blocks, a crescent beside it
    const ltX = x(0.515);
    lightTree(c, g, ltX, Math.max(eG, aG) + 3 * u, 64 * u, u, 30 * u);
  }
  grain(c);
  RIM = was;
  return [cv, gv];
}

/* ---- the dove, holding an olive sprig ---- */
const DOVE_W = 0.46, DOVE_H = 0.34;
function paintDove(): HTMLCanvasElement {
  const W = DOVE_W * TPU, H = DOVE_H * TPU;
  const [cv, c] = makeCanvas(W, H);
  const s = W * 0.42, x = W * 0.48, y = H * 0.62;
  // the sprig in its beak
  paste(c, LEAF, () => {
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(x + 0.74 * s, y - 0.2 * s);
    c.quadraticCurveTo(x + 0.95 * s, y - 0.05 * s, x + 1.08 * s, y + 0.08 * s);
    c.stroke();
    c.beginPath();
    for (const [lx, ly, a] of [[0.86, -0.18, -0.6], [0.95, -0.02, 0.5], [1.03, 0.0, -0.4], [1.08, 0.12, 0.6]]) {
      c.ellipse(x + lx * s, y + ly * s, 0.07 * s, 0.028 * s, a, 0, Math.PI * 2);
    }
    c.fill();
  }, 0.6);
  paste(c, SHEET, () => {
    dovePath(c, x, y, s);
    c.fill();
  }, 1.2);
  // the far wing, a shade darker, and feather cuts
  c.save();
  c.globalCompositeOperation = 'source-atop';
  c.strokeStyle = 'rgba(19, 94, 99, 0.28)';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(x - 0.22 * s, y - 0.56 * s);
  c.quadraticCurveTo(x - 0.1 * s, y - 0.3 * s, x + 0.06 * s, y - 0.12 * s);
  c.moveTo(x - 0.38 * s, y - 0.36 * s);
  c.quadraticCurveTo(x - 0.24 * s, y - 0.18 * s, x - 0.06 * s, y - 0.06 * s);
  c.stroke();
  c.restore();
  c.fillStyle = DEEP;
  c.beginPath();
  c.arc(x + 0.55 * s, y - 0.2 * s, 2.6, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = BUTTER;
  c.beginPath();
  c.moveTo(x + 0.66 * s, y - 0.24 * s);
  c.lineTo(x + 0.8 * s, y - 0.2 * s);
  c.lineTo(x + 0.64 * s, y - 0.15 * s);
  c.fill();
  grain(c);
  return cv;
}

/* ---- near hills, bushes and the paper path ---- */
const NEAR_H = 0.6;
/** The campus gate by day, the crib at night: the left quarter, clear of the friends. */
const CRIB_AT = NARROW ? 0.12 : 0.13;
/** The fountain, on the right. */
const FOUNTAIN_AT = NARROW ? 0.88 : 0.87;
function paintNear(night = false): [HTMLCanvasElement, HTMLCanvasElement | null] {
  const W = CARD_W * TPU, H = NEAR_H * TPU;
  const [cv, c] = makeCanvas(W, H);
  const [gv, g] = night ? glowSheet(W, H) : [null, null];
  const was = RIM;
  if (night) RIM = NIGHT_RIM;
  const y = ridge(W, H * 0.6, H * 0.06, 23);
  c.fillStyle = night ? N_HILL_NEAR : HILL_NEAR;
  fillUnder(c, W, H, y);
  c.strokeStyle = night ? N_SNOW : 'rgba(255,255,255,0.45)';
  c.lineWidth = night ? 7 : 2;
  c.beginPath();
  for (let x = 0; x <= W; x += 6) (x ? c.lineTo(x, y(x) - 1) : c.moveTo(x, y(x) - 1));
  c.stroke();
  // a red brick path winding up toward the chapel (under snow at night)
  const px = W * 0.66;
  paste(c, night ? '#c9d4e4' : '#c9694d', () => {
    c.beginPath();
    c.moveTo(px - W * 0.06, H + 2);
    c.bezierCurveTo(px - W * 0.02, H * 0.85, px + W * 0.1, H * 0.78, px + W * 0.11, y(px + W * 0.11) + 3);
    c.lineTo(px + W * 0.125, y(px + W * 0.125) + 3);
    c.bezierCurveTo(px + W * 0.125, H * 0.8, px + W * 0.05, H * 0.86, px + W * 0.05, H + 2);
    c.closePath();
    c.fill();
  }, 0.6);
  const cribX = W * CRIB_AT, cribU = H * 0.0098, cribHalf = 50 * cribU;
  const r = seeded(31);
  for (let x = W * 0.02; x < W; x += W * (0.05 + r() * 0.07)) {
    if (x > px - W * 0.08 && x < px + W * 0.15) continue;
    const yb = y(x) + 10;
    const clear = Math.abs(x - cribX) < cribHalf || Math.abs(x - W * FOUNTAIN_AT) < 30 * cribU;
    if (r() < 0.5) {
      // a bush: three crowns
      const s = H * (0.07 + r() * 0.05);
      const col = r() < 0.5 ? (night ? N_LEAF : LEAF) : night ? N_TEAL : TEAL;
      if (clear) continue;
      paste(c, col, () => {
        c.beginPath();
        c.arc(x - s * 0.7, yb - s * 0.6, s * 0.7, 0, Math.PI * 2);
        c.moveTo(x + s, yb - s);
        c.arc(x, yb - s, s, 0, Math.PI * 2);
        c.moveTo(x + s * 1.4, yb - s * 0.6);
        c.arc(x + s * 0.75, yb - s * 0.6, s * 0.65, 0, Math.PI * 2);
        c.fill();
      });
    } else {
      const h = H * (0.28 + r() * 0.16), col = r() < 0.5 ? (night ? N_LEAF : LEAF) : night ? N_TEAL : TEAL;
      // no tall trees in front of the chapel
      if (!clear && x < W * 0.6) lollipop(c, x, yb, h, col);
    }
  }
  if (g) {
    // Bethlehem, small and close: a huddle of houses right behind the crib
    bethlehem(c, g, (px) => (Math.abs(px - cribX) < 44 * cribU ? H * 0.5 : y(px) + 2), cribX - 64 * cribU, cribX + 66 * cribU, cribU * 0.95, 91);
    // the town wall, crenellated, light showing through its arches
    townWall(c, g, cribX + cribHalf * 0.9, cribX + cribHalf * 1.4, H * 0.84, cribU);
    crib(c, g, cribX, H * 0.84, cribU);
  } else gate(c, cribX, H * 0.86, cribU);
  fountain(c, g, W * FOUNTAIN_AT, H * 0.86, cribU * 1.3);
  grain(c);
  RIM = was;
  return [cv, gv];
}

/* ---- grass and flowers along the front ---- */
const GRASS_H = 0.3;
function paintGrass(night = false): [HTMLCanvasElement, HTMLCanvasElement | null] {
  const W = CARD_W * TPU, H = GRASS_H * TPU;
  const [cv, c] = makeCanvas(W, H);
  const [gv, g] = night ? glowSheet(W, H) : [null, null];
  const was = RIM;
  if (night) RIM = NIGHT_RIM;
  const r = seeded(77);
  const blades = (col: string, top: number, depth: number) =>
    paste(c, col, () => {
      c.beginPath();
      c.moveTo(-4, H + 4);
      let x = -4;
      while (x < W + 4) {
        const w = 10 + r() * 14, h = top + r() * depth;
        c.lineTo(x + w * 0.5, H - h);
        c.lineTo(x + w, H - h * 0.25);
        x += w;
      }
      c.lineTo(W + 4, H + 4);
      c.closePath();
      c.fill();
    });
  blades(night ? N_LEAF : LEAF, H * 0.3, H * 0.28);
  // flowers on stems, between the two rows of grass; at night, candles and poinsettias
  for (let x = W * 0.03; x < W; x += W * (0.04 + r() * 0.06)) {
    const h = H * (0.45 + r() * 0.35), fx = x + r() * 10;
    const k = r(), fr = H * (0.1 + r() * 0.05);
    if (g && k < 0.35) {
      candle(c, g, fx, H * 0.86, h * 0.42);
      continue;
    }
    c.strokeStyle = night ? N_PINE : PINE;
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(fx, H);
    c.quadraticCurveTo(fx + 6, H - h * 0.5, fx, H - h);
    c.stroke();
    if (night) poinsettia(c, fx, H - h, fr * 1.1);
    else flower(c, fx, H - h, fr, k < 0.55 ? '#f6c62c' : k < 0.8 ? '#f39a2b' : PEACH, k < 0.55 ? '#e0892a' : BUTTER);
  }
  blades(night ? '#21504a' : SEAFOAM, H * 0.12, H * 0.2);
  if (night) {
    // a bank of snow along the front edge
    const sr = seeded(19);
    paste(c, N_SNOW, () => {
      c.beginPath();
      c.moveTo(-4, H + 4);
      for (let x = -4; x <= W + 24; x += 24) c.quadraticCurveTo(x + 12, H * (0.8 - sr() * 0.1), x + 24, H * (0.9 - sr() * 0.04));
      c.lineTo(W + 4, H + 4);
      c.closePath();
      c.fill();
    }, 0.6);
  }
  grain(c);
  RIM = was;
  return [cv, gv];
}

/* ---------------- Christmas night ----------------

  The easter egg: press the sun and it sets behind the hills; night falls on
  the card and on the whole site (theme.ts). Every layer has a night paper,
  painted only when it is first needed, plus a glow sheet for what gives
  its own light (used as the material's emissive map): the star of
  Bethlehem, Kerala paper star lanterns, the chapel lit for midnight Mass,
  the crib, candles in the snow, an angel in place of the dove. */

const NIGHT_RIM = 'rgba(214, 205, 255, 0.24)';
// After the crib ACC builds each Christmas: a town of white plaster, lit amber
// from inside, under a navy sky that turns violet low down, like stage light.
const N_SKY_TOP = '#060a1e', N_SKY_LOW = '#3b2f72', N_MOUNT = '#221f4c';
const N_HILL_FAR = '#1a2142', N_HILL_NEAR = '#141a35', N_LEAF = '#1c2840', N_PINE = '#121a2e', N_TEAL = '#1a2340';
const PLASTER = '#efe6cf', PLASTER_SIDE = '#cbbfa3', STATUE = '#f4eddc', AMBER = '#f6bf62';
const N_SNOW = '#e4ebf6', WARM = '#ffcf73', XRED = '#c8323a', GOLD = '#f2c35c', CREAM = '#f6efe0';
const SKIN = '#e0a77c';

/** The sun (by day) and the star (by night) share one sheet, standing in front of the sky. */
const SUN_W = 0.72, SUN_H = 1.12, SUN_CY = 0.36; // scene units; SUN_CY: the centre, down from the top
const SUN_X = NARROW ? 0.3 : 0.24, SUN_Y = 0.3; // as fractions of the sky, from its top left

function starPath(c: Ctx, x: number, y: number, R: number, r: number, n: number, rot = -Math.PI / 2) {
  c.beginPath();
  for (let k = 0; k < n * 2; k++) {
    const a = rot + (k * Math.PI) / n, d = k % 2 ? r : R;
    const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
    if (k) c.lineTo(px, py);
    else c.moveTo(px, py);
  }
  c.closePath();
}
/**
 * A glow sheet (an emissive map) is opaque black: WebGL uploads a canvas
 * unpremultiplied and the emissive map reads only colour, so a soft halo on
 * a clear canvas would glow at full strength right to its edge.
 */
function glowSheet(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const [cv, c] = makeCanvas(w, h);
  c.fillStyle = '#000';
  c.fillRect(0, 0, cv.width, cv.height);
  return [cv, c];
}
/** Paint into the glow sheet: the shape in its own colour, with a soft halo. */
function glow(g: Ctx, col: string, blur: number, shape: () => void, alpha = 0.9) {
  g.save();
  g.globalAlpha = alpha;
  g.fillStyle = g.strokeStyle = col;
  g.shadowColor = col;
  g.shadowBlur = blur;
  shape();
  g.restore();
}
/** Paint as night paper: dimmer cut edges, then back to day. */
function atNight<T>(fn: () => T): T {
  const was = RIM;
  RIM = NIGHT_RIM;
  try {
    return fn();
  } finally {
    RIM = was;
  }
}

function paintSun(): HTMLCanvasElement {
  const W = SUN_W * TPU, H = SUN_H * TPU;
  const [cv, c] = makeCanvas(W, H);
  const sx = W / 2, sy = SUN_CY * TPU, R = 0.13 * CARD_D * TPU;
  const ring = (r: number, col: string, lift: number) =>
    paste(c, col, () => {
      c.beginPath();
      c.arc(sx, sy, r, 0, Math.PI * 2);
      c.fill();
    }, lift);
  ring(R * 1.55, '#fbe9c0', 0.8);
  ring(R * 1.2, '#f8dfa3', 0.8);
  ring(R * 0.86, BUTTER, 1);
  grain(c);
  return cv;
}

function paintStar(): [HTMLCanvasElement, HTMLCanvasElement] {
  const W = SUN_W * TPU, H = SUN_H * TPU;
  const [cv, c] = makeCanvas(W, H);
  const [gv, g] = glowSheet(W, H);
  const sx = W / 2, sy = SUN_CY * TPU, R = 0.15 * TPU;
  const tail = (x: Ctx) => {
    x.beginPath();
    x.moveTo(sx - R * 0.16, sy);
    x.lineTo(sx, H - 4);
    x.lineTo(sx + R * 0.16, sy);
    x.closePath();
    x.fill();
  };
  const big = (x: Ctx) => {
    starPath(x, sx, sy, R, R * 0.2, 4);
    x.fill();
  };
  const small = (x: Ctx) => {
    starPath(x, sx, sy, R * 0.6, R * 0.16, 4, -Math.PI / 4);
    x.fill();
  };
  atNight(() => {
    paste(c, '#ffe9b0', () => tail(c), 0.6);
    paste(c, GOLD, () => small(c), 0.8);
    paste(c, '#fff6dc', () => big(c), 1);
    c.fillStyle = GOLD;
    starPath(c, sx, sy, R * 0.34, R * 0.12, 4);
    c.fill();
  });
  // the glow: a halo, the tail, the points
  const halo = g.createRadialGradient(sx, sy, 0, sx, sy, R * 1.6);
  halo.addColorStop(0, 'rgba(255, 226, 160, 0.9)');
  halo.addColorStop(1, 'rgba(255, 226, 160, 0)');
  g.fillStyle = halo;
  g.fillRect(0, 0, W, H);
  glow(g, '#ffe3a0', 18, () => tail(g));
  glow(g, '#fff3cf', 24, () => {
    big(g);
    small(g);
  });
  return [cv, gv];
}

function paintSkyNight(): [HTMLCanvasElement, HTMLCanvasElement] {
  const W = CARD_W * TPU, H = CARD_D * TPU;
  const [cv, c] = makeCanvas(W, H);
  const [gv, g] = glowSheet(W, H);
  const sky = c.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, N_SKY_TOP);
  sky.addColorStop(1, N_SKY_LOW);
  c.fillStyle = sky;
  c.fillRect(0, 0, W, H);
  const sx = W * SUN_X, sy = H * SUN_Y;
  const halo = c.createRadialGradient(sx, sy, 0, sx, sy, H * 0.6);
  halo.addColorStop(0, 'rgba(255, 214, 140, 0.3)');
  halo.addColorStop(1, 'rgba(255, 214, 140, 0)');
  c.fillStyle = halo;
  c.fillRect(0, 0, W, H);
  atNight(() => {
    const r = seeded(41);
    for (let k = 0; k < (NARROW ? 50 : 70); k++) {
      const x = r() * W, y = r() * H * 0.68, s = 2.4 + r() * r() * 8, pts = r() < 0.5 ? 4 : 5;
      const col = r() < 0.7 ? '#fdf6dc' : '#ffe39a';
      if (Math.hypot(x - sx, y - sy) < H * 0.2) continue;
      paste(c, col, () => {
        starPath(c, x, y, s, s * 0.42, pts);
        c.fill();
      }, 0.3);
      // only the bigger stars give light; the rest are paper
      if (s > 4.5)
        glow(g, col, s * 1.2, () => {
          starPath(g, x, y, s, s * 0.42, pts);
          g.fill();
        }, 0.45);
    }
  });
  // a few big paper snowflakes stuck on the backdrop, as on the stage
  atNight(() => {
    const fr = seeded(13);
    for (const [fx, fy, fs] of [[0.04, 0.12, 1], [0.13, 0.36, 0.7], [0.96, 0.1, 0.9], [0.86, 0.32, 0.6], [0.58, 0.07, 0.55]]) {
      const x = W * fx, y = H * fy, R = H * 0.05 * fs;
      paste(c, 'rgba(236, 232, 255, 0.85)', () => {
        c.lineWidth = Math.max(2, R * 0.12);
        c.beginPath();
        for (let k = 0; k < 6; k++) {
          const a = (k * Math.PI) / 3 + fr() * 0.1;
          const ex = x + Math.cos(a) * R, ey = y + Math.sin(a) * R;
          c.moveTo(x, y);
          c.lineTo(ex, ey);
          for (const t of [0.55, 0.78]) {
            const bx = x + Math.cos(a) * R * t, by = y + Math.sin(a) * R * t;
            for (const d of [-0.6, 0.6]) {
              c.moveTo(bx, by);
              c.lineTo(bx + Math.cos(a + d) * R * 0.26, by + Math.sin(a + d) * R * 0.26);
            }
          }
        }
        c.stroke();
      }, 0.4);
    }
  });
  c.fillStyle = N_MOUNT;
  fillUnder(c, W, H, ridge(W, H * 0.72, H * 0.06, 3));
  grain(c);
  return [cv, gv];
}

/** Kerala paper star lanterns, hung from the top of the card where the clouds were. */
function paintLanterns(): [HTMLCanvasElement, HTMLCanvasElement] {
  const W = CARD_W * TPU, H = CLOUD_H * TPU;
  const [cv, c] = makeCanvas(W, H);
  const [gv, g] = glowSheet(W, H);
  const spots = NARROW
    ? [[0.1, 0.4, CREAM], [0.52, 0.46, GOLD], [0.9, 0.38, CREAM]]
    : [[0.08, 0.4, GOLD], [0.42, 0.48, CREAM], [0.66, 0.38, GOLD], [0.92, 0.46, CREAM]];
  atNight(() => {
    for (const [fx, fy, col] of spots as [number, number, string][]) {
      const x = W * fx, y = H * fy, s = H * 0.23;
      c.strokeStyle = 'rgba(230, 236, 246, 0.55)';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, y - s);
      c.stroke();
      // two paper tails
      paste(c, col, () => {
        c.lineWidth = 5;
        c.beginPath();
        c.moveTo(x - s * 0.3, y + s * 0.6);
        c.quadraticCurveTo(x - s * 0.42, y + s * 1.1, x - s * 0.28, y + s * 1.6);
        c.moveTo(x + s * 0.3, y + s * 0.6);
        c.quadraticCurveTo(x + s * 0.2, y + s * 1.15, x + s * 0.34, y + s * 1.55);
        c.stroke();
      }, 0.5);
      paste(c, col, () => {
        starPath(c, x, y, s, s * 0.48, 5);
        c.fill();
      }, 1);
      // an inner star cut a shade lighter, and a lit window in the middle
      c.fillStyle = 'rgba(255, 255, 255, 0.28)';
      starPath(c, x, y, s * 0.62, s * 0.3, 5);
      c.fill();
      c.fillStyle = '#fff1c8';
      c.beginPath();
      c.arc(x, y, s * 0.16, 0, Math.PI * 2);
      c.fill();
      glow(g, col === CREAM ? '#ffe6b0' : col, s * 0.9, () => {
        starPath(g, x, y, s, s * 0.48, 5);
        g.fill();
      });
      glow(g, '#fff1c8', s * 0.6, () => {
        g.beginPath();
        g.arc(x, y, s * 0.2, 0, Math.PI * 2);
        g.fill();
      });
    }
  });
  grain(c);
  return [cv, gv];
}

/** An angel with a trumpet, in place of the dove. */
function paintAngel(): [HTMLCanvasElement, HTMLCanvasElement] {
  const W = DOVE_W * TPU, H = DOVE_H * TPU;
  const [cv, c] = makeCanvas(W, H);
  const [gv, g] = glowSheet(W, H);
  const u = H / 100, x = W * 0.42, top = 22 * u;
  atNight(() => {
    // wings
    paste(c, '#dfe7f5', () => {
      c.beginPath();
      c.moveTo(x - 2 * u, top + 16 * u);
      c.quadraticCurveTo(x - 34 * u, top - 6 * u, x - 40 * u, top + 26 * u);
      c.quadraticCurveTo(x - 26 * u, top + 22 * u, x - 4 * u, top + 30 * u);
      c.closePath();
      c.fill();
    }, 0.8);
    // robe
    paste(c, CREAM, () => {
      c.beginPath();
      c.moveTo(x - 6 * u, top + 12 * u);
      c.lineTo(x + 6 * u, top + 12 * u);
      c.lineTo(x + 16 * u, top + 70 * u);
      c.quadraticCurveTo(x, top + 74 * u, x - 16 * u, top + 70 * u);
      c.closePath();
      c.fill();
    }, 1);
    // head
    paste(c, SKIN, () => {
      c.beginPath();
      c.arc(x, top + 5 * u, 7.5 * u, 0, Math.PI * 2);
      c.fill();
    }, 0.6);
    c.fillStyle = '#6b4226';
    c.beginPath();
    c.arc(x - 1 * u, top + 2 * u, 7.5 * u, Math.PI * 1.05, Math.PI * 1.95);
    c.fill();
    // the trumpet, raised to the right
    paste(c, GOLD, () => {
      c.lineWidth = 2.6 * u;
      c.beginPath();
      c.moveTo(x + 5 * u, top + 7 * u);
      c.lineTo(x + 34 * u, top - 6 * u);
      c.stroke();
      c.beginPath();
      c.moveTo(x + 32 * u, top - 5 * u);
      c.lineTo(x + 42 * u, top - 14 * u);
      c.lineTo(x + 45 * u, top - 4 * u);
      c.closePath();
      c.fill();
    }, 0.6);
    // halo
    c.strokeStyle = GOLD;
    c.lineWidth = 1.8 * u;
    c.beginPath();
    c.ellipse(x, top - 5 * u, 7 * u, 2.4 * u, 0, 0, Math.PI * 2);
    c.stroke();
  });
  glow(g, '#ffe39a', 10 * u, () => {
    g.lineWidth = 1.8 * u;
    g.beginPath();
    g.ellipse(x, top - 5 * u, 7 * u, 2.4 * u, 0, 0, Math.PI * 2);
    g.stroke();
  });
  grain(c);
  return [cv, gv];
}

/**
 * Draws `draw` on its own sheet, rough like the plaster of the real crib
 * (fine light and dark speckle inside the shape), then pastes it with its
 * shadow. `light` warms it from a point, as the lamps inside the crib do.
 */
function plaster(c: Ctx, x0: number, y0: number, w: number, h: number, draw: (k: Ctx) => void, seed: number, lift = 1, light?: [number, number, number]) {
  const [sc, k] = makeCanvas(w, h);
  k.translate(-x0, -y0);
  draw(k);
  k.setTransform(1, 0, 0, 1, 0, 0);
  k.globalCompositeOperation = 'source-atop';
  const r = seeded(seed);
  for (let n = 0; n < (w * h) / 60; n++) {
    k.fillStyle = r() < 0.5 ? 'rgba(96, 78, 48, 0.11)' : 'rgba(255, 255, 255, 0.2)';
    k.beginPath();
    k.ellipse(r() * w, r() * h, 0.8 + r() * 2.2, 0.6 + r() * 1.4, r() * 3, 0, Math.PI * 2);
    k.fill();
  }
  if (light) {
    const [lx, ly, lr] = light;
    const warmth = k.createRadialGradient(lx - x0, ly - y0, 0, lx - x0, ly - y0, lr);
    warmth.addColorStop(0, 'rgba(255, 190, 90, 0.6)');
    warmth.addColorStop(1, 'rgba(255, 190, 90, 0)');
    k.fillStyle = warmth;
    k.fillRect(0, 0, w, h);
  }
  shadowOnly(c, () => c.drawImage(sc, x0, y0), 2 * lift, 4 * lift, 7 * lift, 0.32);
  c.drawImage(sc, x0, y0);
}
/** Crenellations along the top edge of a wall from x0 to x1 at y. */
function merlons(k: Ctx, x0: number, x1: number, y: number, s: number) {
  for (let x = x0; x + s <= x1 + 0.5; x += s * 2) k.rect(x, y - s, s, s + 1);
}
/** An arched opening: x centre, from y (the sill) up h, w wide. */
function arch(k: Ctx, x: number, y: number, w: number, h: number) {
  k.moveTo(x - w / 2, y);
  k.lineTo(x - w / 2, y - h + w / 2);
  k.arc(x, y - h + w / 2, w / 2, Math.PI, 0);
  k.lineTo(x + w / 2, y);
  k.closePath();
}
/** A paper palm frond (white by default), from (x, y) leaning by `lean`. */
function frond(c: Ctx, x: number, y: number, len: number, lean: number, g?: Ctx, col = '#f1ece0') {
  const tx = x + Math.sin(lean) * len, ty = y - Math.cos(lean) * len;
  const leaf = (c: Ctx) => {
    c.lineWidth = Math.max(1.5, len * 0.05);
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(x + Math.sin(lean) * len * 0.3, ty + len * 0.2, tx, ty);
    // broad leaflets drooping from the rib, longest near the base
    for (let t = 0.22; t <= 0.98; t += 0.095) {
      const bx = x + (tx - x) * t, by = y + (ty - y) * t;
      for (const d of [-1, 1]) {
        const a = lean - Math.PI / 2 + d * 1.0, l = len * 0.36 * (1.1 - t);
        c.moveTo(bx, by);
        c.quadraticCurveTo(bx + Math.cos(a) * l * 0.6, by + Math.sin(a) * l * 0.6 - l * 0.1, bx + Math.cos(a) * l, by + Math.sin(a) * l + l * 0.45);
      }
    }
    c.lineWidth = Math.max(2, len * 0.075);
    c.stroke();
  };
  paste(c, col, () => leaf(c), 0.5);
  // white paper catches the lamplight
  if (g && col === '#f1ece0') glow(g, '#5c5648', 0, () => leaf(g), 1);
}

/** Bethlehem on the far ridge: white flat-roofed houses and towers, their arched windows lit. */
function bethlehem(c: Ctx, g: Ctx, y: (x: number) => number, from: number, to: number, u: number, seed = 57) {
  const r = seeded(seed);
  type House = { x: number; w: number; h: number; tower: boolean };
  const houses: House[] = [];
  for (let x = from; x < to; ) {
    const tower = r() < 0.18;
    const w = (tower ? 5 : 7 + r() * 7) * u, h = (tower ? 17 + r() * 6 : 5 + r() * 8) * u;
    houses.push({ x, w, h, tower });
    x += w * (0.7 + r() * 0.35);
  }
  // the taller ones first, so the low houses stand in front of them
  houses.sort((a, b) => b.h - a.h);
  houses.forEach((hs, n) => {
    const base = Math.max(y(hs.x), y(hs.x + hs.w)) + 6;
    const top = base - hs.h, s = 1.1 * u;
    const lit: (k: Ctx) => void = (k) => {
      k.beginPath();
      const rows = hs.h > 10 * u ? 2 : 1;
      const cols = Math.max(1, Math.floor(hs.w / (3.2 * u)));
      for (let row = 0; row < rows; row++)
        for (let col = 0; col < cols; col++) {
          if ((n + row + col) % 3 === 2) continue;
          arch(k, hs.x + ((col + 0.5) * hs.w) / cols, top + (row + 1) * 4.6 * u, 1.3 * u, 2.6 * u);
        }
      k.fill();
    };
    plaster(c, hs.x - 2, top - s - 2, hs.w + 4, base - top + s + 4, (k) => {
      k.fillStyle = n % 4 === 1 ? PLASTER_SIDE : PLASTER;
      k.beginPath();
      k.rect(hs.x, top, hs.w, base - top);
      if (hs.tower || n % 3 === 0) merlons(k, hs.x, hs.x + hs.w, top, s);
      k.fill();
    }, 70 + n, 0.8);
    c.fillStyle = AMBER;
    lit(c);
    glow(g, WARM, 1.6 * u, () => lit(g), 0.85);
    if (n % 5 === 3) frond(c, hs.x + hs.w * 0.8, top + 1, 7 * u, 0.5 - r(), g);
  });
}

/** A stretch of the town wall on the near hills: crenellated, its low arches lit from behind. */
function townWall(c: Ctx, g: Ctx, from: number, to: number, base: number, u: number) {
  if (to <= from) return;
  const top = base - 13 * u, s = 2.2 * u;
  const holes = (k: Ctx) => {
    k.beginPath();
    for (let x = from + 7 * u; x < to - 4 * u; x += 11 * u) arch(k, x, base - 2 * u, 3.6 * u, 5 * u);
    k.fill();
  };
  plaster(c, from - 2, top - s - 2, to - from + 4, base - top + s + 4, (k) => {
    k.fillStyle = PLASTER;
    k.beginPath();
    k.rect(from, top, to - from, base - top);
    merlons(k, from, to, top, s);
    k.fill();
  }, 101, 1);
  c.fillStyle = AMBER;
  holes(c);
  glow(g, WARM, 2.5 * u, () => holes(g), 0.9);
}

/**
 * The campus gate at Kengeri: a broad grey arch on two pillars, CHRIST across
 * its top, a clock on the right pillar, iron gates between them.
 */
function gate(c: Ctx, x: number, base: number, u: number) {
  const GREY = '#5f6670', top = base - 66 * u;
  // the iron gates, behind the arch
  c.strokeStyle = '#2d3440';
  c.lineWidth = 0.7 * u;
  c.beginPath();
  for (let gx = x - 34 * u; gx <= x + 34 * u; gx += 2.6 * u) {
    const h = 24 * u + 6 * u * Math.cos(((gx - x) / (34 * u)) * (Math.PI / 2)) ** 2;
    c.moveTo(gx, base);
    c.lineTo(gx, base - h);
  }
  c.stroke();
  c.lineWidth = 1 * u;
  c.beginPath();
  c.moveTo(x - 34 * u, base - 10 * u);
  c.lineTo(x + 34 * u, base - 10 * u);
  c.moveTo(x - 34 * u, base - 22 * u);
  c.quadraticCurveTo(x - 17 * u, base - 32 * u, x, base - 30 * u);
  c.quadraticCurveTo(x + 17 * u, base - 32 * u, x + 34 * u, base - 22 * u);
  c.stroke();
  // the pillars and the arch, one cut
  paste(c, GREY, () => {
    c.beginPath();
    c.moveTo(x - 46 * u, base);
    c.lineTo(x - 44 * u, base - 50 * u);
    c.quadraticCurveTo(x - 40 * u, top - 4 * u, x, top - 6 * u);
    c.quadraticCurveTo(x + 40 * u, top - 4 * u, x + 44 * u, base - 50 * u);
    c.lineTo(x + 46 * u, base);
    c.lineTo(x + 36 * u, base);
    c.lineTo(x + 36 * u, base - 46 * u);
    c.quadraticCurveTo(x + 32 * u, top + 6 * u, x, top + 5 * u);
    c.quadraticCurveTo(x - 32 * u, top + 6 * u, x - 36 * u, base - 46 * u);
    c.lineTo(x - 36 * u, base);
    c.closePath();
    c.fill();
  }, 1.4);
  // a lighter face along the arch's top edge
  c.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  c.lineWidth = 1.2 * u;
  c.beginPath();
  c.moveTo(x - 44 * u, base - 50 * u);
  c.quadraticCurveTo(x - 40 * u, top - 3 * u, x, top - 5 * u);
  c.quadraticCurveTo(x + 40 * u, top - 3 * u, x + 44 * u, base - 50 * u);
  c.stroke();
  // the lettering
  c.fillStyle = '#f1dfaa';
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';
  c.font = `700 ${9.5 * u}px Georgia, 'Times New Roman', serif`;
  c.fillText('CHRIST', x, top - 8.5 * u);
  c.font = `700 ${2.8 * u}px Georgia, 'Times New Roman', serif`;
  c.fillText('DEEMED TO BE UNIVERSITY', x, top + 0.6 * u);
  // the clock on the right pillar, a carved panel on the left
  c.fillStyle = '#f4efe2';
  c.beginPath();
  c.arc(x + 41 * u, base - 44 * u, 2.6 * u, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#2d3440';
  c.lineWidth = 0.45 * u;
  c.beginPath();
  c.moveTo(x + 41 * u, base - 44 * u);
  c.lineTo(x + 41 * u, base - 45.8 * u);
  c.moveTo(x + 41 * u, base - 44 * u);
  c.lineTo(x + 42.3 * u, base - 43.4 * u);
  c.stroke();
  c.strokeStyle = 'rgba(255, 255, 255, 0.16)';
  c.lineWidth = 0.6 * u;
  c.beginPath();
  for (let k = 0; k < 4; k++) {
    const yy = base - (14 + k * 8) * u;
    c.moveTo(x - 44 * u, yy);
    c.quadraticCurveTo(x - 41 * u, yy - 3 * u, x - 38 * u, yy);
  }
  c.stroke();
}

/** The fountain before the PU block: yellow tiers on a stem, a round pool, flower beds. Lit at night. */
function fountain(c: Ctx, g: Ctx | null, x: number, base: number, u: number) {
  const YEL = '#eebd3d', WATER = g ? '#5f86b8' : '#8fd0e6';
  // flower beds either side
  const r = seeded(303);
  for (let k = 0; k < 26; k++) {
    const side = k % 2 ? 1 : -1, fx = x + side * (14 + r() * 14) * u, fy = base - r() * 3 * u;
    c.fillStyle = k % 5 === 0 ? (g ? '#3b5a3a' : '#5e9b55') : g ? '#a68a3a' : r() < 0.7 ? '#f6c62c' : '#f39a2b';
    c.beginPath();
    c.arc(fx, fy, (1.2 + r() * 1.1) * u, 0, Math.PI * 2);
    c.fill();
  }
  // the pool
  paste(c, YEL, () => {
    c.beginPath();
    c.ellipse(x, base - 2 * u, 15 * u, 4 * u, 0, 0, Math.PI * 2);
    c.fill();
  }, 0.8);
  c.fillStyle = WATER;
  c.beginPath();
  c.ellipse(x, base - 2.6 * u, 13 * u, 2.8 * u, 0, 0, Math.PI * 2);
  c.fill();
  // stem and tiers
  paste(c, YEL, () => {
    c.beginPath();
    c.rect(x - 1.4 * u, base - 36 * u, 2.8 * u, 34 * u);
    for (const [y, w] of [[14, 10], [24, 7], [32, 4]]) {
      c.moveTo(x - w * u, base - y * u);
      c.quadraticCurveTo(x, base - (y - 4) * u, x + w * u, base - y * u);
      c.closePath();
    }
    c.moveTo(x + 1.6 * u, base - 37 * u);
    c.arc(x, base - 37 * u, 1.6 * u, 0, Math.PI * 2);
    c.fill();
  }, 0.9);
  // the water, falling from each tier
  const falls = (k: Ctx) => {
    k.beginPath();
    for (const [y, w] of [[14, 10], [24, 7], [32, 4]])
      for (const s of [-1, 1]) {
        k.moveTo(x + s * w * u, base - y * u);
        k.quadraticCurveTo(x + s * (w + 2) * u, base - (y - 3) * u, x + s * (w + 1.5) * u, base - (y - 10 > 2 ? y - 10 : 3) * u);
      }
    k.moveTo(x, base - 38.5 * u);
    k.lineTo(x, base - 43 * u);
    k.stroke();
  };
  c.strokeStyle = g ? 'rgba(210, 228, 255, 0.85)' : 'rgba(255, 255, 255, 0.9)';
  c.lineWidth = 0.7 * u;
  falls(c);
  if (g) {
    g.strokeStyle = g.fillStyle = '#9fc4ff';
    g.lineWidth = 0.9 * u;
    glow(g, '#a6c8ff', 2 * u, () => falls(g), 0.8);
    const pool = g.createRadialGradient(x, base - 3 * u, 0, x, base - 3 * u, 16 * u);
    pool.addColorStop(0, 'rgba(255, 210, 130, 0.55)');
    pool.addColorStop(1, 'rgba(255, 210, 130, 0)');
    g.fillStyle = pool;
    g.fillRect(x - 16 * u, base - 20 * u, 32 * u, 20 * u);
  }
}

/**
 * The crib, after the one ACC builds: a crenellated plaster tower with three
 * arched windows, a house with a deep arch on each side, white paper palms,
 * and the Holy Family as white statues in the lamplight, their shadows large
 * on the wall behind them. A sheep beside them.
 */
function crib(c: Ctx, g: Ctx, x: number, base: number, u: number) {
  const s = 2.4 * u;
  // the side houses
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? x - 46 * u : x + 22 * u, x1 = x0 + 24 * u, top = base - 40 * u;
    plaster(c, x0 - 2, top - 2, x1 - x0 + 4, base - top + 4, (k) => {
      k.fillStyle = PLASTER_SIDE;
      k.fillRect(x0, top, x1 - x0, base - top);
      // the deep arch, lit inside
      k.fillStyle = '#e9b866';
      k.beginPath();
      arch(k, (x0 + x1) / 2, base, 16 * u, 30 * u);
      k.fill();
    }, side < 0 ? 121 : 122, 0.9, [(x0 + x1) / 2, base - 12 * u, 22 * u]);
    glow(g, AMBER, 4 * u, () => {
      g.beginPath();
      arch(g, (x0 + x1) / 2, base, 14 * u, 27 * u);
      g.fill();
    }, 0.5);
  }
  frond(c, x - 44 * u, base - 40 * u, 22 * u, -0.75, g);
  frond(c, x - 39 * u, base - 40 * u, 18 * u, -0.3, g);
  frond(c, x + 43 * u, base - 40 * u, 20 * u, 0.65, g);

  // the tower, warm from the lamps at its foot
  const tTop = base - 64 * u;
  plaster(c, x - 24 * u, tTop - s - 2, 48 * u, 64 * u + s + 4, (k) => {
    k.fillStyle = PLASTER;
    k.beginPath();
    k.rect(x - 22 * u, tTop, 44 * u, base - tTop);
    merlons(k, x - 22 * u, x + 22 * u, tTop, s);
    k.fill();
  }, 123, 1.2, [x, base - 8 * u, 40 * u]);
  const windows = (k: Ctx) => {
    k.beginPath();
    for (const wx of [-13, 0, 13]) arch(k, x + wx * u, tTop + 20 * u, 5 * u, 10 * u);
    k.fill();
  };
  c.fillStyle = '#f7e9c8';
  windows(c);
  glow(g, '#ffe2a6', 2.5 * u, () => windows(g), 0.55);

  // the statues' shadows, thrown large on the tower by the lamps below
  c.save();
  c.fillStyle = 'rgba(70, 52, 30, 0.3)';
  c.filter = `blur(${1.2 * u}px)`;
  c.beginPath();
  c.ellipse(x - 9 * u, base - 30 * u, 6 * u, 14 * u, 0.25, 0, Math.PI * 2);
  c.ellipse(x - 7 * u, base - 44 * u, 4 * u, 4.5 * u, 0, 0, Math.PI * 2);
  c.ellipse(x + 12 * u, base - 34 * u, 6 * u, 18 * u, -0.15, 0, Math.PI * 2);
  c.ellipse(x + 13 * u, base - 53 * u, 4 * u, 4.5 * u, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();

  // the Holy Family, white statues
  // each statue is pasted, and glows faintly, as white plaster does in the lamplight
  const statue = (draw: () => void) => {
    paste(c, STATUE, draw, 0.7, 'rgba(255, 255, 255, 0.7)');
    // the shapes draw on `c`: point it at the glow sheet for a moment
    const was = c;
    c = g;
    glow(g, '#6a6150', 0, draw, 1);
    c = was;
  };
  // Mary, kneeling, veiled
  statue(() => {
    c.beginPath();
    c.moveTo(x - 20 * u, base);
    c.quadraticCurveTo(x - 21 * u, base - 14 * u, x - 15 * u, base - 19 * u);
    c.arc(x - 13 * u, base - 21 * u, 4.6 * u, Math.PI * 0.9, Math.PI * 0.1);
    c.quadraticCurveTo(x - 8 * u, base - 12 * u, x - 6 * u, base);
    c.closePath();
    c.fill();
  });
  // Joseph, standing with his staff
  statue(() => {
    c.beginPath();
    c.moveTo(x + 9 * u, base);
    c.lineTo(x + 11 * u, base - 24 * u);
    c.arc(x + 14.5 * u, base - 27 * u, 4 * u, Math.PI, 0);
    c.lineTo(x + 19 * u, base);
    c.closePath();
    c.fill();
    c.fillRect(x + 21 * u, base - 32 * u, 1.3 * u, 32 * u);
  });
  // the manger and the child
  statue(() => {
    c.beginPath();
    c.moveTo(x - 6 * u, base - 8 * u);
    c.lineTo(x + 6 * u, base - 8 * u);
    c.lineTo(x + 4.5 * u, base);
    c.lineTo(x - 4.5 * u, base);
    c.closePath();
    c.fill();
    c.beginPath();
    c.ellipse(x, base - 9.5 * u, 4.6 * u, 2.2 * u, 0, 0, Math.PI * 2);
    c.arc(x + 3.6 * u, base - 10.5 * u, 1.9 * u, 0, Math.PI * 2);
    c.fill();
  });
  // soft shading on the statues, from the lamp in front of them
  c.save();
  c.globalCompositeOperation = 'source-atop';
  c.fillStyle = 'rgba(150, 120, 80, 0.16)';
  c.fillRect(x - 21 * u, base - 4 * u, 42 * u, 4 * u);
  c.restore();
  glow(g, '#ffe7b0', 3 * u, () => {
    g.lineWidth = 0.7 * u;
    g.beginPath();
    g.arc(x + 3.6 * u, base - 10.5 * u, 3.2 * u, 0, Math.PI * 2);
    g.stroke();
  }, 0.9);
  // the lamp light pooled at their feet
  const pool = g.createRadialGradient(x, base - 4 * u, 0, x, base - 4 * u, 26 * u);
  pool.addColorStop(0, 'rgba(255, 196, 110, 0.4)');
  pool.addColorStop(1, 'rgba(255, 196, 110, 0)');
  g.fillStyle = pool;
  g.fillRect(x - 26 * u, base - 30 * u, 52 * u, 30 * u);
  // a sheep, a statue too
  const sx = x + 33 * u, sy = base - 4 * u;
  statue(() => {
    c.beginPath();
    for (const [dx, dy, rr] of [[-3, 0, 3.2], [0, -1.6, 3.6], [3, 0, 3.2], [0, 1.4, 3]]) {
      c.moveTo(sx + (dx + rr) * u, sy + dy * u);
      c.arc(sx + dx * u, sy + dy * u, rr * u, 0, Math.PI * 2);
    }
    c.ellipse(sx + 6 * u, sy - 2.4 * u, 2.1 * u, 1.6 * u, 0.3, 0, Math.PI * 2);
    c.fill();
  });
}

function poinsettia(c: Ctx, x: number, y: number, r: number) {
  paste(c, XRED, () => {
    c.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 - Math.PI / 2;
      c.moveTo(x, y);
      c.quadraticCurveTo(x + Math.cos(a - 0.4) * r * 0.7, y + Math.sin(a - 0.4) * r * 0.7, x + Math.cos(a) * r, y + Math.sin(a) * r);
      c.quadraticCurveTo(x + Math.cos(a + 0.4) * r * 0.7, y + Math.sin(a + 0.4) * r * 0.7, x, y);
    }
    c.fill();
  }, 0.7);
  c.fillStyle = GOLD;
  c.beginPath();
  c.arc(x, y, r * 0.18, 0, Math.PI * 2);
  c.fill();
}
function candle(c: Ctx, g: Ctx, x: number, y: number, h: number) {
  paste(c, CREAM, () => {
    c.beginPath();
    c.rect(x - h * 0.13, y - h, h * 0.26, h);
    c.fill();
  }, 0.5);
  const flame = (k: Ctx) => {
    k.beginPath();
    k.moveTo(x, y - h - h * 0.5);
    k.quadraticCurveTo(x + h * 0.16, y - h - h * 0.14, x, y - h - h * 0.04);
    k.quadraticCurveTo(x - h * 0.16, y - h - h * 0.14, x, y - h - h * 0.5);
    k.fill();
  };
  c.fillStyle = WARM;
  flame(c);
  glow(g, '#ffc860', h * 0.8, () => flame(g));
}

/** Small sheets for the friends at night: a red cap, a striped scarf. */
const CAP_W = 170, CAP_H = 150, SCARF_W = 150, SCARF_H = 130; // friend texture px
function paintCap(): HTMLCanvasElement {
  const [cv, c] = makeCanvas(CAP_W, CAP_H);
  atNight(() => {
    paste(c, XRED, () => {
      c.beginPath();
      c.moveTo(18, 122);
      c.quadraticCurveTo(40, 20, 104, 18);
      c.quadraticCurveTo(146, 22, 150, 64);
      c.quadraticCurveTo(140, 48, 120, 50);
      c.quadraticCurveTo(150, 80, 154, 122);
      c.closePath();
      c.fill();
    }, 0.8);
    paste(c, CREAM, () => {
      c.beginPath();
      c.roundRect(8, 106, 154, 32, 16);
      c.arc(150, 66, 15, 0, Math.PI * 2);
      c.fill();
    }, 0.6);
  });
  grain(c);
  return cv;
}
function paintScarf(): HTMLCanvasElement {
  const [cv, c] = makeCanvas(SCARF_W, SCARF_H);
  atNight(() => {
    const scarf = () => {
      c.beginPath();
      c.roundRect(14, 6, 122, 28, 14);
      c.moveTo(88, 24);
      c.lineTo(114, 24);
      c.lineTo(122, 118);
      c.lineTo(98, 120);
      c.closePath();
      c.fill();
    };
    paste(c, XRED, scarf, 0.7);
    c.save();
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = CREAM;
    for (let x = 22; x < 140; x += 18) c.fillRect(x, 0, 7, 36);
    for (let y = 44; y < 120; y += 18) c.fillRect(80, y, 60, 6);
    c.restore();
  });
  grain(c);
  return cv;
}
function paintFlake(): HTMLCanvasElement {
  const [cv, c] = makeCanvas(32, 32);
  c.fillStyle = '#f2f6fd';
  starPath(c, 16, 16, 14, 5, 6);
  c.fill();
  c.beginPath();
  c.arc(16, 16, 6, 0, Math.PI * 2);
  c.fill();
  return cv;
}

/** The friends at night: a red cap (on the hair sheet, with its own white backing) and a striped scarf. */
function dressForNight(cv: HTMLCanvasElement, wave: boolean) {
  const out = cv.getContext('2d')!;
  const cap = paintCap(), scarf = paintScarf();
  const [bc, b] = makeCanvas(CAP_W, CAP_H);
  b.drawImage(cap, 0, 0);
  b.globalCompositeOperation = 'source-in';
  b.fillStyle = SHEET;
  b.fillRect(0, 0, CAP_W, CAP_H);
  const capX = CX - CAP_W / 2, capY = 54;
  for (let i = 0; i < N; i++) {
    const col = (l: number) => (i * LAYERS + l) * CW;
    for (let a = 0; a < 8; a++) out.drawImage(bc, col(0) + capX + 8 * Math.cos((a * Math.PI) / 4), capY + 8 * Math.sin((a * Math.PI) / 4));
    out.drawImage(scarf, col(1) + CX - SCARF_W / 2, 250);
    if (!wave) out.drawImage(cap, col(2) + capX, capY);
  }
}

/* ---------------- the friends ---------------- */

const CW = 320, CH = 800; // texture px per sheet
const PW = NARROW ? 0.36 : 0.38; // panel width in scene units: hand to hand
const FOOT = 790; // texture row the feet stand on (scene y = 0)
const HAND = 432; // texture row of the joined hands (the fold)
const LAYERS = 3; // backing, figure, hair
const GAP = 0.006; // between sheets
const CX = CW / 2;

interface Friend {
  hair: 'long' | 'short' | 'pony' | 'curly';
  hairCol: string;
  skin: string;
  top: string;
  bottom: string;
  shoes: string;
  skirt?: boolean;
  tunic?: boolean;
  pattern: 'dots' | 'stripes' | 'yoke' | 'none';
  extra?: 'band' | 'clip' | 'tote';
}
const EVERYONE: Friend[] = [
  { hair: 'long', hairCol: '#2a1b15', skin: '#a8714c', top: CORAL, bottom: CORAL, shoes: BUTTER, skirt: true, pattern: 'dots', extra: 'band' },
  { hair: 'short', hairCol: '#1d1512', skin: '#7a4a2e', top: SKY, bottom: DEEP, shoes: CORAL, pattern: 'stripes' },
  { hair: 'pony', hairCol: '#3a2419', skin: '#c48a60', top: BUTTER, bottom: TEAL, shoes: SHEET, tunic: true, pattern: 'yoke', extra: 'clip' },
  { hair: 'curly', hairCol: '#2a1b15', skin: '#8f5a3a', top: SEAFOAM, bottom: DEEP, shoes: PEACH, pattern: 'none', extra: 'tote' },
];
const FRIENDS = NARROW ? EVERYONE.slice(0, 3) : EVERYONE;
const N = FRIENDS.length;
const MID = (N - 1) / 2;

function torso(c: Ctx, f: Friend, g: number) {
  const low = f.tunic ? 560 : 468;
  const flare = f.tunic ? 62 : 44;
  c.beginPath();
  c.moveTo(CX - 60 - g, 304);
  c.quadraticCurveTo(CX - 62 - g, 278 - g, CX - 38, 276 - g);
  c.lineTo(CX + 38, 276 - g);
  c.quadraticCurveTo(CX + 62 + g, 278 - g, CX + 60 + g, 304);
  c.lineTo(CX + 44 + g, 440);
  c.lineTo(CX + flare + g, low + g);
  c.lineTo(CX - flare - g, low + g);
  c.lineTo(CX - 44 - g, 440);
  c.closePath();
}
function skirt(c: Ctx, g: number) {
  c.beginPath();
  c.moveTo(CX - 44 - g, 436);
  c.lineTo(CX + 44 + g, 436);
  c.quadraticCurveTo(CX + 80 + g, 540, CX + 104 + g, 640 + g);
  c.quadraticCurveTo(CX, 656 + g, CX - 104 - g, 640 + g);
  c.quadraticCurveTo(CX - 80 - g, 540, CX - 44 - g, 436);
  c.closePath();
}
function legs(c: Ctx, f: Friend, g: number) {
  c.lineCap = 'round';
  c.beginPath();
  if (f.skirt) {
    c.lineWidth = 24 + 2 * g;
    c.moveTo(CX - 24, 600);
    c.lineTo(CX - 26, 762);
    c.moveTo(CX + 24, 600);
    c.lineTo(CX + 26, 762);
  } else {
    c.lineWidth = 38 + 2 * g;
    c.moveTo(CX - 21, 452);
    c.lineTo(CX - 26, 760);
    c.moveTo(CX + 21, 452);
    c.lineTo(CX + 26, 760);
  }
  c.stroke();
}
function feet(c: Ctx, g: number) {
  c.beginPath();
  c.ellipse(CX - 34, 773, 25 + g, 14 + g, 0, 0, Math.PI * 2);
  c.moveTo(CX + 34 + 25 + g, 773);
  c.ellipse(CX + 34, 773, 25 + g, 14 + g, 0, 0, Math.PI * 2);
  c.fill();
}
/** Both arms, reaching out to the fold on each side (`skip` leaves one out). `part` < 1 draws just the sleeves. */
function arms(c: Ctx, g: number, width = 30, part = 1, skip = 0) {
  c.lineCap = 'round';
  c.lineWidth = width + 2 * g;
  c.beginPath();
  for (const s of [-1, 1]) {
    if (s === skip) continue;
    const x0 = CX + s * 46, y0 = 300, x1 = s < 0 ? -4 : CW + 4, y1 = HAND;
    c.moveTo(x0, y0);
    c.lineTo(lerp(x0, x1, part), lerp(y0, y1, part));
  }
  c.stroke();
}
function hands(c: Ctx, g: number, skip = 0) {
  c.beginPath();
  if (skip !== -1) c.arc(0, HAND, 20 + g, 0, Math.PI * 2);
  c.moveTo(CW + 20 + g, HAND);
  if (skip !== 1) c.arc(CW, HAND, 20 + g, 0, Math.PI * 2);
  c.fill();
}
/** The side a friend lets go of to wave: the free end of the chain, else the outer side. */
const waveSide = (i: number) => (i === 0 ? -1 : i === N - 1 ? 1 : i < (N - 1) / 2 ? -1 : 1);
/** A waving arm, on its own sheet: straight up from the shoulder pivot. */
const PIVOT = 600; // texture row of the shoulder on the arm's sheet
const ARM = 174; // shoulder to the middle of the hand, in texture px
function loneArm(c: Ctx, g: number, from = 0, part = 1, width = 30) {
  c.lineCap = 'round';
  c.lineWidth = width + 2 * g;
  c.beginPath();
  c.moveTo(CX, PIVOT - from);
  c.lineTo(CX, PIVOT - ARM * part);
  c.stroke();
  if (part === 1) {
    c.beginPath();
    c.arc(CX, PIVOT - ARM, 20 + g, 0, Math.PI * 2);
    c.fill();
  }
}
function hairShape(c: Ctx, f: Friend, g: number) {
  c.beginPath();
  switch (f.hair) {
    case 'long':
      c.ellipse(CX, 200, 56 + g, 56 + g, 0, Math.PI, 0);
      c.lineTo(CX + 58 + g, 330 + g);
      c.quadraticCurveTo(CX + 40, 342 + g, CX + 26, 306);
      c.lineTo(CX - 26, 306);
      c.quadraticCurveTo(CX - 40, 342 + g, CX - 58 - g, 330 + g);
      c.closePath();
      break;
    case 'short':
      c.ellipse(CX, 196, 51 + g, 44 + g, 0, 0, Math.PI * 2);
      break;
    case 'pony':
      c.ellipse(CX, 196, 51 + g, 45 + g, 0, 0, Math.PI * 2);
      c.moveTo(CX + 60, 186);
      c.ellipse(CX + 68, 222, 20 + g, 40 + g, -0.35, 0, Math.PI * 2);
      break;
    case 'curly':
      for (let k = 0; k <= 9; k++) {
        const a = Math.PI * (1.08 - k * 0.129);
        const x = CX + Math.cos(a) * 46, y = 204 - Math.sin(a) * 44;
        c.moveTo(x + 19 + g, y);
        c.arc(x, y, 19 + g, 0, Math.PI * 2);
      }
      break;
  }
  c.fill();
}
const faceTop = (f: Friend) => (f.hair === 'curly' ? 214 : f.hair === 'long' ? 206 : 212);
/** Where the face shows through the hair. */
function face(c: Ctx, f: Friend) {
  c.beginPath();
  c.ellipse(CX, faceTop(f) + 16, 39, 38, 0, 0, Math.PI * 2);
  c.fill();
}
/** The whole silhouette, dilated by g px: the white backing, and the base of the figure. */
function silhouette(c: Ctx, f: Friend, g: number, withHair: boolean, skip = 0) {
  c.beginPath();
  c.arc(CX, 205, 46 + g, 0, Math.PI * 2);
  c.fill();
  c.fillRect(CX - 14 - g, 238, 28 + 2 * g, 50);
  torso(c, f, g);
  c.fill();
  if (f.skirt) {
    skirt(c, g);
    c.fill();
  }
  arms(c, g, 30, 1, skip);
  hands(c, g, skip);
  legs(c, f, g);
  feet(c, g);
  if (withHair) hairShape(c, f, g);
}

/**
 * One texture: for each friend, three columns (backing, figure, hair). The
 * waving variant paints the backing and figure without the waving arm, and
 * the loose arm in the third column instead of the hair.
 */
function paintFriends(wave = false): HTMLCanvasElement {
  const [cv, out] = makeCanvas(CW * LAYERS * N, CH);
  const sheet = (i: number, l: number, paint: (x: Ctx) => void) => {
    const [lc, x] = makeCanvas(CW, CH);
    paint(x);
    grain(x);
    out.drawImage(lc, (i * LAYERS + l) * CW, 0);
  };

  FRIENDS.forEach((f, i) => {
    const skip = wave ? waveSide(i) : 0;
    // 0: the white backing, cut a little larger than the figure, like a sticker
    sheet(i, 0, (x) => {
      x.fillStyle = x.strokeStyle = SHEET;
      silhouette(x, f, 10, true, skip);
      x.globalCompositeOperation = 'source-atop';
      shadowOnly(x, () => {
        x.fillStyle = x.strokeStyle = '#000';
        silhouette(x, f, 0, true, skip);
      }, 4, 7, 11, 0.3);
    });

    // 1: the figure, cut from paper the colour of their skin, clothes pasted on
    sheet(i, 1, (x) => {
      x.fillStyle = x.strokeStyle = f.skin;
      silhouette(x, f, 0, false, skip);
      x.globalCompositeOperation = 'source-atop';
      // A pasted piece: drawn in its own scratch sheet (so a pattern stays
      // inside it), then its shadow, then the piece itself.
      const pasted = (fill: string, draw: (c: Ctx) => void, pattern?: (c: Ctx) => void) => {
        const [pc, p] = makeCanvas(CW, CH);
        p.fillStyle = p.strokeStyle = fill;
        draw(p);
        if (pattern) {
          p.save();
          p.globalCompositeOperation = 'source-atop';
          pattern(p);
          p.restore();
        }
        shadowOnly(x, () => x.drawImage(pc, 0, 0), 2, 4, 7, 0.3);
        x.drawImage(pc, 0, 0);
      };

      if (!f.skirt) pasted(f.bottom, (c) => legs(c, f, 0));
      // shoes, with a pale sole
      pasted(f.shoes, (c) => feet(c, 0), (c) => {
        c.fillStyle = 'rgba(255,255,255,0.75)';
        c.fillRect(0, 780, CW, 10);
      });
      const pattern = (c: Ctx) => {
        if (f.pattern === 'dots') {
          c.fillStyle = 'rgba(251,253,252,0.9)';
          for (let yy = 284; yy < 660; yy += 26)
            for (let xx = (yy / 26) % 2 ? 28 : 41; xx < CW; xx += 26) {
              c.beginPath();
              c.arc(xx, yy, 4.2, 0, Math.PI * 2);
              c.fill();
            }
        } else if (f.pattern === 'stripes') {
          c.fillStyle = 'rgba(251,253,252,0.85)';
          for (let yy = 292; yy < 480; yy += 22) c.fillRect(0, yy, CW, 8);
        } else if (f.pattern === 'yoke') {
          c.fillStyle = TEAL;
          for (let k = 0; k <= 8; k++) {
            const a = Math.PI * (0.1 + (k / 8) * 0.8);
            c.beginPath();
            c.arc(CX + Math.cos(a) * 30, 278 + Math.sin(a) * 26, 3.6, 0, Math.PI * 2);
            c.fill();
          }
          c.fillRect(CX - 2, 304, 4, 70);
          c.fillRect(0, 534, CW, 6);
        }
      };
      if (f.skirt)
        pasted(f.top, (c) => {
          skirt(c, 0);
          c.fill();
        }, pattern);
      pasted(f.top, (c) => {
        torso(c, f, 0);
        c.fill();
        arms(c, 0, 32, 0.42, skip);
      }, pattern);
      if (f.extra === 'tote') {
        // a tote: strap across the body, the bag at the hip
        pasted(CORAL, (c) => {
          c.lineWidth = 9;
          c.beginPath();
          c.moveTo(CX - 40, 284);
          c.lineTo(CX + 52, 470);
          c.stroke();
          c.beginPath();
          c.moveTo(CX + 30, 462);
          c.lineTo(CX + 92, 456);
          c.lineTo(CX + 98, 540);
          c.lineTo(CX + 30, 546);
          c.closePath();
          c.fill();
        }, (c) => {
          c.fillStyle = 'rgba(11,63,67,0.18)';
          c.fillRect(CX + 30, 474, 70, 4);
        });
      }
      // the face: two eyes, a smile, warm cheeks
      const fy = faceTop(f) + 16;
      x.fillStyle = 'rgba(243, 160, 140, 0.75)';
      x.beginPath();
      x.arc(CX - 22, fy + 14, 7, 0, Math.PI * 2);
      x.arc(CX + 22, fy + 14, 7, 0, Math.PI * 2);
      x.fill();
      x.fillStyle = DEEP;
      x.beginPath();
      x.arc(CX - 13, fy + 4, 3.8, 0, Math.PI * 2);
      x.moveTo(CX + 17, fy + 4);
      x.arc(CX + 13, fy + 4, 3.8, 0, Math.PI * 2);
      x.fill();
      x.strokeStyle = DEEP;
      x.lineWidth = 3;
      x.beginPath();
      x.arc(CX, fy + 13, 9, 0.2 * Math.PI, 0.8 * Math.PI);
      x.stroke();
      // the hair's shadow on the face
      const [hc, h] = makeCanvas(CW, CH);
      h.fillStyle = '#000';
      hairShape(h, f, 0);
      h.globalCompositeOperation = 'destination-out';
      face(h, f);
      shadowOnly(x, () => x.drawImage(hc, 0, 0), 2, 3, 6, 0.24);
    });

    // 2 (waving): the loose arm, with its own white rim beyond the shoulder,
    // skin, and a sleeve in the colour of their top
    if (wave) {
      sheet(i, 2, (x) => {
        x.fillStyle = x.strokeStyle = SHEET;
        loneArm(x, 10, 46);
        x.globalCompositeOperation = 'source-atop';
        shadowOnly(x, () => {
          x.fillStyle = x.strokeStyle = '#000';
          loneArm(x, 0);
        }, 3, 5, 9, 0.28);
        x.globalCompositeOperation = 'source-over';
        x.fillStyle = x.strokeStyle = f.skin;
        loneArm(x, 0);
        x.strokeStyle = f.top;
        shadowOnly(x, () => {
          x.strokeStyle = '#000';
          loneArm(x, 0, 0, 0.42, 32);
        }, 0, 3, 5, 0.22);
        x.strokeStyle = f.top;
        loneArm(x, 0, 0, 0.42, 32);
      });
      return;
    }

    // 2: the hair, with the face cut out, and a headband or clip
    sheet(i, 2, (x) => {
      x.fillStyle = f.hairCol;
      hairShape(x, f, 0);
      x.globalCompositeOperation = 'destination-out';
      face(x, f);
      x.globalCompositeOperation = 'source-over';
      // a soft sheen across the crown
      x.save();
      x.globalCompositeOperation = 'source-atop';
      x.strokeStyle = 'rgba(255,255,255,0.13)';
      x.lineWidth = 6;
      x.beginPath();
      x.arc(CX, 214, 38, Math.PI * 1.15, Math.PI * 1.55);
      x.stroke();
      x.restore();
      if (f.extra === 'band') {
        paste(x, BUTTER, () => {
          x.lineWidth = 9;
          x.beginPath();
          x.arc(CX, 214, 50, Math.PI * 1.1, Math.PI * 1.9);
          x.stroke();
        }, 0.5);
      } else if (f.extra === 'clip') {
        paste(x, CORAL, () => {
          x.beginPath();
          x.ellipse(CX + 44, 176, 12, 6, -0.6, 0, Math.PI * 2);
          x.fill();
        }, 0.5);
      }
    });
  });
  return cv;
}

/* ---------------- the chain ---------------- */

interface Pose {
  x: Float32Array; // hinge positions
  z: Float32Array;
  psi: Float32Array; // panel directions
}

/** The strip at opening o (0 folded, 1 open), gathered by g. */
function chainAt(o: number, g: number, sway: (i: number) => number, P: Pose): Pose {
  const mu = lerp(1.2, 0, ease(o)); // the strip's mean direction: toward us when folded
  const beta = lerp(1.32, 0.36, o) - 0.12 * g; // half the fold between panels
  const kap = 0.2 * g; // the gathering arc
  let x = 0, z = 0, sx = 0, sz = 0;
  P.x[0] = 0;
  P.z[0] = 0;
  for (let i = 0; i < N; i++) {
    // the front panel of the folded stack (the last) always shows its face
    const psi = mu + ((N - 1 - i) % 2 ? beta : -beta) + kap * (i - MID) + sway(i);
    P.psi[i] = psi;
    x += Math.cos(psi) * PW;
    z += Math.sin(psi) * PW;
    P.x[i + 1] = x;
    P.z[i + 1] = z;
  }
  for (let i = 0; i <= N; i++) {
    sx += P.x[i];
    sz += P.z[i];
  }
  sx /= N + 1;
  sz /= N + 1;
  for (let i = 0; i <= N; i++) {
    P.x[i] -= sx;
    P.z[i] -= sz;
  }
  return P;
}
const newPose = (): Pose => ({ x: new Float32Array(N + 1), z: new Float32Array(N + 1), psi: new Float32Array(N) });

/* ---------------- the story ---------------- */

/** Opening angle of the card (radians) at scroll progress p. */
const angleAt = (p: number) => lerp(0.86, Math.PI / 2, ease(smooth(0.0, 0.62, p)));
/** How far the chain has unfolded, and how much it has gathered. */
const chainOpen = (p: number) => lerp(0.32, 1, smooth(0.08, 0.66, p));
const chainGather = (p: number) => smooth(0.6, 0.92, p);

/* ---------------- the scene ---------------- */

export function initHeroScene(root: HTMLElement): boolean {
  const canvas = root.querySelector<HTMLCanvasElement>('.hs__canvas');
  const stage = root.querySelector<HTMLElement>('.hs__stage');
  if (!canvas || !stage) return false;

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: import.meta.env.DEV,
    });
  } catch {
    return false;
  }
  renderer.setClearColor(0x000000, 0);
  setup(root, canvas, stage, renderer).catch(() => root.classList.add('hs--static'));
  return true;
}

const breathe = () => new Promise<void>((r) => setTimeout(r, 0));

/** A layer standing on the card: a group that is posed as a parallel fold at depth d. */
interface Layer {
  g: Group;
  d: number;
  lift?: (t: number, p: number) => number; // extra height (the dove's spring)
  press?: Spring; // pressed back, then springing up again
}

/** Builds the scene, paints, compiles and uploads it over several tasks, then runs it. */
async function setup(root: HTMLElement, canvas: HTMLCanvasElement, stage: HTMLElement, renderer: WebGLRenderer) {
  const small = Math.min(window.innerWidth, window.innerHeight) < 600;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  const scene = new Scene();
  const textures: CanvasTexture[] = [];
  const texture = (cv: HTMLCanvasElement) => {
    const t = new CanvasTexture(cv);
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    textures.push(t);
    return t;
  };
  // What glows at night (lanterns, windows, the star) is an emissive map. By
  // day it is a black one, so swapping papers never recompiles a shader.
  const black = texture(makeCanvas(2, 2)[0]);
  const glowing: MeshLambertMaterial[] = [];
  const material = (cv: HTMLCanvasElement, cut = true, glows = false): MeshLambertMaterial => {
    const t = texture(cv);
    // Soft cut edges: blended alpha, with a low alpha test so the shadows
    // keep the same outline.
    const m = new MeshLambertMaterial(cut ? { map: t, alphaTest: 0.08, side: DoubleSide, transparent: true } : { map: t });
    if (glows) {
      m.emissive.set(0xffffff);
      m.emissiveMap = black;
      m.emissiveIntensity = 0;
      glowing.push(m);
    }
    return m;
  };
  if (import.meta.env.DEV && /[?&]night\b/.test(location.search)) document.documentElement.dataset.theme = 'night';

  // Paint the papers over several tasks so none of them blocks for long.
  const skyM = material(paintSky(), false, true);
  const sunM = material(paintSun(), true, true);
  await breathe();
  const coverM = material(paintCover(), false);
  const baseM = material(paintPlain('#cfe6e2'), false);
  const edgeM = material(paintPlain(SHEET), false);
  const backM = material(paintPlain('#0f5459'), false);
  const cloudsM = material(paintClouds(), true, true);
  await breathe();
  const farM = material(paintFar()[0], true, true);
  await breathe();
  const nearM = material(paintNear()[0], true, true);
  const doveM = material(paintDove(), true, true);
  await breathe();
  const grassM = material(paintGrass()[0], true, true);
  await breathe();
  const friendsM = material(paintFriends());
  await breathe();
  const wavingM = material(paintFriends(true));
  await breathe();

  /* Christmas night: its papers are painted the first time night is asked for */
  type Paint = HTMLCanvasElement | [HTMLCanvasElement, HTMLCanvasElement | null];
  const nightPapers: [MeshLambertMaterial, () => Paint][] = [
    [skyM, paintSkyNight],
    [sunM, paintStar],
    [cloudsM, paintLanterns],
    [farM, () => paintFar(true)],
    [nearM, () => paintNear(true)],
    [doveM, paintAngel],
    [grassM, () => paintGrass(true)],
    [friendsM, () => {
      const cv = paintFriends();
      dressForNight(cv, false);
      return cv;
    }],
    [wavingM, () => {
      const cv = paintFriends(true);
      dressForNight(cv, true);
      return cv;
    }],
  ];
  const looks: { m: MeshLambertMaterial; day: CanvasTexture; night: CanvasTexture; glow: CanvasTexture }[] = [];
  let nightJob: Promise<void> | null = null;
  let nightDone = false;
  const paintNight = () =>
    (nightJob ??= (async () => {
      for (const [m, paint] of nightPapers) {
        const out = paint();
        const [cv, gv] = Array.isArray(out) ? out : [out, null];
        const night = texture(cv), glow = gv ? texture(gv) : black;
        looks.push({ m, day: m.map as CanvasTexture, night, glow });
        if (ready) {
          renderer.initTexture(night);
          if (gv) renderer.initTexture(glow);
        }
        await breathe();
      }
      nightDone = true;
    })());
  const wear = (t: Theme) => {
    for (const L of looks) {
      L.m.map = t === 'night' ? L.night : L.day;
      if (L.m.emissiveMap) L.m.emissiveMap = t === 'night' ? L.glow : black;
    }
  };

  /* the card: base on the table, back hinged at the spine (x axis, z = 0) */
  const card = new Group();
  scene.add(card);
  const baseGeo = new BoxGeometry(CARD_W, THICK, CARD_D);
  baseGeo.translate(0, -THICK / 2, CARD_D / 2);
  // box faces: +x, -x, +y, -y, +z, -z
  const base = new Mesh(baseGeo, [edgeM, edgeM, baseM, backM, edgeM, edgeM] as Material[]);
  base.receiveShadow = true;
  base.castShadow = true;
  card.add(base);
  const backGeo = new BoxGeometry(CARD_W, CARD_D, THICK);
  backGeo.translate(0, CARD_D / 2, -THICK / 2);
  const back = new Mesh(backGeo, [edgeM, edgeM, edgeM, edgeM, skyM, coverM] as Material[]);
  back.receiveShadow = true;
  back.castShadow = true;
  const backG = new Group();
  backG.add(back);
  card.add(backG);
  back.userData.tap = 'sky';
  base.userData.tap = 'card';
  // The sun stands just in front of the sky, so it can set behind the hills;
  // at night the same sheet is the star of Bethlehem. Either one, pressed,
  // turns day to night and back.
  const sunGeo = new PlaneGeometry(SUN_W, SUN_H);
  sunGeo.translate(0, SUN_CY - SUN_H / 2, 0); // the sun's centre at the origin
  const sunMesh = new Mesh(sunGeo, sunM);
  const SUN_UP = CARD_D * (1 - SUN_Y), SUN_DOWN = 0.12;
  sunMesh.position.set(-CARD_W / 2 + SUN_X * CARD_W, SUN_UP, 0.006);
  sunMesh.receiveShadow = true;
  sunMesh.renderOrder = 1;
  sunMesh.userData.tap = 'sun';
  backG.add(sunMesh);

  /* the layers: each a plane in a group posed as a parallel fold */
  const layers: Layer[] = [];
  const flat = (m: MeshLambertMaterial, w: number, y0: number, y1: number, x = 0, order = 0) => {
    const geo = new PlaneGeometry(w, y1 - y0);
    geo.translate(x, (y0 + y1) / 2, 0);
    const mesh = new Mesh(geo, m);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.renderOrder = order;
    return mesh;
  };
  const presses = new Map<string, Spring>();
  const addLayer = (d: number, mesh: Mesh | Group, lift?: Layer['lift'], tap?: string) => {
    const g = new Group();
    g.add(mesh);
    card.add(g);
    const L: Layer = { g, d, lift };
    if (tap) {
      mesh.userData.tap = tap;
      L.press = new Spring(110, 6);
      presses.set(tap, L.press);
    }
    layers.push(L);
    return g;
  };
  addLayer(0.1, flat(cloudsM, CARD_W, 1.04, 1.04 + CLOUD_H, 0, 1), undefined, 'clouds');
  addLayer(0.3, flat(farM, CARD_W, 0, FAR_H, 0, 2), undefined, 'far');
  const doveX = NARROW ? 0.42 : 0.5;
  const doveMesh = flat(doveM, DOVE_W, 1.0, 1.0 + DOVE_H, doveX, 3);
  doveMesh.userData.tap = 'dove';
  const dove = addLayer(0.62, doveMesh, (t, p) => 0.05 * smooth(0.35, 0.85, p) + 0.012 * Math.sin(t * 1.4));
  addLayer(0.58, flat(nearM, CARD_W, 0, NEAR_H, 0, 4), undefined, 'near');
  addLayer(1.3, flat(grassM, CARD_W, 0, GRASS_H, 0, 30), undefined, 'grass');

  // The chain stands at 0.9, between the near hills and the grass: one group
  // per friend, hinged at its left hand, the backing in the middle and figure
  // and hair on both faces (so a friend turned away still shows).
  const chain = new Group();
  addLayer(0.92, chain);
  const cols = N * LAYERS;
  const panels: Group[] = [];
  const y0 = -((CH - FOOT) / CW) * PW, PH = (CH / CW) * PW;
  const swaps: Mesh[][] = []; // per friend: the backing and figure sheets
  const armsG: Group[] = []; // per friend: the waving arm, hinged at the shoulder
  for (let i = 0; i < N; i++) {
    const g = new Group();
    swaps.push([]);
    for (const z of [0, 1, 2, -1, -2]) {
      const l = Math.abs(z);
      const geo = new PlaneGeometry(PW, PH);
      geo.translate(PW / 2, y0 + PH / 2, z * GAP);
      const uv = geo.attributes.uv;
      for (let k = 0; k < uv.count; k++) uv.setX(k, (i * LAYERS + l + uv.getX(k)) / cols);
      const m = new Mesh(geo, friendsM);
      m.userData.tap = 'friend';
      m.userData.i = i;
      m.renderOrder = 10 + l;
      m.castShadow = true;
      m.receiveShadow = l === 0;
      g.add(m);
      if (l < 2) swaps[i].push(m);
    }
    // the arm's sheet, moved so the shoulder pivot sits at the group's origin
    const side = waveSide(i);
    const ag = new PlaneGeometry(PW, PH);
    ag.translate(0, (PIVOT / CH - 0.5) * PH, 1.5 * GAP);
    const auv = ag.attributes.uv;
    for (let k = 0; k < auv.count; k++) auv.setX(k, (i * LAYERS + 2 + auv.getX(k)) / cols);
    const arm = new Mesh(ag, wavingM);
    arm.userData.tap = 'friend';
    arm.userData.i = i;
    arm.renderOrder = 11;
    arm.castShadow = true;
    const armG = new Group();
    armG.add(arm);
    armG.position.set(((CX + side * 46) / CW) * PW, y0 + PH * (1 - 300 / CH), 0);
    armG.visible = false;
    g.add(armG);
    armsG.push(armG);
    panels.push(g);
    chain.add(g);
  }

  // The table: shows nothing but the card's shadow.
  const floorM = new ShadowMaterial({ color: 0x0b3f43, opacity: 0.2 });
  const floor = new Mesh(new PlaneGeometry(14, 14), floorM);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -THICK;
  floor.receiveShadow = true;
  scene.add(floor);

  const hemi = new HemisphereLight(0xf4fbff, 0xe9e2cf, 2.45);
  scene.add(hemi);
  // At night: lamplight from the crib, warm on the friends. Always in the
  // scene (dark by day), so night never changes the light count.
  const warm = new PointLight(0xffc27a, 0, 4, 1.2);
  warm.position.set(-CARD_W / 2 + CRIB_AT * CARD_W + 0.6, 1.0, 1.7);
  scene.add(warm);
  const key = new DirectionalLight(0xfff1dc, 2.2);
  key.position.set(-1.9, 3.2, 3.1);
  key.target.position.set(0, 0.5, 0.5);
  key.castShadow = true;
  key.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
  Object.assign(key.shadow.camera, { left: -2.4, right: 2.4, top: 2.2, bottom: -1.8, near: 0.5, far: 10 });
  key.shadow.camera.updateProjectionMatrix();
  key.shadow.radius = 4;
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.004;
  scene.add(key, key.target);

  /* snow: small paper flakes falling through the card, at night only */
  const FLAKES = NARROW ? 80 : 140;
  const snowM = new MeshBasicMaterial({ map: texture(paintFlake()), transparent: true, depthWrite: false, opacity: 0 });
  const snow = new InstancedMesh(new PlaneGeometry(0.02, 0.02), snowM, FLAKES);
  snow.count = 0;
  snow.frustumCulled = false;
  scene.add(snow);
  const sr = seeded(91);
  const flakes = Array.from({ length: FLAKES }, () => ({
    x: (sr() - 0.5) * CARD_W * 1.05,
    y: sr() * 1.8,
    z: 0.05 + sr() * CARD_D,
    s: 0.6 + sr() * 0.8,
    v: 0.06 + sr() * 0.07,
    p: sr() * 6.28,
  }));
  const fm = new Matrix4(), fq = new Quaternion(), fp = new Vector3(), fs = new Vector3();

  /* camera: fit the opened card into the free part of the stage */
  const camera = new PerspectiveCamera(30, 1, 0.1, 100);
  const TAN = Math.tan((30 * Math.PI) / 360);
  // the opened card fills its box, with only a small margin
  const FIT_W = CARD_W + 0.06, FIT_H = CARD_D + 0.14, MID_Y = 0.66, MID_Z = 0.55;
  const copyEls = Array.from(root.querySelectorAll<HTMLElement>('.hs__copy > *'));
  let W = 0, H = 0, D0 = 10, dprCap = Math.min(window.devicePixelRatio || 1, 1.75);
  const resize = () => {
    W = stage.clientWidth;
    H = stage.clientHeight;
    if (!W || !H) return;
    const R = heroRegion(stage, copyEls);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    D0 = Math.max((FIT_W * H) / (2 * TAN * R.w), (FIT_H * H) / (2 * TAN * R.h)) + MID_Z;
    camera.setViewOffset(W, H, W / 2 - (R.x + R.w / 2), H / 2 - (R.y + R.h / 2), W, H);
    camera.updateProjectionMatrix();
  };

  /* scroll story */
  let pT = 0, pS = 0;
  let mx = 0, my = 0, mxS = 0, myS = 0;
  let running = false, visible = false, raf = 0, last = 0, time = 0, kick = 0;
  let slow = 0, cool = 0; // adaptive resolution
  let frozen = false; // dev stills
  let ready = false; // set once everything is compiled and uploaded

  const progress = () => {
    const r = root.getBoundingClientRect();
    const travel = r.height - H;
    return travel > 0 ? clamp01(-r.top / travel) : 0;
  };

  /* presses: what each part does when touched */
  const cardOpen = new Spring(90, 6); // the back pushed further open
  const cardHop = new Spring(140, 9); // the whole card bouncing on the table
  const hopAt = new Float32Array(N).fill(-9); // when each friend's hop starts
  const hopAmp = new Float32Array(N);
  const hoverLift = new Float32Array(N);
  const waveW = new Float32Array(N); // 0 holding hands .. 1 arm up, waving
  const waveUntil = new Float32Array(N).fill(-9); // a tap waves for a moment
  // the arm's angle while it holds the hand, and raised
  const HOLD = Math.PI - Math.atan2(CW + 4 - CX - 46, HAND - 300);
  let hoverI = -1;
  let doveAt = -9;

  /* day and night: the sun sets behind the hills, the papers turn to night,
     the star rises; the way back runs the same, from the star */
  const STILL = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let shown: Theme = getTheme(); // the papers on the card now
  let goal: Theme = shown;
  let pending: Theme | null = null;
  let tu = -1; // time into a change, -1 when none
  let origin: { x: number; y: number } | null = null; // a press on the sun or star: the page follows from there
  let lightK = shown === 'night' ? 1 : 0, glowK = lightK, sunSet = 0, dusk = 0, fallDt = 0;
  const C = (h: number) => new Color(h);
  const DAY_SKY = C(0xf4fbff), DAY_GROUND = C(0xe9e2cf), DAY_KEY = C(0xfff1dc);
  const NIGHT_SKY = C(0x8f8fd6), NIGHT_GROUND = C(0x2a2648), NIGHT_KEY = C(0xbdb8ff);
  const DUSK_KEY = C(0xff9455), DUSK_SKY = C(0xffb58c), WHITE = C(0xffffff);
  const settle = (t: Theme) => {
    wear(t);
    shown = t;
    lightK = glowK = t === 'night' ? 1 : 0;
    sunSet = dusk = 0;
    tu = -1;
  };
  const begin = (t: Theme, from: { x: number; y: number } | null = null) => {
    if (tu >= 0) {
      if (t !== goal) pending = t;
      return;
    }
    if (t === goal && t === shown) return;
    goal = t;
    origin = from;
    if (t === 'night') paintNight();
    if (STILL || !running) {
      // no motion, or nobody watching: go straight there
      paintNight().then(() => {
        if (goal !== t) return;
        settle(t);
        if (origin) setTheme(t, origin);
        if (!running) draw();
      });
      return;
    }
    tu = 0;
  };
  const turn = (dt: number) => {
    if (tu < 0) return;
    const toNight = goal === 'night';
    let u = tu + dt;
    if (u >= 0.9 && shown !== goal) {
      if (!nightDone) u = 0.9; // hold at dusk until the night papers are ready
      else {
        wear(goal);
        shown = goal;
        if (origin) setTheme(goal, origin);
      }
    }
    tu = u;
    const a = ease(clamp01(u / 0.9)), b = ease(clamp01((u - 0.9) / 1.5));
    sunSet = u < 0.9 ? a : 1 - b;
    dusk = bump(u / 1.8);
    lightK = toNight ? ease(clamp01(u / 2.4)) : 1 - ease(clamp01(u / 2.4));
    glowK = toNight ? (u < 0.9 ? 0 : b) : u < 0.9 ? 1 - a : 0;
    if (u >= 2.4) {
      settle(goal);
      const next = pending;
      pending = null;
      if (next && next !== goal) begin(next);
    }
  };

  const ray = new Raycaster();
  const ndc = new Vector2();
  const tappable: Object3D[] = [];
  card.traverse((o) => {
    if (o.userData.tap) tappable.push(o);
  });
  // only real paper counts: look up the painted alpha where the ray hit
  const isPaper = (hit: Intersection) => {
    const mesh = hit.object as Mesh;
    const mat = (Array.isArray(mesh.material) ? mesh.material[hit.face?.materialIndex ?? 0] : mesh.material) as MeshLambertMaterial;
    const img = mat.map?.image as HTMLCanvasElement | undefined;
    if (!mat.transparent || !img || !hit.uv) return true;
    const px = Math.min(img.width - 1, Math.max(0, Math.floor(hit.uv.x * img.width)));
    const py = Math.min(img.height - 1, Math.max(0, Math.floor((1 - hit.uv.y) * img.height)));
    return (img.getContext('2d')?.getImageData(px, py, 1, 1).data[3] ?? 255) > 40;
  };
  const pick = (cx: number, cy: number): Object3D | null => {
    const b = canvas.getBoundingClientRect();
    if (!b.width) return null;
    ndc.set(((cx - b.left) / b.width) * 2 - 1, -((cy - b.top) / b.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    for (const hit of ray.intersectObjects(tappable, false)) {
      if (isPaper(hit)) return hit.object;
    }
    return null;
  };
  const press = (o: Object3D, x: number, y: number) => {
    const tap = o.userData.tap as string;
    if (tap === 'sun') {
      if (tu < 0) begin(shown === 'night' ? 'day' : 'night', { x, y });
    } else if (tap === 'friend') {
      // a hop, and it runs down the chain both ways
      const k = o.userData.i as number;
      waveUntil[k] = time + 1.8;
      for (let j = 0; j < N; j++) {
        const d = Math.abs(j - k);
        hopAt[j] = time + 0.09 * d;
        hopAmp[j] = 0.13 * Math.pow(0.55, d);
      }
      kick = Math.max(kick, 0.5);
    } else if (tap === 'dove') {
      doveAt = time;
    } else if (tap === 'sky') {
      cardOpen.v += 3.2;
    } else if (tap === 'card') {
      cardHop.v += 1.6;
      kick = 1;
    } else {
      presses.get(tap)!.v += 5;
      if (tap === 'grass') kick = Math.max(kick, 0.4);
    }
  };

  const pose = newPose();
  const sway = (i: number) => (0.012 + 0.07 * kick) * Math.sin(time * (1.3 + 0.9 * kick) + i * 1.25);

  const draw = () => {
    const e = pS;
    // the card opens: the back and every layer turn together about the spine
    const th = angleAt(e) + 0.004 * Math.sin(time * 0.9) + 0.16 * cardOpen.x;
    const rx = Math.PI / 2 - th;
    backG.rotation.x = rx;
    card.position.y = Math.max(-0.02, 0.06 * cardHop.x);
    // the dove's flight: up, a small circle, and home
    const fu = (time - doveAt) / 1.5;
    const fly = bump(fu);
    for (const L of layers) {
      // a pressed layer bends back about its fold, then springs up
      L.g.rotation.x = rx - (L.press ? 0.22 * L.press.x : 0);
      let up = L.lift ? L.lift(time + kick * 2, e) : 0;
      let side = 0;
      if (L.g === dove) {
        up += 0.32 * fly;
        side = 0.16 * Math.sin(Math.PI * 2 * clamp01(fu)) * fly;
      }
      L.g.position.set(side, Math.sin(th) * up, L.d + Math.cos(th) * up);
    }
    dove.rotation.z = 0.03 * Math.sin(time * 1.1) * (1 + kick) + 0.3 * Math.sin((time - doveAt) * 20) * fly;
    chainAt(chainOpen(e), chainGather(e), sway, pose);
    for (let i = 0; i < N; i++) {
      const hop = hopAmp[i] * bump((time - hopAt[i]) / 0.5);
      panels[i].position.set(pose.x[i], hop + hoverLift[i], pose.z[i] * 0.7);
      panels[i].rotation.y = -pose.psi[i];
      // the wave: let go, swing the arm up, wave, and take the hand again
      const w = waveW[i];
      const on = w > 0.002;
      if (armsG[i].visible !== on) {
        armsG[i].visible = on;
        for (const m of swaps[i]) m.material = on ? wavingM : friendsM;
      }
      if (on) {
        const up = ease(w);
        const side = waveSide(i);
        const a = lerp(HOLD, 0.42 + 0.32 * Math.sin(time * 9) * up, up);
        armsG[i].rotation.z = -side * a;
      }
    }
    // The camera starts low and close, looking into the half-open card; it
    // rises a little and eases back as the card opens, then swings slowly
    // across the finished scene. A little give to the pointer.
    const D = D0 * lerp(NARROW ? 1 : 0.9, 1, smooth(0.0, 0.6, e));
    const az = lerp(NARROW ? 0.26 : 0.42, 0.1, ease(smooth(0, 0.62, e))) - 0.3 * smooth(0.6, 1, e) + mxS * 0.08 + Math.sin(time * 0.2) * 0.015;
    const el = 0.2 + 0.06 * smooth(0.6, 1, e) + myS * 0.04;
    camera.position.set(Math.sin(az) * Math.cos(el) * D, MID_Y + Math.sin(el) * D, MID_Z + Math.cos(az) * Math.cos(el) * D);
    camera.lookAt(0, MID_Y, MID_Z);
    // day and night
    sunMesh.position.y = lerp(SUN_UP, SUN_DOWN, sunSet);
    sunM.opacity = 1 - smooth(0.55, 1, sunSet);
    for (const m of glowing) m.emissiveIntensity = 1.2 * glowK;
    farM.emissiveIntensity = 1.2 * glowK * (0.94 + 0.06 * Math.sin(time * 3.1));
    cloudsM.emissiveIntensity = glowK * (1.25 + 0.2 * Math.sin(time * 2.3));
    skyM.color.lerpColors(WHITE, DUSK_SKY, dusk * 0.75);
    hemi.color.lerpColors(DAY_SKY, NIGHT_SKY, lightK);
    hemi.groundColor.lerpColors(DAY_GROUND, NIGHT_GROUND, lightK);
    hemi.intensity = lerp(2.45, 1.55, lightK) * (1 - 0.35 * dusk);
    key.color.lerpColors(DAY_KEY, NIGHT_KEY, lightK).lerp(DUSK_KEY, dusk * 0.8);
    key.intensity = lerp(lerp(2.2, 2.5, smooth(0.7, 1, e)), 1.2, lightK) * (1 - 0.45 * dusk);
    warm.intensity = 1.4 * glowK;
    floorM.opacity = lerp(0.2, 0.34, lightK);
    if (glowK > 0.01) {
      snow.count = FLAKES;
      snowM.opacity = 0.8 * glowK;
      for (let k = 0; k < FLAKES; k++) {
        const f = flakes[k];
        if (!STILL) {
          f.y -= f.v * fallDt;
          if (f.y < -0.02) f.y += 1.8;
        }
        fp.set(f.x + 0.04 * Math.sin(time * 0.7 + f.p), f.y, f.z);
        fs.setScalar(f.s);
        fq.copy(camera.quaternion);
        snow.setMatrixAt(k, fm.compose(fp, fq, fs));
      }
      snow.instanceMatrix.needsUpdate = true;
    } else snow.count = 0;
    renderer.render(scene, camera);
  };

  const frame = (now: number) => {
    if (!running) return;
    const raw = Math.min(1, (now - (last || now)) / 1000);
    const dt = Math.min(0.05, raw);
    last = now;
    time += dt;
    kick *= Math.exp(-dt * 1.6);
    pT = progress();
    const k = 1 - Math.exp(-raw * 6);
    pS += (pT - pS) * k;
    if (Math.abs(pT - pS) < 1e-4) pS = pT;
    mxS += (mx - mxS) * k;
    myS += (my - myS) * k;
    cardOpen.step(dt);
    cardHop.step(dt);
    turn(dt);
    fallDt = dt;
    for (const s of presses.values()) s.step(dt);
    // a friend under the pointer lifts a little
    if (hoverDirty && now - hoverAt > 50) {
      hoverDirty = false;
      hoverAt = now;
      const o = pick(hx, hy);
      hoverI = o?.userData.tap === 'friend' ? (o.userData.i as number) : -1;
      canvas.style.cursor = o ? 'pointer' : '';
    }
    for (let i = 0; i < N; i++) {
      hoverLift[i] += ((i === hoverI ? 0.015 : 0) - hoverLift[i]) * (1 - Math.exp(-dt * 14));
      const want = i === hoverI || time < waveUntil[i] ? 1 : 0;
      // up quickly, down a little slower
      waveW[i] += (want - waveW[i]) * (1 - Math.exp(-dt * (want ? 5 : 3.5)));
      if (!want && waveW[i] < 0.002) waveW[i] = 0;
    }
    // If frames are consistently slow, render fewer pixels.
    if (raw > 0) {
      slow += ((raw > 1 / 40 ? 1 : 0) - slow) * 0.05;
      cool = Math.max(0, cool - raw);
      if (slow > 0.7 && cool === 0 && dprCap > 1) {
        dprCap = Math.max(1, renderer.getPixelRatio() - 0.25);
        cool = 2;
        slow = 0;
        resize();
      }
    }
    draw();
    raf = requestAnimationFrame(frame);
  };
  const start = () => {
    if (running || !visible || frozen || !ready) return;
    running = true;
    last = 0;
    raf = requestAnimationFrame(frame);
  };
  const stop = () => {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };

  let hx = 0, hy = 0, hoverAt = 0, hoverDirty = false;
  if (window.matchMedia('(pointer: fine)').matches) {
    stage.addEventListener('pointermove', (e) => {
      const b = stage.getBoundingClientRect();
      mx = ((e.clientX - b.left) / b.width - 0.5) * 2;
      my = -((e.clientY - b.top) / b.height - 0.5) * 2;
      hx = e.clientX;
      hy = e.clientY;
      hoverDirty = true;
    });
    stage.addEventListener('pointerleave', () => {
      mx = 0;
      my = 0;
      hoverI = -1;
      canvas.style.cursor = '';
    });
  }
  // Dev only: where each pressable part is on screen, for the browser checks.
  if (import.meta.env.DEV) {
    (window as unknown as { __hero: unknown }).__hero = {
      where: () => {
        const r = canvas.getBoundingClientRect();
        return tappable
          .filter((o) => o.userData.tap === 'friend' ? (o as Mesh).renderOrder === 10 : true)
          .map((o) => {
            const box = new Box3().setFromObject(o);
            const c = box.getCenter(new Vector3()).project(camera);
            return { tap: o.userData.tap, i: o.userData.i, x: r.left + ((c.x + 1) / 2) * r.width, y: r.top + ((1 - c.y) / 2) * r.height };
          });
      },
      state: () => ({ hop: Array.from(panels, (g) => +g.position.y.toFixed(3)), open: +cardOpen.x.toFixed(3), presses: Object.fromEntries([...presses].map(([k, v]) => [k, +v.x.toFixed(3)])), dove: +dove.position.y.toFixed(3), shown, goal, tu: +tu.toFixed(2), lightK: +lightK.toFixed(2), glowK: +glowK.toFixed(2), sunSet: +sunSet.toFixed(2) }),
    };
  }
  // Night or day from anywhere else (the footer switch): the card follows.
  document.addEventListener('acc:theme', (e) => {
    if (ready) begin((e as CustomEvent<Theme>).detail);
  });
  // A press on any part of the card: that part answers. A click, not a
  // pointerdown, so a finger that lands on the card to scroll sets nothing off.
  canvas.addEventListener('click', (e) => {
    if (frozen || !ready) return;
    const o = pick(e.clientX, e.clientY);
    if (o) press(o, e.clientX, e.clientY);
  });

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    visible ? start() : stop();
  }).observe(root);

  // Ignore small height-only changes: on iOS the toolbar collapsing mid-scroll
  // must not reallocate the drawing buffer or jolt the scene.
  let lastW = 0, lastH = 0;
  new ResizeObserver(() => {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (lastW && w === lastW && Math.abs(h - lastH) < 150) return;
    lastW = w;
    lastH = h;
    resize();
    if (!running) draw();
  }).observe(stage);
  document.fonts?.ready.then(() => {
    resize();
    if (!running) draw();
  });

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    stop();
    root.classList.remove('is-live');
  });
  canvas.addEventListener('webglcontextrestored', () => {
    textures.forEach((t) => (t.needsUpdate = true));
    root.classList.add('is-live');
    start();
  });
  window.addEventListener('pagehide', stop);
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) start();
  });

  // Dev-only stills: ?hero-poster[=progress] freezes one frame with only the
  // canvas showing, on a transparent page (for the still image); ?hero-look
  // freezes one frame with everything in place (for reviewing the look).
  const dev = import.meta.env.DEV ? /[?&]hero-(poster|look)(?:=([\d.]+))?/.exec(location.search) : null;

  // Spread the heavy first-frame work over separate tasks: shaders compile in
  // the background where the browser can, then the textures upload, then the
  // shadow pass compiles on one hidden render.
  if (shown === 'night') {
    await paintNight();
    settle('night');
  }
  resize();
  pS = pT = progress();
  await breathe();
  await renderer.compileAsync(scene, camera).catch(() => {});
  for (const t of textures) {
    renderer.initTexture(t);
    await breathe();
  }
  draw();
  await breathe();
  if (dev) {
    frozen = true;
    stop();
    pS = pT = dev[2] ? clamp01(parseFloat(dev[2])) : 0;
    time = 0.6;
    if (dev[1] === 'poster') document.documentElement.classList.add('poster-shot');
    resize();
    draw();
    root.classList.add('is-live');
    return;
  }
  draw();
  root.classList.add('is-live');
  ready = true;
  start();
  // the page may have changed while the card was being made
  if (getTheme() !== shown) begin(getTheme());
}
