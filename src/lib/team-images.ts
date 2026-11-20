import type { ImageMetadata } from 'astro';

// Bulk-imports every headshot once so Astro's image pipeline can optimize
// each one; team.json's `imageSource` (e.g. "Images/CORE TEAM/edwin.jpg")
// only has to match a headshot by filename to resolve it here.
const files = import.meta.glob<{ default: ImageMetadata }>('../assets/images/team/*', {
  eager: true,
});

const byFilename = new Map<string, ImageMetadata>(
  Object.entries(files).map(([path, mod]) => [path.split('/').pop()!.toLowerCase(), mod.default])
);

export function getTeamImage(imageSource: string | null): ImageMetadata | undefined {
  if (!imageSource) return undefined;
  const filename = imageSource.split('/').pop()?.toLowerCase();
  return filename ? byFilename.get(filename) : undefined;
}
