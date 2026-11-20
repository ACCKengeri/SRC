/*
  A photo for a team print: pasted (Ctrl+V, or a phone's paste), dropped,
  picked from the device, or taken from a Drive link, then framed in a 4:5
  window by dragging and zooming (wheel, slider, or two fingers). Comes back
  as a 720 x 900 JPEG, the same shape every print on the About page uses.
*/
import { h } from './ui';
import { driveId } from '../../lib/live/schema';
import { fileBlob } from './google';

const OUT_W = 720, OUT_H = 900;

async function decode(blob: Blob): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(blob, { imageOrientation: 'from-image' });
  } catch {
    const url = URL.createObjectURL(blob);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }
}

/** Asks for a photo and its framing. Resolves to the JPEG, or null if they cancel. */
export function pickPhoto(title: string): Promise<Blob | null> {
  return new Promise((done) => {
    const dlg = h('dialog', { class: 'crop', 'aria-label': `Photo for ${title}` }) as HTMLDialogElement;
    const finish = (b: Blob | null) => {
      document.removeEventListener('paste', onPaste);
      dlg.close();
      dlg.remove();
      done(b);
    };
    dlg.addEventListener('cancel', (e) => {
      e.preventDefault();
      finish(null);
    });

    /* ---- step 1: where the photo comes from ---- */
    const err = h('p', { class: 'crop__err', role: 'alert' });
    const file = h('input', { type: 'file', accept: 'image/*', class: 'sr-only', id: 'crop-file' }) as HTMLInputElement;
    const link = h('input', { type: 'url', placeholder: 'or paste a Google Drive link to a photo', class: 'fld', 'aria-label': 'Drive link' }) as HTMLInputElement;
    const drop = h(
      'div',
      { class: 'crop__drop' },
      h('p', { class: 'crop__drop-t' }, 'Paste a photo here'),
      h('p', { class: 'crop__drop-s' }, 'Ctrl+V, or drop one in, or ', h('label', { for: 'crop-file', class: 'crop__pick' }, 'choose one'), '.'),
      file,
    );
    const pickStep = h('div', { class: 'crop__step' }, drop, link, err);

    const take = async (blob: Blob | null | undefined) => {
      if (!blob) return;
      err.textContent = '';
      if (!/^image\//.test(blob.type) && blob.type) return void (err.textContent = "That isn't a photo.");
      try {
        frame(await decode(blob));
      } catch {
        err.textContent = /hei[cf]/i.test(blob.type) || !blob.type
          ? "This browser can't open that photo (iPhone HEIC). Share it as JPEG, or screenshot it, and paste that."
          : "That photo couldn't be opened.";
      }
    };
    const onPaste = (e: ClipboardEvent) => {
      const f = Array.from(e.clipboardData?.files ?? []).find((x) => x.type.startsWith('image/'));
      if (f) {
        e.preventDefault();
        take(f);
      }
    };
    document.addEventListener('paste', onPaste);
    file.addEventListener('change', () => take(file.files?.[0]));
    drop.addEventListener('dragover', (e) => {
      e.preventDefault();
      drop.classList.add('is-over');
    });
    drop.addEventListener('dragleave', () => drop.classList.remove('is-over'));
    drop.addEventListener('drop', (e) => {
      e.preventDefault();
      drop.classList.remove('is-over');
      take(e.dataTransfer?.files?.[0]);
    });
    link.addEventListener('change', async () => {
      const id = driveId(link.value);
      if (!id) return void (err.textContent = "That doesn't look like a Drive link.");
      err.textContent = 'Fetching it from Drive…';
      try {
        await take(await fileBlob(id));
      } catch (e) {
        err.textContent = (e as Error).message;
      }
    });

    /* ---- step 2: framing ---- */
    const cv = h('canvas', { class: 'crop__canvas', width: 480, height: 600, 'aria-label': 'Drag to move the photo, scroll or pinch to zoom' }) as HTMLCanvasElement;
    const zoom = h('input', { type: 'range', min: '1', max: '4', step: '0.01', value: '1', class: 'crop__zoom', 'aria-label': 'Zoom' }) as HTMLInputElement;
    const use = h('button', { class: 'btn', type: 'button' }, 'Use this photo');
    const again = h('button', { class: 'btn btn--ghost', type: 'button' }, 'Another photo');
    const frameStep = h('div', { class: 'crop__step', hidden: true },
      h('div', { class: 'crop__view' }, cv),
      h('label', { class: 'crop__zl' }, h('span', {}, 'Zoom'), zoom),
      h('div', { class: 'crop__acts' }, again, use),
    );

    let img: ImageBitmap | HTMLImageElement | null = null;
    let s = 1, x = 0, y = 0; // zoom over "cover", and the photo's centre offset in canvas px
    const base = () => (img ? Math.max(cv.width / img.width, cv.height / img.height) : 1);
    const clamp = () => {
      if (!img) return;
      const k = base() * s, w = img.width * k, hh = img.height * k;
      x = Math.min((w - cv.width) / 2, Math.max(-(w - cv.width) / 2, x));
      y = Math.min((hh - cv.height) / 2, Math.max(-(hh - cv.height) / 2, y));
    };
    const draw = (c: HTMLCanvasElement) => {
      if (!img) return;
      const g = c.getContext('2d')!;
      const r = c.width / cv.width, k = base() * s * r;
      g.fillStyle = '#fff';
      g.fillRect(0, 0, c.width, c.height);
      g.imageSmoothingQuality = 'high';
      g.drawImage(img, c.width / 2 + x * r - (img.width * k) / 2, c.height / 2 + y * r - (img.height * k) / 2, img.width * k, img.height * k);
    };
    const paint = () => {
      clamp();
      draw(cv);
    };
    function frame(i: ImageBitmap | HTMLImageElement) {
      img = i;
      s = 1;
      x = y = 0;
      zoom.value = '1';
      pickStep.hidden = true;
      frameStep.hidden = false;
      paint();
      use.focus();
    }
    zoom.addEventListener('input', () => {
      s = Number(zoom.value);
      paint();
    });
    cv.addEventListener('wheel', (e) => {
      e.preventDefault();
      s = Math.min(4, Math.max(1, s * Math.exp(-e.deltaY / 400)));
      zoom.value = String(s);
      paint();
    }, { passive: false });
    const pts = new Map<number, { x: number; y: number }>();
    let pinch = 0;
    cv.addEventListener('pointerdown', (e) => {
      cv.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    });
    cv.addEventListener('pointermove', (e) => {
      const p = pts.get(e.pointerId);
      if (!p) return;
      const r = cv.width / cv.getBoundingClientRect().width;
      if (pts.size === 1) {
        x += (e.clientX - p.x) * r;
        y += (e.clientY - p.y) * r;
      }
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch) s = Math.min(4, Math.max(1, (s * d) / pinch));
        pinch = d;
        zoom.value = String(s);
      }
      paint();
    });
    const up = (e: PointerEvent) => {
      pts.delete(e.pointerId);
      pinch = 0;
    };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
    cv.addEventListener('keydown', (e) => {
      const m: Record<string, [number, number]> = { ArrowLeft: [12, 0], ArrowRight: [-12, 0], ArrowUp: [0, 12], ArrowDown: [0, -12] };
      if (m[e.key]) {
        e.preventDefault();
        x += m[e.key][0];
        y += m[e.key][1];
        paint();
      }
    });
    cv.tabIndex = 0;
    again.addEventListener('click', () => {
      frameStep.hidden = true;
      pickStep.hidden = false;
      file.value = '';
      link.value = '';
    });
    use.addEventListener('click', () => {
      const out = document.createElement('canvas');
      out.width = OUT_W;
      out.height = OUT_H;
      draw(out);
      out.toBlob((b) => finish(b), 'image/jpeg', 0.86);
    });

    const cancel = h('button', { class: 'crop__x', type: 'button', 'aria-label': 'Cancel' }, '×');
    cancel.addEventListener('click', () => finish(null));
    dlg.append(h('div', { class: 'crop__head' }, h('h2', { class: 'crop__t' }, `Photo for ${title}`), cancel), pickStep, frameStep);
    document.body.appendChild(dlg);
    dlg.showModal();
  });
}

/** A photo from a URL on this site, cut to 4:5 like the crop dialog does (the one-time setup uses it). */
export async function framedFromUrl(url: string): Promise<Blob> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status}`);
  const img = await decode(await res.blob());
  const w = Math.min(OUT_W, img.width), hh = Math.round((w * 5) / 4);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = hh;
  const k = Math.max(w / img.width, hh / img.height);
  const g = c.getContext('2d')!;
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, (w - img.width * k) / 2, (hh - img.height * k) / 2, img.width * k, img.height * k);
  return new Promise((ok, fail) => c.toBlob((b) => (b ? ok(b) : fail(new Error('encode'))), 'image/jpeg', 0.88));
}
