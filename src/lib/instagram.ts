import type { ImageMetadata } from 'astro';

// Build-time fallback for the Instagram section. These are real ACC event
// photos already in the repo, standing in for the six latest @acc_kengeri
// posts. In production the same six tiles are populated from the Instagram
// Graph API at build time (images downloaded locally, run through
// astro:assets) — nothing loads from instagram.com at runtime, matching the
// "map loads only on click" privacy posture.

import bereshith from '../assets/images/media/bereshith/01.jpg';
import transcend from '../assets/images/media/transcend/01.jpg';
import inaugural from '../assets/images/media/inaugural-mass/02.jpg';
import assumption from '../assets/images/media/assumption/03.jpg';
import outreach from '../assets/images/domains/gallery/outreach/outr1.jpg';
import animation from '../assets/images/domains/gallery/animation/anim4.jpg';

export interface InstaTile {
  image: ImageMetadata;
  alt: string;
  href: string;
}

const PROFILE = 'https://www.instagram.com/acc_kengeri/';

export const instaTiles: InstaTile[] = [
  { image: bereshith, alt: 'A moment from Bereshith', href: PROFILE },
  { image: transcend, alt: "The Transcend '23 stage", href: PROFILE },
  { image: inaugural, alt: 'The Inaugural Mass', href: PROFILE },
  { image: assumption, alt: 'The Assumption of Mother Mary celebration', href: PROFILE },
  { image: outreach, alt: 'An Outreach initiative', href: PROFILE },
  { image: animation, alt: 'An Animation domain gathering', href: PROFILE },
];
