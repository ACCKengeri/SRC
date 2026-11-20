import type { CollectionEntry } from 'astro:content';

export interface RosaryBead {
  kind: 'prayer' | 'mystery';
  prayerId?: string;
  mysteryTitle?: string;
  decade?: number; // 1-5, absent for the opening/closing
  beadInDecade?: number; // 1-10, only set on a Hail Mary inside a decade
}

/**
 * The full Rosary as one flat sequence of beads — generated from the
 * prayer ids and a mystery set's five titles, not hand-typed. A decade's
 * ten Hail Marys are ten separate beads (so the tracker can show
 * "Hail Mary 4 of 10"), everything else is one bead.
 */
export function buildRosarySequence(mysterySet: CollectionEntry<'mysteries'>['data']): RosaryBead[] {
  const beads: RosaryBead[] = [
    { kind: 'prayer', prayerId: 'sign-of-the-cross' },
    { kind: 'prayer', prayerId: 'apostles-creed' },
    { kind: 'prayer', prayerId: 'our-father' },
    { kind: 'prayer', prayerId: 'hail-mary' },
    { kind: 'prayer', prayerId: 'hail-mary' },
    { kind: 'prayer', prayerId: 'hail-mary' },
    { kind: 'prayer', prayerId: 'glory-be' },
  ];

  mysterySet.mysteries.forEach((title, i) => {
    const decade = i + 1;
    beads.push({ kind: 'mystery', decade, mysteryTitle: title });
    beads.push({ kind: 'prayer', prayerId: 'our-father', decade });
    for (let b = 1; b <= 10; b++) {
      beads.push({ kind: 'prayer', prayerId: 'hail-mary', decade, beadInDecade: b });
    }
    beads.push({ kind: 'prayer', prayerId: 'glory-be', decade });
    beads.push({ kind: 'prayer', prayerId: 'fatima-prayer', decade });
  });

  beads.push(
    { kind: 'prayer', prayerId: 'hail-holy-queen' },
    { kind: 'prayer', prayerId: 'rosary-closing-prayer' },
    { kind: 'prayer', prayerId: 'sign-of-the-cross' }
  );

  return beads;
}
