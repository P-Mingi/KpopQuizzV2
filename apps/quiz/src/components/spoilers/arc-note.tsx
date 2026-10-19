'use client';

import { isSafeFor } from '@/lib/anime/spoilers';

import { useSpoilerProgress } from './use-spoiler-progress';

import type { SpoilerScope } from '@/lib/anime/types';

interface ArcNoteProps {
  readonly seriesSlug: string;
  readonly groupId: number;
  readonly level: { readonly arc: number; readonly scope: SpoilerScope | null; readonly arcName: string };
  /** `covers` holds the placeholder {arc}. */
  readonly labels: { readonly safe: string; readonly covers: string };
}

/**
 * "Safe for you" or "Covers <arc>" on a quiz card (A2). The server renders it for the spoiler-free view (a quiz with no
 * spoiler is safe, any other one covers its arc); once the reader's progress is known in the browser it follows it.
 */
export function ArcNote({ seriesSlug, groupId, level, labels }: ArcNoteProps): React.ReactElement {
  const { progress } = useSpoilerProgress(seriesSlug, groupId);
  const safe = isSafeFor({ arcOrd: level.arc, scope: level.scope }, progress);
  return (
    <span className={safe ? 'anime-o3-note anime-o3-note-safe' : 'anime-o3-note anime-o3-note-covers'}>
      {safe ? labels.safe : labels.covers.replace('{arc}', level.arcName)}
    </span>
  );
}
