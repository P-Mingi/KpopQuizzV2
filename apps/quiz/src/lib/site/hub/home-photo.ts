// Hub, Hot right now (owner decision 2026-10-30): the picture of a quiz that has no cover of its own, as its own site shows it.
// - A K-pop quiz: its group's photo, the one kpopquiz.org shows on that group's pages and on its quiz cards (groupPhotoUrl of
//   lib/ux-v1/a0/group-photos.ts, the same field and the same order: the site's own file in public/idols first, else the group's Commons
//   photo in Supabase Storage). kpopquiz.org prints no credit for these (group-photo-credits.ts: the owner handles the attribution), so
//   none is printed here either. The file of public/idols is served by every build at the same path (the rewrites of an anime or hub
//   build leave a file name to the filesystem, lib/site/routing.ts CATCH_ALL_PATTERN), so the hub serves the very same file.
// - An anime quiz: its series' photo only as OtakuQuiz shows it (seriesPhotoOf of lib/anime/series-images.ts, the function its series art
//   reads: the owner's upload first, else the bundled free photo, else none), and only when that photo asks for no credit line. OtakuQuiz
//   prints "Photo: author, licence" beside a CC BY or CC BY-SA photo (components/anime/photo-credit.tsx); a row of this list has no room
//   for that line, so such a series keeps its initials rather than show the photo without its credit.
// Else null: the row shows the initials of the group on the colour of its site, as before.

import { seriesPhotoOf } from '@/lib/anime/series-images';
import { groupPhotoUrl } from '@/lib/ux-v1/a0/group-photos';

import type { HomeSite } from './home-types';

/**
 * The photo of the group (K-pop) or the series (anime) of a quiz, or null. For an anime series the owner's pictures must be primed first
 * (primeOwnerSeriesPictures of lib/anime/entity-images-read.ts, as the OtakuQuiz layout does), else only the bundled photo is known.
 */
export function groupPhotoOf(site: HomeSite, groupSlug: string | null | undefined): string | null {
  if (!groupSlug) return null;
  if (site === 'kpop') return groupPhotoUrl(groupSlug);
  const photo = seriesPhotoOf(groupSlug);
  return photo && !photo.attribution ? photo.file : null;
}
