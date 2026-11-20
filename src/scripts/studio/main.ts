/*
  The studio's frame: sign-in, the check that this account may edit, the
  one-time setup, the sections, and the save bar.
*/
import { h, say } from './ui';
import { signIn, signOut, signedIn, whoAmI, canEdit, whenExpired, isAuthError, type Me } from './google';
import { loadAll, missingTabs, sheetTabs, dirtyTabs, onChange, saveAll, reload, discard, restored, stale, Conflict } from './store';
import { SECTIONS, LABELS, type SectionId, type Ctx } from './sections';
import { runSetup, type Seed } from './setup';
import { LIVE, sheetUrl, folderUrl } from '../../lib/live/config';
import { TABS, type TabId } from '../../lib/live/schema';

const root = document.getElementById('studio')!;
const seed = JSON.parse(document.getElementById('studio-seed')!.textContent!) as Seed & { domainsList: Ctx['domains'] };
const base = import.meta.env.BASE_URL;
const ctx: Ctx = { domains: seed.domainsList, base };
let me: Me | null = null;
const who = () => (me ? me.name.split(' ')[0] || me.name : 'Someone');

/* ---------------- screens before the studio ---------------- */

function card(...kids: (Node | string | null)[]) {
  root.replaceChildren(h('div', { class: 'gate' }, h('div', { class: 'gate__card sheet' }, ...kids)));
}

function gate(msg = '') {
  const btn = h('button', { type: 'button', class: 'btn' }, 'Sign in with Google');
  const err = h('p', { class: 'gate__err', role: 'alert' }, msg);
  btn.addEventListener('click', async () => {
    btn.setAttribute('disabled', '');
    err.textContent = '';
    try {
      await signIn();
      await start();
    } catch (e) {
      err.textContent = (e as Error).message;
      btn.removeAttribute('disabled');
    }
  });
  card(
    h('h1', { class: 'gate__t' }, 'Studio'),
    h('p', { class: 'gate__s' }, 'Change the team, the calendar, Mass times and events. Sign in with the ACC Google account, or one the ACC Sheet is shared with.'),
    h('div', { class: 'gate__row' }, btn, h('a', { class: 'gate__back', href: `${base}about/` }, 'Back to the site')),
    err,
  );
}

function refused() {
  const other = h('button', { type: 'button', class: 'btn btn--ghost' }, 'Use another account');
  other.addEventListener('click', async () => {
    signOut();
    gate();
  });
  card(
    h('h1', { class: 'gate__t' }, 'Not this account'),
    h('p', { class: 'gate__s' }, `${me?.name ?? 'This account'} can't edit the ACC Sheet. Sign in with the ACC account, or ask whoever runs it to share the Sheet and the ACC Website folder with you as an editor.`),
    other,
  );
}

async function setup(missing: TabId[]) {
  const lines = h('ol', { class: 'setup__log', 'aria-live': 'polite' });
  const go = h('button', { type: 'button', class: 'btn' }, 'Set it up');
  const fresh = missing.length === 7;
  go.addEventListener('click', async () => {
    go.setAttribute('disabled', '');
    try {
      await runSetup(seed, missing, sheetTabs, base, who(), (l) => {
        lines.append(h('li', {}, l));
        lines.lastElementChild?.scrollIntoView({ block: 'nearest' });
      });
      await loadAll();
      studio();
      say('The Sheet is set up. Everything below is live.', 'ok', 6000);
    } catch (e) {
      lines.append(h('li', { class: 'is-err' }, (e as Error).message));
      go.removeAttribute('disabled');
      go.textContent = 'Try again';
    }
  });
  card(
    h('h1', { class: 'gate__t' }, fresh ? 'One step first' : 'A few tabs are missing'),
    h('p', { class: 'gate__s' }, fresh
      ? 'The Sheet is empty. Setting it up makes its tabs and fills them with what the site shows today: the team and their photos, the calendar, Mass times and the contacts. It takes about a minute.'
      : `The Sheet has no ${missing.map((t) => TABS[t].name).join(', ')} tab. Setting up adds ${missing.length === 1 ? 'it' : 'them'}, filled with what the site shows today; the other tabs stay as they are.`),
    go,
    lines,
  );
}

/* ---------------- the studio ---------------- */

