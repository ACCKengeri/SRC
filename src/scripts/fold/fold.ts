/*
  The About page's hidden door (see docs/DESIGN_NOTES.md, "The fold").

  1. The peach strip under the page head has a small dog-ear at its right
     end. Drag that corner and the strip's end folds over along a real crease:
     the crease is the perpendicular bisector between the corner and where it
     is held, the part beyond it is cut from the face and drawn mirrored on
     top, its back showing. Let go past half way and it springs into a folded
     end and stays; short of that it springs back to the dog-ear.
  2. While the strip is folded, the free end of the page ribbon (the cut
     swallowtail peeking out under the last card) can be pulled. It stretches
     a little and gives (rubber band), and on release swings back on a spring.
  3. The third good pull opens the editing studio.

  Nothing here is visible or announced: no cursor, no label, no focus stop.
  Reduced motion: the fold and the ribbon follow the hand, but settle at once.
*/
import { tornEdge, tornPolygon } from './torn';

type V = [number, number];
const SVGNS = 'http://www.w3.org/2000/svg';

const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1]];
const len = (a: V) => Math.hypot(a[0], a[1]);

/** The part of `poly` on the side of the line through m where (x - m)·n has `sign`. */
function clip(poly: V[], m: V, n: V, sign: 1 | -1): V[] {
  const f = (p: V) => sign * ((p[0] - m[0]) * n[0] + (p[1] - m[1]) * n[1]);
  const out: V[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const fa = f(a), fb = f(b);
    if (fa >= 0) out.push(a);
    if (fa >= 0 !== fb >= 0) {
      const t = fa / (fa - fb);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}
const reflect = (p: V, m: V, n: V): V => {
  const d = 2 * ((p[0] - m[0]) * n[0] + (p[1] - m[1]) * n[1]);
  return [p[0] - d * n[0], p[1] - d * n[1]];
};
const pts = (poly: V[]) => poly.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');

/** A damped spring towards a target, per axis. */
function spring(p: V, v: V, t: V, dt: number, k: number, zeta: number) {
  const c = 2 * zeta * Math.sqrt(k);
  for (let i = 0; i < 2; i++) {
    v[i] += (k * (t[i] - p[i]) - c * v[i]) * dt;
    p[i] += v[i] * dt;
  }
}
const settled = (p: V, v: V, t: V) => Math.abs(p[0] - t[0]) + Math.abs(p[1] - t[1]) < 0.15 && Math.abs(v[0]) + Math.abs(v[1]) < 2;

/** The angle (radians) an element is rotated by, from its computed transform. */
const rotationOf = (el: Element) => {
  const t = getComputedStyle(el).transform;
  if (!t || t === 'none') return 0;
  const m = new DOMMatrix(t);
  return Math.atan2(m.b, m.a);
};

export function initFold(root: HTMLElement, studio: string) {
  const strip = root.querySelector<HTMLElement>('.fold__strip');
  const face = root.querySelector<HTMLElement>('.fold__face');
  if (!strip || !face) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const edge = tornEdge(Number(root.dataset.seed) || 1);
  const uid = `fold${Math.random().toString(36).slice(2, 7)}`;

  // the mirrored flap, drawn over the face
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.classList.add('fold__flap');
  svg.innerHTML = `
    <defs>
      <linearGradient id="${uid}g" gradientUnits="userSpaceOnUse">
        <stop offset="0" class="fold__crease" />
        <stop offset="0.35" stop-color="#000" stop-opacity="0" />
        <stop offset="1" stop-color="#fff" stop-opacity="0.2" />
      </linearGradient>
      <pattern id="${uid}p" patternUnits="userSpaceOnUse" width="256" height="256">
        <image href="${root.dataset.grain ?? ''}" width="256" height="256" />
      </pattern>
      <filter id="${uid}f" x="-30%" y="-60%" width="160%" height="220%">
        <feDropShadow dx="-1.5" dy="2" stdDeviation="2.2" class="fold__cast" />
      </filter>
    </defs>
    <g filter="url(#${uid}f)">
      <polygon class="fold__back-side" />
      <polygon fill="url(#${uid}p)" />
      <polygon fill="url(#${uid}g)" />
    </g>`;
  strip.appendChild(svg);
  const polys = Array.from(svg.querySelectorAll('polygon'));
  const grad = svg.querySelector('linearGradient')!;

  // where the corner can be held: an invisible patch that follows its tip
  const grip = document.createElement('span');
  grip.className = 'fold__grip';
  strip.appendChild(grip);

  let w = 0, h = 0, C: V = [0, 0], outline: V[] = [];
  const restAt = (): V => [C[0] - 0.55 * h, C[1] - 0.42 * h];
  const foldAt = (): V => [C[0] - 3.2 * h, C[1] - 0.24 * h];
  let folded = false;
  const P: V = [0, 0], Vel: V = [0, 0];
  let T: V = [0, 0];

  const measure = () => {
    w = strip.clientWidth;
    h = strip.clientHeight;
    outline = tornPolygon(edge, w, h);
    C = [w, h - edge.bottom[edge.bottom.length - 1][1]];
    T = folded ? foldAt() : restAt();
    P[0] = T[0];
    P[1] = T[1];
    draw();
  };

  const draw = () => {
    const d = sub(C, P), l = len(d);
    const g = 22;
    grip.style.transform = `translate(${(P[0] - g).toFixed(1)}px, ${(P[1] - g).toFixed(1)}px)`;
    if (l < 0.5) {
      face.style.clipPath = `polygon(${outline.map((p) => `${p[0].toFixed(1)}px ${p[1].toFixed(1)}px`).join(',')})`;
      svg.style.visibility = 'hidden';
      return;
    }
    const n: V = [d[0] / l, d[1] / l];
    const m: V = [(C[0] + P[0]) / 2, (C[1] + P[1]) / 2];
    const keep = clip(outline, m, n, -1);
    const flap = clip(outline, m, n, 1).map((p) => reflect(p, m, n));
    face.style.clipPath = `polygon(${keep.map((p) => `${p[0].toFixed(1)}px ${p[1].toFixed(1)}px`).join(',')})`;
    const s = pts(flap);
    for (const p of polys) p.setAttribute('points', s);
    // shade from the crease across the flap to its tip
    grad.setAttribute('x1', m[0].toFixed(1));
    grad.setAttribute('y1', m[1].toFixed(1));
    grad.setAttribute('x2', P[0].toFixed(1));
    grad.setAttribute('y2', P[1].toFixed(1));
    svg.style.visibility = flap.length > 2 ? 'visible' : 'hidden';
  };

  /* ---- the loop: only runs while something is moving ---- */
  let raf = 0, last = 0, dragging = false;
  const step = (now: number) => {
    const dt = Math.min(1 / 30, (now - (last || now)) / 1000);
    last = now;
    if (!dragging) {
      if (reduced) {
        P[0] = T[0];
        P[1] = T[1];
      } else spring(P, Vel, T, dt, 230, 0.48);
    }
    draw();
    if (dragging || !settled(P, Vel, T)) raf = requestAnimationFrame(step);
    else {
      P[0] = T[0];
      P[1] = T[1];
      draw();
      raf = 0;
    }
  };
  const run = () => {
    if (!raf) {
      last = 0;
      raf = requestAnimationFrame(step);
    }
  };

  /* ---- dragging the corner ---- */
  let start: V = [0, 0], from: V = [0, 0], prev: V = [0, 0], prevT = 0, angle = 0;
  grip.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    grip.setPointerCapture(e.pointerId);
    dragging = true;
    angle = rotationOf(strip);
    start = [e.clientX, e.clientY];
    from = [P[0], P[1]];
    prev = [P[0], P[1]];
    prevT = performance.now();
    run();
  });
  grip.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    // screen movement into the strip's own (slightly turned) frame
    const dx = e.clientX - start[0], dy = e.clientY - start[1];
    const c = Math.cos(-angle), s = Math.sin(-angle);
    let q: V = [from[0] + dx * c - dy * s, from[1] + dx * s + dy * c];
    // paper doesn't stretch: the corner stays within reach of where it was cut
    const d = sub(q, C), l = len(d), max = Math.min(4.4 * h, w * 0.6);
    if (l > max) q = [C[0] + (d[0] / l) * max, C[1] + (d[1] / l) * max];
    const now = performance.now(), ddt = Math.max(1, now - prevT) / 1000;
    Vel[0] = (q[0] - prev[0]) / ddt;
    Vel[1] = (q[1] - prev[1]) / ddt;
    prev = q;
    prevT = now;
    P[0] = q[0];
    P[1] = q[1];
  });
  const release = () => {
    if (!dragging) return;
    dragging = false;
    folded = len(sub(C, P)) > 1.5 * h;
    T = folded ? foldAt() : restAt();
    pull.enable(folded);
    run();
  };
  grip.addEventListener('pointerup', release);
  grip.addEventListener('pointercancel', release);

  const pull = initPull(studio, reduced);
  new ResizeObserver(measure).observe(strip);
  measure();
}

