import { getCollection } from 'astro:content';
import roster from '../content/team.json';
import type { Face } from './team-shape';

// The collection comes back sorted by id; the roster's own order is the one
// to show (coordinators first, then each domain and department in turn).
const rosterOrder = new Map(roster.map((p, i) => [p.id, i]));

export async function getTeam() {
  return (await getCollection('team'))
    .map((m) => m.data)
    .sort((a, b) => (rosterOrder.get(a.id) ?? 0) - (rosterOrder.get(b.id) ?? 0));
}

/** The built-in roster as the shared layout code wants it, with each bundled photo. */
export type SnapFace = Face & { imageSource: string | null };
export async function getFaces(): Promise<SnapFace[]> {
  return (await getTeam()).map((m) => ({
    name: m.name,
    role: m.role,
    tier: m.tier,
    group: m.group,
    domain: m.domains[0],
    photo: m.photoId,
    imageSource: m.imageSource,
  }));
}