let current: SectionId = 'team';
function studio() {
  const nav = h('nav', { class: 'nav', 'aria-label': 'Sections' });
  const panel = h('main', { class: 'panel', id: 'panel', tabindex: '-1' });
  const save = h('button', { type: 'button', class: 'btn' }, 'Save to the site');
  const undo = h('button', { type: 'button', class: 'btn btn--ghost' }, 'Discard');
  const what = h('p', { class: 'save__what' });
  const bar = h('div', { class: 'save', role: 'region', 'aria-label': 'Unsaved changes', hidden: true }, what, h('div', { class: 'save__acts' }, undo, save));

  const sections = Object.keys(SECTIONS) as SectionId[];
  const tabOf: Partial<Record<SectionId, TabId[]>> = { team: ['team'], calendar: ['calendar'], events: ['events'], services: ['services'], settings: ['settings', 'domains'] };
  const links = sections.map((s) => {
    const a = h('a', { href: `#${s}`, class: 'nav__a' }, LABELS[s], h('span', { class: 'nav__dot', 'aria-hidden': 'true' }));
    return a;
  });
  nav.append(...links);

  const show = (s: SectionId) => {
    current = s;
    links.forEach((a, i) => (sections[i] === s ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
    SECTIONS[s](panel, ctx);
    document.title = `${LABELS[s]} | Studio | ACC`;
  };
  const fromHash = () => (sections.includes(location.hash.slice(1) as SectionId) ? (location.hash.slice(1) as SectionId) : 'team');
  window.onhashchange = () => {
    show(fromHash());
    panel.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  };

  const refresh = () => {
    const d = dirtyTabs();
    bar.hidden = !d.length;
    what.textContent = d.length ? `Unsaved: ${d.map((t) => TABS[t].name).join(', ')}` : '';
    links.forEach((a, i) => a.classList.toggle('is-dirty', (tabOf[sections[i]] ?? []).some((t) => d.includes(t))));
  };
  onChange(refresh);

  undo.addEventListener('click', () => {
    discard();
    show(current);
    say('Back to what the Sheet has.');
  });
  const doSave = async (force = false) => {
    save.setAttribute('disabled', '');
    save.textContent = 'Saving…';
    try {
      const said = await saveAll(who(), force);
      say(`Saved. ${said.join('. ')}. The site shows it within five minutes (at once with "Open the site").`, 'ok', 7000);
      if (current === 'log') show('log');
    } catch (e) {
      if (e instanceof Conflict) {
        const names = e.tabs.map((t) => TABS[t].name).join(', ');
        what.replaceChildren(
          h('span', {}, `Someone changed ${names} in the Sheet since you opened it. `),
          h('button', { type: 'button', class: 'mini', onclick: (async () => {
            await reload(e.tabs);
            show(current);
            say(`Loaded the Sheet's ${names}. Your changes there were set aside.`);
          }) as unknown as EventListener }, 'Load theirs'),
          h('button', { type: 'button', class: 'mini mini--danger', onclick: (() => doSave(true)) as unknown as EventListener }, 'Save mine over it'),
        );
      } else if (!isAuthError(e)) say((e as Error).message, 'err');
    } finally {
      save.removeAttribute('disabled');
      save.textContent = 'Save to the site';
    }
  };
  save.addEventListener('click', () => doSave());

  const out = h('button', { type: 'button', class: 'mini' }, 'Sign out');
  out.addEventListener('click', () => {
    signOut();
    gate();
  });
  const top = h('header', { class: 'top' },
    h('a', { class: 'top__brand', href: `${base}` }, 'ACC ', h('span', {}, 'Studio')),
    h('div', { class: 'top__links' },
      h('a', { class: 'mini', href: `${base}?fresh`, target: '_blank', rel: 'noopener' }, 'Open the site'),
      h('a', { class: 'mini', href: sheetUrl, target: '_blank', rel: 'noopener' }, 'The Sheet'),
      h('a', { class: 'mini', href: folderUrl(LIVE.rootFolder), target: '_blank', rel: 'noopener' }, 'Drive'),
    ),
    h('div', { class: 'top__me' }, me?.photo ? h('img', { src: me.photo, alt: '', class: 'top__av', referrerpolicy: 'no-referrer' }) : null, h('span', { class: 'top__name' }, me?.name ?? ''), out),
  );
  const expired = h('div', { class: 'expired', role: 'alert', hidden: true },
    h('p', {}, 'Your sign-in has run out (Google keeps it an hour). Nothing you changed is lost.'),
    h('button', { type: 'button', class: 'btn', onclick: (async () => {
      try {
        await signIn(me?.email);
        expired.hidden = true;
        say('Signed in again.', 'ok');
      } catch (e) {
        say((e as Error).message, 'err');
      }
    }) as unknown as EventListener }, 'Sign in again'),
  );
  whenExpired(() => (expired.hidden = false));

  root.replaceChildren(top, expired, h('div', { class: 'body' }, nav, panel), bar);
  show(fromHash());
  refresh();
  if (restored.length) say(`Brought back your unsaved changes to ${restored.map((t) => TABS[t].name).join(', ')}.`, 'ok', 7000);
  if (stale.length) say(`Unsaved changes to ${stale.map((t) => TABS[t].name).join(', ')} from earlier were set aside: the Sheet changed since.`, 'err');
}

/* ---------------- start ---------------- */

async function start() {
  card(h('p', { class: 'gate__s' }, 'Opening the Sheet…'));
  try {
    me = await whoAmI();
    if (!(await canEdit(LIVE.sheetId))) return refused();
    await loadAll();
    const missing = missingTabs();
    if (missing.length) return setup(missing);
    studio();
  } catch (e) {
    if (isAuthError(e)) return gate('Your sign-in has run out. Sign in again.');
    gate(`Google couldn't be reached: ${(e as Error).message}`);
  }
}

if (signedIn()) start();
else gate();
