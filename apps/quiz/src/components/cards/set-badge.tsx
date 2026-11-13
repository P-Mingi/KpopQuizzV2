'use client';

// Bunnyverse Cards, lots 3 and 4 (lane GOALS): the small pieces of the sets that other views insert: the check on a completed group of the
// binder index, the "Complete" badge of its page, and the line of the pack summary ("You finished X. +1 pack waiting in Goals").
import Link from 'next/link';
import { useMemo } from 'react';

import { completeSections, finishedLine } from '@/lib/cards/goals';

import { useCards } from './cards-provider';

import type { FinishedSet } from '@/lib/cards/goals';

/** The ids of the binder sections whose group the player completed (every card of it owned, a group card among them). */
export function useCompleteSections(): ReadonlySet<string> {
  const { catalog, byN, owned } = useCards();
  return useMemo(() => completeSections(catalog.sections, (n) => byN.get(n)?.kind, owned), [catalog.sections, byN, owned]);
}

const CHECK = 'M5 12.5l4.5 4.5L19 7.5';

/** The check beside a completed group in the binder index. */
export function SetCheck({ name }: { name: string }): React.ReactElement {
  return (
    <svg className="set-check" viewBox="0 0 24 24" role="img" aria-label={`${name} is complete`}>
      <title>Complete</title>
      <path d={CHECK} />
    </svg>
  );
}

/** The "Complete" badge in the header of a binder page of a completed group. */
export function SetBadge(): React.ReactElement {
  return (
    <span className="set-badge">
      <svg className="set-check" viewBox="0 0 24 24" aria-hidden="true"><path d={CHECK} /></svg>
      Complete
    </span>
  );
}

/** The summary line when a pack finished a set; nothing otherwise. */
export function FinishedLine({ finished }: { finished: readonly FinishedSet[] | undefined }): React.ReactElement | null {
  const line = finishedLine(finished ?? []);
  if (!line) return null;
  return <p className="set-line" role="status">{line}. <Link href="/cards/goals">See Goals</Link></p>;
}
