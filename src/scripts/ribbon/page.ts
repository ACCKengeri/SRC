/*
  The page ribbon: one satin ribbon (teal face, coral back, see paint.ts) that
  falls the whole length of the page behind the content, as if the hero's
  ribbon carried on.

  Its path is planned against the page itself (flow.ts): long sweeps from
  side to side and an occasional curl, never across text lying on the bare
  ground. Paper sheets, cards and photos simply cover it, so it slips under
  them and out again, as if the page were laid on top of it.

  Scroll draws it on (its head runs a little above the bottom of the screen),
  and scrolling back takes it back. While the head is moving, the free end
  trails behind like fabric and settles when the scroll stops. It ends in a
  cut swallowtail above the footer.

  It is painted into page-anchored tiles that scroll with the page (no
  repaint while scrolling, so it never lags behind the content); only the
  tiles around the moving head are repainted. Re-planned when the page
  changes size. Reduced motion: painted whole, nothing moves.

  It publishes where its end lies (data-end on the host, and an
  acc:ribbon-end event) and bends its last stretch by any offset sent in an
  acc:ribbon-pull event: the About page's hidden pull (src/scripts/fold).
  A page that asks for a loose end (an element with data-ribbon-end="loose")
  gets one that hangs free below the last block, lying face up.
*/
import { RibbonLine, paintRibbon, ribbonTheme, bezierPath, type P2 } from './paint';
import { planFlow, makeGrid, markRect, hashString } from './flow';

const TILE = 1024;
const CONTROLS = 'input,select,textarea,button';
const MEDIA = 'img,picture,video,iframe,svg,canvas';
const TRAIL = 360; // px of free end that trails while the head moves
const PULL = 260; // px of free end that follows a pull on it
const PULL_ROOM = 170; // how far beyond its end a pulled end can reach

interface Tile {
  cv: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  t0: number;
  ia: number;
  ib: number;
}

const visibleBg = (cs: CSSStyleDeclaration) => {
  if (cs.backgroundImage && cs.backgroundImage !== 'none') return true;
  const m = /rgba?\(([^)]+)\)/.exec(cs.backgroundColor);
  if (!m) return false;
  const parts = m[1].split(/[ ,/]+/).filter(Boolean);
  return parts.length < 4 || parseFloat(parts[3]) > 0.5;
};

