/* The studio's small kit for building its screens, with no framework. */

type Child = Node | string | number | null | undefined | false | Child[];
type Props = Record<string, string | number | boolean | undefined | null | EventListener>;

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Props = {}, ...kids: Child[]): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v as EventListener);
    else if (k === 'hidden') e.hidden = !!v;
    else if (k === 'value' && 'value' in e) (e as HTMLInputElement).value = String(v);
    else if (k === 'checked' && 'checked' in e) (e as HTMLInputElement).checked = !!v;
    else e.setAttribute(k, v === true ? '' : String(v));
  }
  add(e, kids);
  return e;
}
function add(e: Element, kids: Child[]) {
  for (const k of kids) {
    if (k === null || k === undefined || k === false) continue;
    if (Array.isArray(k)) add(e, k);
    else e.append(k instanceof Node ? k : String(k));
  }
}

/** Replaces an element's children, skipping the ones a condition left out. */
export const fill = (e: Element, ...kids: (Node | null | false | undefined)[]) => e.replaceChildren(...(kids.filter(Boolean) as Node[]));

let n = 0;
/** A labelled field. `input` is the control; returns the wrapper. */
export function field(label: string, input: HTMLElement, hint?: string, wide = false) {
  const id = input.id || `f${++n}`;
  input.id = id;
  if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement || input instanceof HTMLSelectElement) input.classList.add('fld');
  return h('div', { class: wide ? 'f f--wide' : 'f' }, h('label', { for: id, class: 'f__l' }, label), input, hint ? h('p', { class: 'f__h' }, hint) : null);
}

/** A text input bound to obj[key]; `changed` runs on every edit. */
export function text(obj: Record<string, string>, key: string, changed: () => void, attrs: Props = {}) {
  const i = h('input', { type: 'text', value: obj[key] ?? '', ...attrs }) as HTMLInputElement;
  i.addEventListener('input', () => {
    obj[key] = i.value;
    changed();
  });
  return i;
}
export function area(obj: Record<string, string>, key: string, changed: () => void, attrs: Props = {}) {
  const i = h('textarea', { rows: 2, ...attrs }) as HTMLTextAreaElement;
  i.value = obj[key] ?? '';
  i.addEventListener('input', () => {
    obj[key] = i.value;
    changed();
  });
  return i;
}
export function pick(obj: Record<string, string>, key: string, options: { value: string; label: string }[], changed: () => void) {
  const s = h('select', {}, ...options.map((o) => h('option', { value: o.value }, o.label))) as HTMLSelectElement;
  // a value typed into the Sheet by hand that isn't one of the options stays, as itself
  if (obj[key] && !options.some((o) => o.value === obj[key])) s.append(h('option', { value: obj[key] }, obj[key]));
  s.value = obj[key] ?? '';
  s.addEventListener('change', () => {
    obj[key] = s.value;
    changed();
  });
  return s;
}
/** A yes/no box for a column that holds "yes" or "". `on` is the word written when ticked. */
export function tick(obj: Record<string, string>, key: string, label: string, changed: () => void, on = 'yes', off = '') {
  const v = obj[key] ?? '';
  // "Show" is on unless it says no; "Every year" and the like are off unless they say yes
  const checked = off === 'no' ? !/^(n|no|false|0|hide|hidden|off)$/i.test(v) : /^(y|yes|true|1|show|shown|on)$/i.test(v);
  const i = h('input', { type: 'checkbox', checked }) as HTMLInputElement;
  i.addEventListener('change', () => {
    obj[key] = i.checked ? on : off;
    changed();
  });
  return h('label', { class: 'tick' }, i, h('span', {}, label));
}

/** A short message at the foot of the screen. */
export function say(msg: string, kind: 'ok' | 'err' | '' = '', ms = 4200) {
  const box = document.getElementById('toasts');
  if (!box) return;
  const t = h('p', { class: `toast ${kind ? `toast--${kind}` : ''}`, role: kind === 'err' ? 'alert' : 'status' }, msg);
  box.append(t);
  while (box.children.length > 3) box.firstElementChild!.remove();
  setTimeout(() => t.remove(), kind === 'err' ? ms * 2 : ms);
}

/** An inline "are you sure" in place of a button: resolves true on Yes. */
export function confirmIn(btn: HTMLElement, question: string, yes = 'Yes'): Promise<boolean> {
  return new Promise((done) => {
    const box = h('span', { class: 'ask', role: 'group' });
    const no = h('button', { type: 'button', class: 'mini' }, 'No');
    const ok = h('button', { type: 'button', class: 'mini mini--danger' }, yes);
    box.append(h('span', { class: 'ask__q' }, question), no, ok);
    btn.replaceWith(box);
    ok.focus();
    const end = (v: boolean) => {
      box.replaceWith(btn);
      if (!v) btn.focus();
      done(v);
    };
    no.addEventListener('click', () => end(false));
    ok.addEventListener('click', () => end(true));
  });
}

export const mini = (label: string, onclick: () => void, attrs: Props = {}) =>
  h('button', { type: 'button', class: 'mini', ...attrs, onclick: onclick as unknown as EventListener }, label);
