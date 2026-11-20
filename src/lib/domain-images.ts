import type { ImageMetadata } from 'astro';
// Real ACC photographs, one per domain (Phase 13 replaced the earlier stock /
// generated banners). Each banner is also left out of that domain's gallery
// below, so a detail page never shows the same photo twice.
import animation from '../assets/images/domains/gallery/animation/anim2.png';
import liturgy from '../assets/images/domains/gallery/liturgy/lit4.jpg';
import outreach from '../assets/images/domains/gallery/outreach/outr3.jpg';
import audioVisual from '../assets/images/domains/gallery/audio-visual/av1.jpg';
import logisticsHospitality from '../assets/images/media/assumption/02.jpg';
import mediaCommunication from '../assets/images/domains/gallery/media-communication/mnc1.jpg';

// Keyed by the same domain id used in src/content/domains.json.
export const domainBanners: Record<string, ImageMetadata> = {
  animation,
  liturgy,
  outreach,
  'audio-visual': audioVisual,
  'logistics-hospitality': logisticsHospitality,
  'media-communication': mediaCommunication,
};

const galleryFiles = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/images/domains/gallery/*/*',
  { eager: true }
);

const galleriesByDomain: Record<string, ImageMetadata[]> = {};
for (const [path, mod] of Object.entries(galleryFiles)) {
  const domainId = path.split('/').slice(-2, -1)[0];
  (galleriesByDomain[domainId] ??= []).push(mod.default);
}

export function getDomainGallery(domainId: string): ImageMetadata[] {
  const banner = domainBanners[domainId];
  return (galleriesByDomain[domainId] ?? []).filter((img) => img.src !== banner?.src);
}
