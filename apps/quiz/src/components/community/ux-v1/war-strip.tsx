'use client';

import Link from 'next/link';

import { Icon } from '@/components/ux-v1/icon';

import { useP8Viewer } from './viewer';

import type { WarEntry } from '@/lib/ux-v1/p8/types';

// Phones (16.7): the fandom war strip on top of the feed, one tap to the
// leaderboard. Signed in with a main group on the board: "Fandom war: STAY is #2
// this week"; otherwise the week's leader. Real ranking (get_fandom_war_map).

export function WarStrip({ entries }: { entries: WarEntry[] }): React.ReactElement | null {
  const v = useP8Viewer();
  const leader = entries[0];
  if (!leader) return null;
  const mine = v.mainGroup ? entries.find((e) => e.slug === v.mainGroup) ?? null : null;
  const fandom = (e: WarEntry): string => e.fandom && e.fandom.toLowerCase() !== 'fan' ? e.fandom : e.name;
  return (
    <Link href="/leaderboard" className="p8-warstrip">
      <Icon name="trophy" />
      <span className="p8-grow">
        Fandom war:{' '}
        {mine ? <><b>{fandom(mine)} is #{mine.rank}</b> this week</> : <><b>{fandom(leader)} leads</b> this week</>}
      </span>
      <Icon name="right" className="p8-chev" />
    </Link>
  );
}
