/*
  The studio's editors, one per tab of the Sheet. Each draws its rows, and
  every edit goes straight into the store's rows (store.ts), which keeps
  the save bar and the draft up to date. Lists redraw only when rows are
  added, removed or moved, so typing never loses its place.
*/
import { h, fill, field, text, area, pick, tick, mini, say, confirmIn } from './ui';
import { rows, setRows, changed, logRows, isDirty, sheetTabs, type Row } from './store';
import { pickPhoto } from './crop';
import { upload, createFolder, copyTab, isAuthError } from './google';
import { SETTINGS, tierOptions, readTier, tierLabel, driveId, slug, type Tier } from '../../lib/live/schema';
import { photoUrl, photoUrlAlt, fetchEventFiles, shapeEvents, eventsFolder, parseFolderName, type LiveEvent } from '../../lib/live/drive';
import { LIVE, folderUrl } from '../../lib/live/config';
import { initials } from '../../lib/live/dom';

export interface Ctx {
  domains: { id: string; name: string }[];
  base: string;
}

const head = (title: string, lead: string, ...acts: (Node | null)[]) =>
  h('header', { class: 'sec__head' }, h('div', {}, h('h2', { class: 'sec__t' }, title), h('p', { class: 'sec__lead' }, lead)), h('div', { class: 'sec__acts' }, ...acts));
