'use client';

import Link from 'next/link';

import { useBuildMode } from '@/components/verse/build-mode';

// V-ATLAS step 4 - the honest header count. The page total is always shown; the
// WANTED count appears only in Build mode (readers never see it) and doubles as
// the quest-board cross-link: the wanted pages ARE the space's open work.
export function AtlasCounts({ pages, wanted, groupSlug }: { pages: number; wanted: number; groupSlug: string }): React.ReactElement {
  const { on } = useBuildMode();
  return (
    <p className="mt-1 text-sm text-tertiary tabular-nums">
      {pages} {pages === 1 ? 'page' : 'pages'}
      {on && wanted > 0 ? (
        <>
          {' '}·{' '}
          <Link href={`/verse/${groupSlug}/quests`} className="verse-link font-semibold no-underline hover:underline">
            {wanted} wanted
          </Link>
        </>
      ) : null}
    </p>
  );
}
