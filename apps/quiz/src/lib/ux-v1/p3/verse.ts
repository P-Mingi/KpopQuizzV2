import { spaceUnpublished, verseHidden } from '@/lib/verse/visibility';

/**
 * C2-006 / C2-007: a group's Verse space is a working door only when it is open,
 * that is the Verse is public (VERSE_PUBLIC is exactly 'true') and the slug is a
 * live space (LIVE_SPACES). A parked space answers 404 and the community editor
 * only offers threads for open spaces, so the hub links neither for it. Server
 * only (reads a server env var); the gate itself stays in lib/verse/visibility.
 */
export function verseSpaceOpen(slug: string): boolean {
  return !verseHidden() && !spaceUnpublished(slug);
}