const settingRow = (key: string) => rows('settings').find((r) => r.key === key);
const settingValue = (key: string) => settingRow(key)?.value ?? '';
const teamFolder = () => driveId(settingValue('team_folder')) || LIVE.teamFolder;
const isoToday = () => {
  const d = new Date(), p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
function move<T>(list: T[], i: number, j: number) {
  const [x] = list.splice(i, 1);
  list.splice(j, 0, x);
}
const fail = (e: unknown) => say((e as Error).message, 'err');
/** A Drive photo that tries Google's second image host before giving up. */
function img(id: string, w: number, broken?: () => void) {
  const i = h('img', { src: photoUrl(id, w), alt: '', loading: 'lazy', decoding: 'async' }) as HTMLImageElement;
  i.addEventListener('error', () => {
    if (i.dataset.alt) return broken?.();
    i.dataset.alt = '1';
    i.src = photoUrlAlt(id, w);
  });
  return i;
}

/* ================= Team ================= */

export function team(panel: HTMLElement, ctx: Ctx) {
  const list = rows('team');
  // read hand-typed tiers and domain names the way the site does, so the pickers show them
  const domainId = new Map(ctx.domains.flatMap((d) => [[d.id.toLowerCase(), d.id], [d.name.toLowerCase(), d.id]]));
  for (const r of list) {
    const t = readTier(r.tier);
    if (t && r.tier !== tierLabel(t)) r.tier = tierLabel(t);
    const d = domainId.get((r.domain || '').toLowerCase());
    if (d && d !== r.domain) r.domain = d;
  }
  const broken = new Set<string>();
  const groups = [...new Set(list.map((r) => r.group).filter(Boolean))];

  const draw = () => {
    const tierOf = (r: Row) => readTier(r.tier);
    const health: string[] = [];
    const noPhoto = list.filter((r) => !r.photo && !/^n/i.test(r.show)).map((r) => r.name || 'someone unnamed');
    if (noPhoto.length) health.push(`No photo yet: ${noPhoto.join(', ')}.`);
    const caps = list.filter((r) => r.name.length > 3 && r.name === r.name.toUpperCase()).map((r) => r.name);
    if (caps.length) health.push(`Written in capitals (the site shows names as typed): ${caps.join(', ')}.`);
    const lost = list.filter((r) => !tierOf(r)).map((r) => r.name || 'a row');
    if (lost.length) health.push(`Not shown, because they have no level: ${lost.join(', ')}.`);
    if (broken.size) health.push(`These photos don't open (removed from Drive?): ${list.filter((r) => broken.has(r.photo)).map((r) => r.name).join(', ')}.`);

    const yearBtn = mini('Start a new year', async () => {
      if (isDirty('team')) return say('Save the team first, so last year is kept as it really was.', 'err');
      // the academic year being put away: June to August closes the one just ended
      const now = new Date(), y = now.getMonth() <= 7 ? now.getFullYear() - 1 : now.getFullYear();
      const label = `Team ${y}-${String((y + 1) % 100).padStart(2, '0')}`;
      const tab = sheetTabs.find((t) => t.title === 'Team');
      if (!tab) return;
      if (!(await confirmIn(yearBtn, `Keep a copy as "${label}"?`, 'Keep a copy'))) return;
      try {
        await copyTab(tab.id, sheetTabs.some((t) => t.title === label) ? `${label} (2)` : label);
        say(`Last year's team is kept in the tab "${label}". Now change the roster for the new year and save.`, 'ok', 8000);
      } catch (e) {
        fail(e);
      }
    });

    const tiers = tierOptions.map(({ value }) => value as Tier);
    fill(panel, 
      head('Team', 'Everyone on the About page and the domain pages, in the order shown there.', yearBtn),
      health.length ? h('ul', { class: 'health' }, ...health.map((x) => h('li', {}, x))) : null,
      h('datalist', { id: 'groups' }, ...groups.map((g) => h('option', { value: g }))),
      ...tiers.map((tier) => {
        const people = list.filter((r) => tierOf(r) === tier);
        const add = mini('Add a person', () => {
          const at = list.reduce((last, r, i) => (tierOf(r) === tier ? i : last), list.length - 1);
          list.splice(at + 1, 0, { name: '', role: '', tier: tierLabel(tier), group: '', domain: '', photo: '', show: 'yes' });
          changed();
          draw();
          (panel.querySelector(`[data-tier="${tier}"] .person:nth-child(${people.length + 1}) input`) as HTMLInputElement | null)?.focus();
        });
        return h('section', { class: 'grp', 'data-tier': tier },
          h('div', { class: 'grp__head' }, h('h3', { class: 'grp__t' }, tierOptions.find((o) => o.value === tier)!.label + 's', h('span', { class: 'grp__n' }, String(people.length))), add),
          h('ol', { class: 'people' }, ...people.map((r, k) => person(r, k, people))),
        );
      }),
      list.some((r) => !tierOf(r)) ? h('section', { class: 'grp' }, h('h3', { class: 'grp__t' }, 'Without a level'), h('ol', { class: 'people' }, ...list.filter((r) => !tierOf(r)).map((r, k, a) => person(r, k, a)))) : null,
    );
  };

  function thumb(r: Row) {
    const b = h('button', { type: 'button', class: 'thumb', 'aria-label': r.photo ? `Change ${r.name}'s photo` : `Add a photo of ${r.name}` });
    if (r.photo) {
      b.append(
        img(r.photo, 240, () => {
          if (!broken.has(r.photo)) {
            broken.add(r.photo);
            draw();
          }
        }),
      );
    } else b.append(h('span', { class: 'thumb__ini' }, r.name ? initials(r.name) : '+'));
    b.append(h('span', { class: 'thumb__cue' }, r.photo ? 'Change' : 'Add photo'));
    b.addEventListener('click', async () => {
      const blob = await pickPhoto(r.name || 'this person');
      if (!blob) return;
      b.classList.add('is-busy');
      b.querySelector('.thumb__cue')!.textContent = 'Saving…';
      try {
        const f = await upload(blob, `${slug(r.name || 'person')}-${Date.now().toString(36)}.jpg`, teamFolder(), (p) => {
          b.querySelector('.thumb__cue')!.textContent = `${Math.round(p * 100)}%`;
        });
        r.photo = f.id;
        changed();
        draw();
        say(`Photo saved to Drive. Save the team to put it on the site.`, 'ok');
      } catch (e) {
        b.classList.remove('is-busy');
        fail(e);
      }
    });
    return b;
  }

  function person(r: Row, k: number, peers: Row[]) {
    const i = list.indexOf(r);
    const up = mini('Up', () => {
      move(list, i, list.indexOf(peers[k - 1]));
      changed();
      draw();
    }, { 'aria-label': `Move ${r.name} up`, disabled: k === 0 });
    const down = mini('Down', () => {
      move(list, i, list.indexOf(peers[k + 1]));
      changed();
      draw();
    }, { 'aria-label': `Move ${r.name} down`, disabled: k === peers.length - 1 });
    const del = mini('Remove', async () => {
      if (!(await confirmIn(del, `Remove ${r.name || 'this person'}?`, 'Remove'))) return;
      list.splice(list.indexOf(r), 1);
      changed();
      draw();
    });
    const tier = readTier(r.tier);
    const heads = tier === 'domain_heads' || tier === 'department_heads';
    return h('li', { class: `person${/^n/i.test(r.show) ? ' is-off' : ''}` },
      thumb(r),
      h('div', { class: 'person__f' },
        field('Name', text(r, 'name', changed, { autocomplete: 'off' })),
        field('Role', text(r, 'role', changed, { placeholder: heads ? 'like Liturgy Head' : 'like Faculty Coordinator' })),
        heads ? field(tier === 'domain_heads' ? 'Domain' : 'Department', text(r, 'group', changed, { list: 'groups', placeholder: 'like Choir' }), 'People with the same name here share a paper on the About page.') : null,
        heads || tier === null ? field('Domain page', pick(r, 'domain', [{ value: '', label: 'None' }, ...ctx.domains.map((d) => ({ value: d.id, label: d.name }))], changed), 'Shows them as a head on that page.') : null,
        field('Level', pick(r, 'tier', tierOptions.map((o) => ({ value: o.label, label: o.label })), () => {
          changed();
          draw();
        })),
      ),
      h('div', { class: 'person__a' }, tick(r, 'show', 'Shown', () => {
        changed();
        draw();
      }, 'yes', 'no'), h('span', { class: 'row-acts' }, up, down, del)),
    );
  }
  draw();
}

/* ================= Calendar ================= */

export function calendar(panel: HTMLElement) {
  const list = rows('calendar');
  const cats = ['feast', 'event', 'liturgy', 'outreach'].map((v) => ({ value: v, label: { feast: 'Feast', event: 'ACC event', liturgy: 'Liturgy', outreach: 'Outreach' }[v]! }));
  const draw = () => {
    const today = isoToday();
    const by = (a: Row, b: Row) => (a.date.slice(5) + a.date).localeCompare(b.date.slice(5) + b.date);
    const ahead = list.filter((r) => /^y/i.test(r.yearly) || !r.date || r.date >= today).sort((a, b) => (/^y/i.test(a.yearly) || /^y/i.test(b.yearly) ? by(a, b) : a.date.localeCompare(b.date)));
    const past = list.filter((r) => !ahead.includes(r)).sort((a, b) => b.date.localeCompare(a.date));
    const add = mini('Add a date', () => {
      list.unshift({ date: today, time: '', title: '', description: '', category: 'event', yearly: '' });
      changed();
      draw();
      (panel.querySelector('.dates .date input') as HTMLInputElement | null)?.focus();
    });
    const nextYear = new Date().getFullYear() + 1;
    const moving = ['Easter', 'Good Friday', 'Pentecost', 'Corpus Christi', 'Ash Wednesday'];
    const missingNext = moving.filter((m) => list.some((r) => r.title.includes(m)) && !list.some((r) => r.title.includes(m) && r.date.startsWith(String(nextYear))));
    fill(panel, 
      head('Calendar', 'Feasts and ACC events. Tick "Every year" for a date that never moves; it then shows every year by itself.', add),
      missingNext.length ? h('ul', { class: 'health' }, h('li', {}, `These move each year and aren't in for ${nextYear} yet: ${missingNext.join(', ')}.`)) : null,
      h('ol', { class: 'dates' }, ...ahead.map(date)),
      past.length ? h('details', { class: 'past' }, h('summary', {}, `Past dates (${past.length})`), h('ol', { class: 'dates' }, ...past.map(date))) : null,
    );
  };
  function date(r: Row) {
    const d = h('input', { type: 'date', value: r.date }) as HTMLInputElement;
    d.addEventListener('input', () => {
      r.date = d.value;
      changed();
    });
    const del = mini('Remove', async () => {
      if (!(await confirmIn(del, `Remove ${r.title || 'this date'}?`, 'Remove'))) return;
      list.splice(list.indexOf(r), 1);
      changed();
      draw();
    });
    return h('li', { class: 'date' },
      h('div', { class: 'date__f' },
        field('Date', d),
        field('Time', text(r, 'time', changed, { placeholder: 'All day' })),
        field('Title', text(r, 'title', changed)),
        field('Kind', pick(r, 'category', cats, changed)),
        field('Description', area(r, 'description', changed), undefined, true),
      ),
      h('div', { class: 'person__a' }, tick(r, 'yearly', 'Every year', changed), h('span', { class: 'row-acts' }, del)),
    );
  }
  draw();
}

/* ================= Services ================= */

export function services(panel: HTMLElement) {
  const list = rows('services');
  const draw = () => {
    fill(panel, 
      head('Mass times', 'The week as the Calendar page shows it, in this order.', mini('Add a service', () => {
        list.push({ when: 'Daily', what: '', time: '', where: '', note: '' });
        changed();
        draw();
      })),
      h('datalist', { id: 'whens' }, ...['Daily', 'Weekly', 'Sundays', 'First Friday', 'In Lent'].map((v) => h('option', { value: v }))),
      h('ol', { class: 'dates' }, ...list.map((r, i) => {
        const del = mini('Remove', async () => {
          if (!(await confirmIn(del, `Remove ${r.what || 'this'}?`, 'Remove'))) return;
          list.splice(i, 1);
          changed();
          draw();
        });
        return h('li', { class: 'date' },
          h('div', { class: 'date__f' },
            field('How often', text(r, 'when', changed, { list: 'whens' })),
            field('What', text(r, 'what', changed)),
            field('Time', text(r, 'time', changed)),
            field('Where', text(r, 'where', changed)),
            field('Note', text(r, 'note', changed, { placeholder: 'like First Friday only' }), undefined, true),
          ),
          h('div', { class: 'person__a' }, h('span', {}), h('span', { class: 'row-acts' },
            mini('Up', () => (move(list, i, i - 1), changed(), draw()), { disabled: i === 0, 'aria-label': `Move ${r.what} up` }),
            mini('Down', () => (move(list, i, i + 1), changed(), draw()), { disabled: i === list.length - 1, 'aria-label': `Move ${r.what} down` }),
            del)),
        );
      })),
    );
  };
  draw();
}

/* ================= Settings and domains ================= */

export function settings(panel: HTMLElement, ctx: Ctx) {
  const list = rows('settings');
  for (const s of SETTINGS) if (!list.some((r) => r.key === s.key)) list.push({ key: s.key, value: '', about: s.about || s.label });
  const doms = rows('domains');
  for (const d of ctx.domains) if (!doms.some((r) => r.domain === d.id || r.domain.toLowerCase() === d.name.toLowerCase())) doms.push({ domain: d.id, contact: '', hours: '' });

  const one = (key: string) => {
    const s = SETTINGS.find((x) => x.key === key)!, r = list.find((x) => x.key === key)!;
    if (key === 'notice_show') return h('div', { class: 'f' }, tick(r, 'value', s.label, changed, 'yes', 'no'), h('p', { class: 'f__h' }, 'The ticket under the card at the top of the home page.'));
    return field(s.label, text(r, 'value', changed, { placeholder: s.fallback || undefined, type: key === 'email' ? 'email' : 'text' }), s.about || (s.fallback ? `Blank shows ${s.fallback}` : undefined), true);
  };
  const box = (title: string, keys: string[], note?: string) =>
    h('section', { class: 'grp' }, h('h3', { class: 'grp__t' }, title), note ? h('p', { class: 'sec__lead' }, note) : null, h('div', { class: 'form' }, ...keys.map(one)));

  fill(panel, 
    head('Settings', 'Contacts, the home notice, and each domain’s details. A blank field shows what the site shipped with.'),
    box('Contact', ['email', 'whatsapp']),
    box('Home notice', ['notice_show', 'notice_title', 'notice_when', 'notice_link_label', 'notice_link']),
    box('Instagram', SETTINGS.filter((s) => s.key.startsWith('instagram_')).map((s) => s.key)),
    h('section', { class: 'grp' }, h('h3', { class: 'grp__t' }, 'Domains'), h('p', { class: 'sec__lead' }, 'Shown on each domain’s page and on the Domains page.'),
      ...ctx.domains.map((d) => {
        const r = doms.find((x) => x.domain === d.id || x.domain.toLowerCase() === d.name.toLowerCase())!;
        return h('div', { class: 'dom' }, h('h4', { class: 'dom__t' }, d.name), h('div', { class: 'form form--2' },
          field('How to reach the heads', text(r, 'contact', changed, { placeholder: 'like Write to the heads at ...' }), undefined, true),
          field('Hours a week', text(r, 'hours', changed, { placeholder: 'like 3 hours' })),
        ));
      })),
    box('Folders', ['events_folder', 'team_folder'], 'Only change these if the folders in Drive are replaced.'),
  );
}

/* ================= Events ================= */

export function events(panel: HTMLElement) {
  const meta = rows('events');
  let shown: LiveEvent[] = [];
  const folder = () => eventsFolder({ events_folder: settingValue('events_folder') });
  const status = h('p', { class: 'sec__lead' }, 'Reading the Events folder…');

  const name = h('input', { type: 'text', placeholder: 'like Carol Night', autocomplete: 'off' }) as HTMLInputElement;
  const when = h('input', { type: 'date', value: isoToday() }) as HTMLInputElement;
  const make = h('button', { type: 'submit', class: 'btn' }, 'Make the folder');
  const form = h('form', { class: 'newev' }, field('New event', name), field('Date', when), make);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!name.value.trim()) return name.focus();
    make.setAttribute('disabled', '');
    try {
      const n = `${when.value ? `${when.value} ` : ''}${name.value.trim()}`;
      await createFolder(n, folder());
      say(`"${n}" is in Drive. Add its photos below, or straight into the folder in Drive.`, 'ok', 7000);
      name.value = '';
      await load();
    } catch (err) {
      fail(err);
    } finally {
      make.removeAttribute('disabled');
    }
  });

  const listEl = h('div', { class: 'evs' });
  fill(panel, 
    head('Events', 'Every folder in the Events folder is an event on the Media page, newest first. Name a folder "2026-12-20 Carol Night" and put its photos and videos in it.',
      h('a', { class: 'mini', href: folderUrl(folder()), target: '_blank', rel: 'noopener' }, 'Open in Drive')),
    form,
    status,
    listEl,
  );

  async function load() {
    try {
      const raw = await fetchEventFiles(folder());
      shown = shapeEvents(raw, [], true);
      status.textContent = shown.length ? `${shown.length} event${shown.length === 1 ? '' : 's'}. Changes here go on the site when you save.` : 'No events yet. Make one above.';
      draw();
    } catch (e) {
      status.textContent = '';
      listEl.replaceChildren(h('ul', { class: 'health' }, h('li', {}, `The site can't read the Events folder (${(e as Error).message}). In Drive, share it as "Anyone with the link: Viewer".`)));
    }
  }
  const noteFor = (id: string) => {
    let r = meta.find((m) => driveId(m.folder) === id);
    if (!r) meta.push((r = { folder: id, title: '', description: '', cover: '', hidden: '', featured: '' }));
    return r;
  };
  function draw() {
    listEl.replaceChildren(...shown.map(card));
  }
  function card(ev: LiveEvent) {
    const r = noteFor(ev.id);
    const parsed = parseFolderName(ev.title);
    const warn: string[] = [];
    if (!ev.date) warn.push('No date in the folder name, so it sorts by when the folder was made. Rename it like "2026-12-20 Name".');
    if (!ev.items.length) warn.push('Empty: it stays off the site until it has a photo.');
    else if (!ev.items.some((x) => x.kind === 'image')) warn.push('Only videos: add one photo for its cover.');
    const photos = ev.items.filter((x) => x.kind === 'image');
    const cover = driveId(r.cover) || ev.cover?.id || '';
    const covers = h('div', { class: 'covers', role: 'group', 'aria-label': 'Cover photo' }, ...photos.slice(0, 30).map((p) => {
      const b = h('button', { type: 'button', class: `cov${p.id === cover ? ' is-on' : ''}`, 'aria-pressed': String(p.id === cover), 'aria-label': `Use ${p.name} as the cover` }, img(p.id, 160));
      b.addEventListener('click', () => {
        r.cover = p.id;
        changed();
        covers.querySelectorAll('.cov').forEach((c) => {
          c.classList.toggle('is-on', c === b);
          c.setAttribute('aria-pressed', String(c === b));
        });
      });
      return b;
    }));
    const files = h('input', { type: 'file', multiple: true, accept: 'image/*,video/*', class: 'sr-only', id: `up-${ev.id}` }) as HTMLInputElement;
    const bar = h('p', { class: 'up__s', role: 'status' });
    const sendAll = async (list: File[]) => {
      if (!list.length) return;
      let i = 0;
      try {
        for (const f of list) {
          i++;
          await upload(f, f.name, ev.id, (p) => (bar.textContent = `Uploading ${i} of ${list.length}: ${Math.round(p * 100)}%`));
        }
        bar.textContent = `${list.length} added.`;
        await load();
      } catch (e) {
        bar.textContent = '';
        if (!isAuthError(e)) fail(e);
      }
    };
    files.addEventListener('change', () => sendAll(Array.from(files.files ?? [])));
    const el = h('article', { class: `ev${/^y/i.test(r.hidden) ? ' is-off' : ''}` },
      h('div', { class: 'ev__cover' }, cover ? img(cover, 480) : h('span', { class: 'ev__none' }, 'No photo')),
      h('div', { class: 'ev__body' },
        h('h3', { class: 'ev__t' }, r.title || parsed.title),
        h('p', { class: 'ev__m' }, [ev.date || 'no date', `${photos.length} photo${photos.length === 1 ? '' : 's'}`, ev.items.length - photos.length ? `${ev.items.length - photos.length} video${ev.items.length - photos.length === 1 ? '' : 's'}` : ''].filter(Boolean).join(', ')),
        warn.length ? h('ul', { class: 'health health--s' }, ...warn.map((w) => h('li', {}, w))) : null,
        h('div', { class: 'form form--2' },
          field('Title on the site', text(r, 'title', changed, { placeholder: parsed.title })),
          field('Description', area(r, 'description', changed, { placeholder: ev.about ? 'Blank uses the About doc in the folder' : '' }), undefined, true),
        ),
        h('div', { class: 'ev__ticks' },
          tick(r, 'hidden', 'Hidden from the site', () => {
            changed();
            el.classList.toggle('is-off', /^y/i.test(r.hidden));
          }),
          tick(r, 'featured', 'Leads the Media page', changed),
        ),
        photos.length > 1 ? h('details', { class: 'ev__pick' }, h('summary', {}, 'Choose the cover'), covers) : null,
        h('div', { class: 'up' },
          h('label', { class: 'mini', for: files.id }, 'Add photos or videos'),
          files,
          h('a', { class: 'mini', href: folderUrl(ev.id), target: '_blank', rel: 'noopener' }, 'Open in Drive'),
          bar,
        ),
      ),
    );
    el.addEventListener('dragover', (e) => {
      e.preventDefault();
      el.classList.add('is-over');
    });
    el.addEventListener('dragleave', () => el.classList.remove('is-over'));
    el.addEventListener('drop', (e) => {
      e.preventDefault();
      el.classList.remove('is-over');
      sendAll(Array.from(e.dataTransfer?.files ?? []).filter((f) => /^(image|video)\//.test(f.type)));
    });
    return el;
  }
  load();
}

/* ================= Log ================= */

export function log(panel: HTMLElement) {
  const list = [...logRows()].reverse().slice(0, 200);
  fill(panel, 
    head('Log', 'Every save from the studio, newest first. The Sheet’s own version history (File, Version history) can bring back anything.'),
    list.length
      ? h('ol', { class: 'log' }, ...list.map((r) => h('li', {}, h('span', { class: 'log__w' }, r.when), h('span', { class: 'log__who' }, r.who), h('span', {}, r.what))))
      : h('p', { class: 'sec__lead' }, 'Nothing saved yet.'),
  );
}

export const SECTIONS = { team, calendar, events, services, settings, log } as const;
export type SectionId = keyof typeof SECTIONS;
export const LABELS: Record<SectionId, string> = { team: 'Team', calendar: 'Calendar', events: 'Events', services: 'Mass times', settings: 'Settings', log: 'Log' };
export { setRows };
