'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { fetchAffordance } from './role-affordance';

import type { AffordanceState } from './role-affordance';

// V-ROLES step 3 - THE PROGRESSION PATH: the ladder as a real path with the
// REAL thresholds from config (100 XP -> contributor is the auto-promotion in
// reputation.ts; curator and space admin are appointments and say so; no
// invented numbers anywhere). Signed-in viewers see their own rung + true
// distance; visitors see the ladder plus a join door.

const RUNGS = [
  { id: 'member', label: 'Member', how: 'Join the space', unlocks: 'Discussions, suggestions, your watchlist' },
  { id: 'contributor', label: 'Contributor', how: '100 XP, automatic', unlocks: 'Create wiki pages; direct edits when the space reaches stage C' },
  { id: 'curator', label: 'Curator', how: 'Appointed by the space’s curators', unlocks: 'Review and publish, the studio, the roles panel' },
  { id: 'space_admin', label: 'Space admin', how: 'The founding curator', unlocks: 'Appoint curators, space settings' },
] as const;

const ORDER: Record<string, number> = { visitor: -1, member: 0, contributor: 1, curator: 2, space_admin: 3, admin: 3 };

export function ProgressionPath({ groupSlug, fandomName }: { groupSlug: string; fandomName: string }): React.ReactElement {
  const [state, setState] = useState<AffordanceState | null>(null);
  useEffect(() => { let on = true; void fetchAffordance(groupSlug).then((s) => { if (on) setState(s); }); return () => { on = false; }; }, [groupSlug]);
  const mine = ORDER[state?.role ?? 'visitor'] ?? -1;

  return (
    <section className="v-module" id="ladder" aria-label="How roles work in this space">
      <h2 className="v-eyebrow">The path in this space</h2>
      <ol className="flex flex-col gap-0">
        {RUNGS.map((r, i) => {
          const reached = mine >= i;
          const current = mine === i;
          return (
            <li key={r.id} className="relative flex gap-4 pb-5 last:pb-0">
              {i < RUNGS.length - 1 ? <span aria-hidden className="absolute left-[9px] top-6 h-full w-px" style={{ background: 'var(--v-hairline)' }} /> : null}
              <span aria-hidden className="mt-1 inline-block h-[19px] w-[19px] flex-shrink-0 rounded-full border-2"
                style={reached
                  ? { background: 'var(--verse-accent)', borderColor: 'var(--verse-accent)' }
                  : { background: 'transparent', borderColor: 'var(--verse-line)' }} />
              <div className="min-w-0">
                <p className="flex flex-wrap items-baseline gap-x-2 text-[15px] font-bold" style={{ color: 'var(--verse-ink)' }}>
                  {r.label}
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-tertiary">{r.how}</span>
                  {current ? <span className="rounded-full px-2 py-px text-[10px] font-bold uppercase tracking-wide" style={{ background: 'var(--verse-soft-strong)', color: 'var(--verse-ink)' }}>You are here</span> : null}
                </p>
                <p className="mt-0.5 text-[13px] text-secondary">{r.unlocks}</p>
                {current && r.id === 'member' && state ? (
                  <p className="mt-1 text-[12.5px] text-tertiary">
                    You have <strong className="font-bold text-secondary">{state.xp ?? 0} XP</strong>; {state.xpToContributor} more reaches contributor.{' '}
                    <Link href={`/verse/${groupSlug}/quests`} className="font-semibold underline decoration-dotted underline-offset-2 hover:text-secondary">The quest board pays XP</Link>.
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
      {mine < 0 ? (
        <p className="mt-3 text-[13px] text-secondary">
          The path starts with joining.{' '}
          <Link href={`/login?returnTo=/verse/${groupSlug}`} className="font-bold underline decoration-dotted underline-offset-2" style={{ color: 'var(--verse-ink)' }}>Sign in and join the {fandomName} space</Link>.
        </p>
      ) : null}
    </section>
  );
}