export function initPageRibbon(host: HTMLElement) {
  const main = document.querySelector('main');
  if (!main) return;
  const loose = !!document.querySelector('[data-ribbon-end="loose"]');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let line: RibbonLine | null = null;
  let yMaxPre = new Float32Array(0), yMinSuf = new Float32Array(0);
  let width = 40, dpr = 1, W = 0, docH = 0, step = 3;
  const tiles = new Map<number, Tile>();
  let drawn = 0; // fractional sample index of the head
  let target = 0;
  // a pull on the free end (px), and the stretch it bends: samples and height
  let pull: [number, number] = [0, 0], pullShown: [number, number] = [0, 0];
  let pullFrom = 0, pullTop = 0, pullBottom = 0;

  /* ---------- layout: measure the page and plan the ribbon ----------
     The work is split into short tasks that yield back to the browser, so
     planning a long page never blocks input. A newer layout (a resize mid
     plan) cancels an older one through the generation counter. */
  let gen = 0;
  const yieldTask = () => new Promise<void>((r) => setTimeout(r, 0));
  const plan = async (g: number) => {
    W = host.clientWidth;
    let sy = window.scrollY;
    const vh = window.innerHeight;
    const hero = document.getElementById('hero');
    const heroBottom = hero ? hero.getBoundingClientRect().bottom + sy : 0;
    const mr = main.getBoundingClientRect();
    const yStart = Math.max(mr.top + sy, heroBottom);
    const yEnd = mr.bottom + sy - 24;
    if (yEnd - yStart < 300) return null;
    const wide = W > 768;
    width = wide ? Math.round(Math.min(44, Math.max(28, W * 0.026))) : 18;

    const cell = 12;
    const block = makeGrid(-W * 0.2, yStart - 40, W * 1.4, yEnd - yStart + 80, cell);
    const cover = makeGrid(-W * 0.2, yStart - 40, W * 1.4, yEnd - yStart + 80, cell);
    // Is an element lying on its own paper (an ancestor with a ground)?
    const onPaper = new Map<Element, boolean>();
    const papered = (el: Element | null): boolean => {
      if (!el || el === main) return false;
      const k = onPaper.get(el);
      if (k !== undefined) return k;
      const v = visibleBg(getComputedStyle(el)) || papered(el.parentElement);
      onPaper.set(el, v);
      return v;
    };
    const pad = 10;
    let slice = performance.now();
    for (const el of Array.from(main.querySelectorAll<HTMLElement>('*'))) {
      if (performance.now() - slice > 8) {
        await yieldTask();
        if (g !== gen) return null;
        slice = performance.now();
        sy = window.scrollY;
      }
      if (hero && hero.contains(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      const t = r.top + sy, b = r.bottom + sy;
      if (b < yStart - 40 || t > yEnd + 40) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden') continue;
      if (el.matches(MEDIA) || visibleBg(cs)) {
        markRect(cover, r.left, t, r.right, b);
        continue;
      }
      let isText = el.matches(CONTROLS);
      if (!isText) {
        for (const n of Array.from(el.childNodes)) {
          if (n.nodeType === 3 && n.textContent && n.textContent.trim()) {
            isText = true;
            break;
          }
        }
      }
      if (isText && !papered(el.parentElement)) markRect(block, r.left - pad, t - pad, r.right + pad, b + pad);
    }

    const xAttr = hero ? parseFloat(hero.dataset.ribbonX || '') : NaN;
    const xStart = Number.isFinite(xAttr) ? xAttr : W * 0.86;
    const seed = hashString(location.pathname) ^ (wide ? 0 : 0x9e37);
    await yieldTask();
    if (g !== gen) return null;
    const pts = await planFlow({ W, yStart, yEnd, xStart, width, vh, seed, block, cover }, yieldTask);
    if (g !== gen) return null;
    if (loose && pts.length > 20) hang(pts, yEnd + 24, vh);
    // As tall as the page's content, never more. Not the document's scroll
    // height: that includes this layer, so once the page got shorter (a wider
    // window, a section closing) the layer would keep the old height and
    // leave empty space to scroll into below the footer.
    docH = contentEnd();
    host.dataset.planned = String(pts.length);
    return pts;
  };

  /** A loose end: from where the plan stops, it slips out below the page's
   *  last block and hangs down into the open ground above the footer. */
  const hang = (pts: P2[], below: number, vh: number) => {
    // the plan's last few points can bunch up or turn back; join a little earlier
    pts.length -= 6;
    const E = pts[pts.length - 1], F = pts[pts.length - 10];
    let tx = E[0] - F[0], ty = E[1] - F[1];
    const l = Math.hypot(tx, ty) || 1;
    tx /= l;
    ty /= l;
    const hx = Math.min(W * 0.82, Math.max(W * 0.18, E[0] + tx * 30));
    const hy = below + Math.min(84, vh * 0.09);
    const more = bezierPath([E, [E[0] + tx * 90, E[1] + ty * 90], [hx, hy - 110], [hx, hy]], 3);
    for (let i = 1; i < more.length; i++) pts.push(more[i]);
  };

  /** Where the page's content ends, measured without this layer (or anything fixed). */
  const contentEnd = () => {
    let end = 0;
    for (const el of Array.from(document.body.children)) {
      if (el === host || getComputedStyle(el).position === 'fixed') continue;
      end = Math.max(end, el.getBoundingClientRect().bottom);
    }
    return Math.floor(end + window.scrollY);
  };

  const layout = async () => {
    const g = ++gen;
    const pts = await plan(g);
    if (g !== gen) return;
    await yieldTask();
    if (g !== gen) return;
    tiles.forEach((t) => t.cv.remove());
    tiles.clear();
    if (!pts) {
      line = null;
      host.style.height = '0px';
      delete host.dataset.end;
      document.dispatchEvent(new CustomEvent('acc:ribbon-end', { detail: null }));
      return;
    }
    host.style.height = `${docH}px`;
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    line = new RibbonLine(pts, 900, loose ? 240 : 0);
    step = line.total / Math.max(1, line.n - 1);
    const n = line.n;
    yMaxPre = new Float32Array(n);
    yMinSuf = new Float32Array(n);
    let m = -Infinity;
    for (let i = 0; i < n; i++) yMaxPre[i] = m = Math.max(m, line.y[i]);
    m = Infinity;
    for (let i = n - 1; i >= 0; i--) yMinSuf[i] = m = Math.min(m, line.y[i]);
    pullFrom = Math.floor(line.at(line.total - PULL));
    pullTop = Infinity;
    pullBottom = -Infinity;
    for (let i = pullFrom; i < n; i++) {
      pullTop = Math.min(pullTop, line.y[i]);
      pullBottom = Math.max(pullBottom, line.y[i]);
    }
    pullTop -= PULL_ROOM + width;
    pullBottom += PULL_ROOM + width;
    {
      const j = n - 1, k = Math.max(0, n - 3);
      const tx = line.x[j] - line.x[k], ty = line.y[j] - line.y[k], l = Math.hypot(tx, ty) || 1;
      const end = { x: line.x[j], y: line.y[j], tx: tx / l, ty: ty / l, w: width };
      host.dataset.end = JSON.stringify(end);
      document.dispatchEvent(new CustomEvent('acc:ribbon-end', { detail: end }));
    }
    target = headTarget();
    drawn = target;
    sync(true);
  };

  /* ---------- drawing ---------- */
  // first index whose running max reaches y / last index whose suffix min is at most y
  const firstAt = (y: number) => {
    let lo = 0, hi = yMaxPre.length - 1;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (yMaxPre[m] < y) lo = m + 1;
      else hi = m;
    }
    return lo;
  };
  const lastAt = (y: number) => {
    let lo = 0, hi = yMinSuf.length - 1;
    while (lo < hi) {
      const m = (lo + hi + 1) >> 1;
      if (yMinSuf[m] > y) hi = m - 1;
      else lo = m;
    }
    return lo;
  };
  const headTarget = () => {
    if (!line) return 0;
    if (reduced) return line.n - 1;
    const y = window.scrollY + window.innerHeight * 0.82;
    if (y >= line.y[line.n - 1]) return line.n - 1;
    const i = firstAt(y);
    return Math.max(0, i - 1 + (y - yMaxPre[Math.max(0, i - 1)]) / Math.max(1e-3, yMaxPre[i] - yMaxPre[Math.max(0, i - 1)]));
  };

  // The trailing free end: a travelling wave along the normal, strongest at
  // the tip, gone a hand's length behind it.
  let amp = 0, ampShown = 0, clock = 0;
  const wave = (i: number) => {
    const d = (drawn - i) * step;
    if (d < 0 || d > TRAIL) return 0;
    const env = Math.exp(-d / 110) * (1 - d / TRAIL);
    return amp * width * 0.34 * env * Math.sin(d / 48 - clock * 7.5);
  };

  // A pull bends the last stretch towards the hand, smoothly from nothing
  // PULL px back to the whole offset at the tip. Only once it's all drawn.
  const pulled = () => !!line && drawn >= line.n - 1.01 && (pull[0] !== 0 || pull[1] !== 0 || pullShown[0] !== 0 || pullShown[1] !== 0);
  const shift = (i: number): [number, number] => {
    if (!line) return [0, 0];
    const j = Math.min(line.n - 1, Math.floor(i)), k = Math.min(line.n - 1, j + 1);
    const d = line.total - (line.s[j] + (line.s[k] - line.s[j]) * (i - j));
    if (d >= PULL) return [0, 0];
    const u = 1 - d / PULL, f = u * u * (3 - 2 * u);
    return [pull[0] * f, pull[1] * f];
  };
  const nearPull = (t: Tile) => t.t0 < pullBottom && t.t0 + TILE > pullTop;

  const paintTile = (t: Tile) => {
    if (!line) return;
    t.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    t.ctx.clearRect(0, 0, W, TILE);
    // a pulled end can swing into a tile it never reaches at rest
    const bent = pulled() && nearPull(t) && (pull[0] !== 0 || pull[1] !== 0);
    const ia = bent ? Math.min(t.ia, pullFrom) : t.ia, ib = bent ? line.n - 1 : t.ib;
    const end = Math.min(ib, drawn);
    // The head is cut like a ribbon end in whichever tile it falls; a tile the
    // band only runs through stops past its own edge, out of sight.
    if (end > ia) paintRibbon(t.ctx, line, ia, end, width, 0, -t.t0, drawn <= ib, amp > 0 ? wave : null, bent ? shift : null);
  };

  let shown = -1;
  const sync = (force = false) => {
    if (!line) return;
    const vh = window.innerHeight, sy = window.scrollY;
    const first = Math.max(0, Math.floor((sy - 300) / TILE)), last = Math.floor((sy + vh + 300) / TILE);
    // drop far tiles
    tiles.forEach((t, k) => {
      if (k < first - 1 || k > last + 1) {
        t.cv.remove();
        tiles.delete(k);
      }
    });
    // make the tiles on and near the screen, painted as they are now
    for (let k = first; k <= last; k++) {
      const t0 = k * TILE;
      if (t0 >= docH) break;
      if (tiles.has(k)) continue;
      const cv = document.createElement('canvas');
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(TILE * dpr);
      cv.style.top = `${t0}px`;
      cv.style.height = `${TILE}px`;
      host.appendChild(cv);
      const reach = width * 2.5;
      const t = { cv, ctx: cv.getContext('2d')!, t0, ia: firstAt(t0 - reach), ib: lastAt(t0 + TILE + reach) };
      tiles.set(k, t);
      paintTile(t);
    }
    // Repaint every tile still kept that the head (or its trailing end, or a
    // pull) passed through since the last frame, not only those on screen: a
    // fast fling leaves the lagging head in a tile already scrolled past, and
    // that tile would otherwise keep a half-drawn ribbon, cut off flat at its
    // edge, until it was dropped.
    const trailing = amp > 0 || ampShown > 0;
    const back = trailing ? TRAIL / step + 2 : 0;
    const lo = Math.min(shown, drawn) - back, hi = Math.max(shown, drawn);
    const changed = shown !== drawn || trailing;
    const bending = pulled();
    if (force || changed || bending) {
      tiles.forEach((t) => {
        if (force || (changed && lo < t.ib + 1 && hi > t.ia - 1) || (bending && nearPull(t))) paintTile(t);
      });
    }
    shown = drawn;
    ampShown = amp;
    pullShown = [pull[0], pull[1]];
  };

  /* ---------- loop: follow the scroll (read only, no scroll listener) ---------- */
  let raf = 0, lastT = 0, lastY = -1;
  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    if (!line) return;
    const dt = Math.min(0.1, (now - (lastT || now)) / 1000);
    lastT = now;
    const sy = window.scrollY;
    if (sy !== lastY) {
      lastY = sy;
      target = headTarget();
    }
    const before = drawn;
    if (drawn !== target) {
      drawn += (target - drawn) * (1 - Math.exp(-dt * 6));
      if (Math.abs(target - drawn) < 0.05) drawn = target;
    }
    if (!reduced && dt > 0) {
      // how fast the head is travelling, in px a second
      const speed = (Math.abs(drawn - before) * step) / dt;
      const want = Math.min(1, speed / 700);
      amp += (want - amp) * (1 - Math.exp(-dt * (want > amp ? 5 : 1.6)));
      if (amp < 0.004 && want === 0) amp = 0;
      clock += dt;
    }
    sync();
  };
  const run = () => {
    if (!raf && !document.hidden) {
      lastT = 0;
      raf = requestAnimationFrame(tick);
    }
  };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else run();
  });

  let timer = 0, lastMainH = 0, lastW = 0;
  // The first plan goes at once (the page loader waits for it); later ones
  // wait for the resizing or loading to settle.
  const relayout = () => {
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      layout().then(run);
    }, line ? 160 : 0);
  };
  new ResizeObserver(() => {
    const h = main.offsetHeight, w = host.clientWidth;
    if (h === lastMainH && w === lastW) return;
    lastMainH = h;
    lastW = w;
    relayout();
  }).observe(main);
  document.fonts?.ready.then(relayout);
  window.addEventListener('load', relayout, { once: true });
  // the About page's pull on the free end
  document.addEventListener('acc:ribbon-pull', (e) => {
    const d = (e as CustomEvent<[number, number]>).detail;
    pull = [d[0], d[1]];
  });
  // day and night: repaint what is on screen in the other colours
  document.addEventListener('acc:theme', (e) => {
    ribbonTheme((e as CustomEvent<string>).detail === 'night');
    sync(true);
  });
}
