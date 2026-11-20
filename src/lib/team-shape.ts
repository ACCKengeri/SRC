/*
  The team as the About page lays it out: the coordinators in two groups,
  then a paper per domain and per department. Shared by the build (from
  src/content/team.json) and the browser (from the live Sheet), so both lay
  out exactly the same roster the same way.
*/
import type { Tier } from './live/schema';

export interface Face {
  name: string;
  role: string;
  tier: Tier;
  group?: string;
  domain?: string; // the domain page a head's group belongs to
  photo?: string; // Drive file ID
  hidden?: boolean;
}

export const tierHeading: Record<Tier, string> = {
  coordinators: 'Faculty coordinators',
  student_coordinators: 'Student coordinators',
  domain_heads: 'Domain heads',
  department_heads: 'Department heads',
};

const shown = (people: Face[]) => people.filter((p) => !p.hidden);

export function leadGroups(people: Face[]) {
  return (['coordinators', 'student_coordinators'] as const)
    .map((tier) => ({ tier, label: tierHeading[tier], people: shown(people).filter((p) => p.tier === tier) }))
    .filter((g) => g.people.length > 0);
}

export interface Crew {
  name: string;
  people: Face[];
  page?: string;
  link: string;
}

/** One paper per domain or department, in the roster's order. */
export function crews(people: Face[], tier: 'domain_heads' | 'department_heads', domainNames: Map<string, string>): Crew[] {
  const groups = new Map<string, Face[]>();
  for (const p of shown(people).filter((m) => m.tier === tier)) {
    const g = p.group || p.role;
    groups.set(g, [...(groups.get(g) ?? []), p]);
  }
  return [...groups].map(([name, members]) => {
    const page = members.find((m) => m.domain)?.domain;
    const pageName = page ? domainNames.get(page) : undefined;
    // "Animators" is the Animation domain; "Choir" is only part of Audio & Visual.
    const own = !!pageName && pageName.slice(0, 5).toLowerCase() === name.slice(0, 5).toLowerCase();
    return { name, people: members, page: pageName ? page : undefined, link: own ? 'Domain page' : `Part of ${pageName}` };
  });
}

export function crewSets(people: Face[], domainNames: Map<string, string>) {
  return (['domain_heads', 'department_heads'] as const)
    .map((tier) => ({ id: tier === 'domain_heads' ? 'domains' : 'departments', label: tierHeading[tier], crews: crews(people, tier, domainNames) }))
    .filter((s) => s.crews.length > 0);
}

/** A domain page's heads, in sub-teams when there's more than one (Audio & Visual). */
export function headGroups(people: Face[], domain: string) {
  const heads = shown(people).filter((p) => p.domain === domain);
  const by = new Map<string, Face[]>();
  for (const h of heads) by.set(h.group ?? '', [...(by.get(h.group ?? '') ?? []), h]);
  return [...by].map(([g, members]) => ({ group: by.size > 1 ? g : '', people: members }));
}

/** What the page shows, as one string: equal strings, nothing to redraw. */
export const teamSignature = (people: Face[]) =>
  JSON.stringify(shown(people).map((p) => [p.name, p.role, p.tier, p.group ?? '', p.domain ?? '', p.photo ?? '']));

// The papers and the tilt of every print, so the browser lays them as the build did.
export const PAPERS = ['p-butter', 'p-seafoam', 'p-sky', 'p-peach'];
export const TILT = [-0.6, 0.5, -0.3, 0.7, -0.5, 0.3];
export const PRINT_TILT = [-1.2, 0.9, -0.5, 1.1, -0.8, 0.6, -1, 0.4];
