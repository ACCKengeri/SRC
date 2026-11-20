import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { z } from 'astro/zod';

// All data here is real, carried over from the previous site (see
// docs/DESIGN_NOTES.md "Phase 2"), not invented. Schemas are strict —
// a malformed entry fails the build rather than rendering silently wrong.

const domains = defineCollection({
  loader: file('src/content/domains.json'),
  schema: z.object({
    id: z.string(),
    name: z.string(),
    subtitle: z.string(),
    order: z.number().int().positive(),
    bannerSource: z.string(),
    whatWeDo: z.string(),
    contributions: z.array(
      z.object({
        title: z.string(),
        description: z.string(),
      })
    ),
    moreOnUs: z.string(),
    joinLink: z.url(),
    // Optional, added with the redesign so the on-page [NEEDS COPY] tags on
    // each domain page can render from data once ACC supplies them.
    hoursPerWeek: z.string().optional(),
    headContact: z.string().optional(),
  }),
});

const teamTier = z.enum(['coordinators', 'student_coordinators', 'domain_heads', 'department_heads']);

const team = defineCollection({
  loader: file('src/content/team.json'),
  schema: z.object({
    id: z.string(),
    name: z.string(),
    role: z.string(),
    tier: teamTier,
    imageSource: z.string().nullable(),
    links: z.array(
      z.object({
        type: z.enum(['linkedin', 'instagram', 'whatsapp']),
        url: z.url(),
      })
    ),
    domains: z.array(z.string()),
    // the domain or department a head leads, as the roster names it
    group: z.string().optional(),
    // the same photo in the ACC Drive (Team photos), once the live Sheet has
    // it: lets the page tell the live roster apart from this one
    photoId: z.string().optional(),
  }),
});

const services = defineCollection({
  loader: file('src/content/services.json'),
  schema: z.object({
    id: z.string(),
    order: z.number().int().positive(),
    what: z.string(),
    time: z.string(),
    where: z.string(),
    frequency: z.enum(['daily', 'weekly', 'monthly', 'seasonal']),
    dayOfWeek: z
      .enum(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'])
      .optional(),
    note: z.string().optional(),
  }),
});

const campuses = defineCollection({
  loader: file('src/content/campuses.json'),
  schema: z.object({
    id: z.string(),
    name: z.string(),
    instagram: z.url(),
    primary: z.boolean(),
  }),
});

// Calendar events. Named "feasts" for historical reasons — it started as
// just the real 2026 feast-day seed data in Phase 2 — but `category` now
// makes it the general events collection the Calendar page reads. Only
// "feast" has real data right now; "event"/"liturgy"/"outreach" exist so
// the schema and the filter UI don't need reshaping the day real ACC event
// dates show up (see docs/CONTENT_NEEDED.md).
const feasts = defineCollection({
  loader: file('src/content/feasts.json'),
  schema: z.object({
    id: z.string(),
    title: z.string(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD'),
    time: z.string(),
    description: z.string(),
    category: z.enum(['feast', 'event', 'liturgy', 'outreach']).default('feast'),
  }),
});

// Traditional Catholic prayer texts — fixed liturgical text, not ACC's own
// copy. The Litany's invocations were verified against the Litany of
// Loreto's Latin text (see docs/DESIGN_NOTES.md "Phase 5") rather than
// transcribed from memory, given how easy a ~54-line enumerated list is to
// get subtly wrong.
const prayers = defineCollection({
  loader: file('src/content/prayers.json'),
  schema: z.object({
    id: z.string(),
    title: z.string(),
    lines: z.array(
      z.object({
        speaker: z.enum(['leader', 'all']),
        text: z.string(),
      })
    ),
  }),
});

const mysteries = defineCollection({
  loader: file('src/content/mysteries.json'),
  schema: z.object({
    id: z.string(),
    name: z.string(),
    days: z.array(z.string()),
    mysteries: z.array(z.string()).length(5),
  }),
});

export const collections = { domains, team, services, campuses, feasts, prayers, mysteries };