/* ------------------------------------------------------------------
   The ribbon's free end, pullable once the strip is folded. The page
   ribbon (src/scripts/ribbon/page.ts) publishes where its end lies and
   bends its last stretch by whatever offset is sent back.
------------------------------------------------------------------ */
interface RibbonEnd {
  x: number;
  y: number;
  tx: number;
  ty: number;
  w: number;
}

function initPull(studio: string, reduced: boolean) {
  const host = document.querySelector<HTMLElement>('.page-ribbon');
  const grip = document.createElement('span');
  grip.className = 'ribbon-pull';
  grip.setAttribute('aria-hidden', 'true');
  grip.hidden = true;
  (host?.parentElement ?? document.body).appendChild(grip);

  let end: RibbonEnd | null = null;
  let on = false;
  const D: V = [0, 0], Vel: V = [0, 0], ZERO: V = [0, 0];
  let pulls = 0, leaving = false;

  const place = () => {
    grip.hidden = !(on && end);
    if (!end) return;
    // centred on the swallowtail, which runs on past the end of the band
    const cx = end.x + end.tx * end.w * 0.5, cy = end.y + end.ty * end.w * 0.5;
    grip.style.left = `${(cx - 28).toFixed(1)}px`;
    grip.style.top = `${(cy - 28).toFixed(1)}px`;
  };
  const read = (v: string | undefined) => {
    try {
      return v ? (JSON.parse(v) as RibbonEnd) : null;
    } catch {
      return null;
    }
  };
  end = read(host?.dataset.end);
  document.addEventListener('acc:ribbon-end', (e) => {
    end = (e as CustomEvent<RibbonEnd | null>).detail;
    place();
  });

  const send = () => {
    grip.style.transform = `translate(${D[0].toFixed(1)}px, ${D[1].toFixed(1)}px)`;
    document.dispatchEvent(new CustomEvent('acc:ribbon-pull', { detail: [D[0], D[1]] }));
  };

  let raf = 0, last = 0, dragging = false;
  const step = (now: number) => {
    const dt = Math.min(1 / 30, (now - (last || now)) / 1000);
    last = now;
    if (!dragging) {
      if (reduced) {
        D[0] = D[1] = Vel[0] = Vel[1] = 0;
      } else spring(D, Vel, ZERO, dt, 360, 0.16);
    }
    send();
    if (dragging || !settled(D, Vel, ZERO)) raf = requestAnimationFrame(step);
    else {
      D[0] = D[1] = 0;
      send();
      raf = 0;
    }
  };
  const run = () => {
    if (!raf) {
      last = 0;
      raf = requestAnimationFrame(step);
    }
  };

  let start: V = [0, 0], prev: V = [0, 0], prevT = 0, reach = 0;
  const REACH = 120; // the most the end gives, however hard it's pulled
  grip.addEventListener('pointerdown', (e) => {
    if (leaving) return;
    e.preventDefault();
    grip.setPointerCapture(e.pointerId);
    dragging = true;
    start = [e.clientX - D[0], e.clientY - D[1]];
    prev = [D[0], D[1]];
    prevT = performance.now();
    reach = 0;
    run();
  });
  grip.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const raw: V = [e.clientX - start[0], e.clientY - start[1]];
    const l = len(raw);
    reach = Math.max(reach, l);
    // a rubber band: easy at first, then it holds
    const k = l > 0 ? (REACH * (1 - Math.exp(-l / REACH))) / l : 0;
    const now = performance.now(), ddt = Math.max(1, now - prevT) / 1000;
    Vel[0] = (raw[0] * k - prev[0]) / ddt;
    Vel[1] = (raw[1] * k - prev[1]) / ddt;
    D[0] = raw[0] * k;
    D[1] = raw[1] * k;
    prev = [D[0], D[1]];
    prevT = now;
  });
  const release = () => {
    if (!dragging) return;
    dragging = false;
    run();
    if (reach < 64) return;
    if (++pulls >= 3) {
      leaving = true;
      setTimeout(() => location.assign(studio), reduced ? 120 : 650);
    }
  };
  grip.addEventListener('pointerup', release);
  grip.addEventListener('pointercancel', release);

  return {
    enable(v: boolean) {
      on = v;
      if (!v) pulls = 0;
      place();
    },
  };
}
