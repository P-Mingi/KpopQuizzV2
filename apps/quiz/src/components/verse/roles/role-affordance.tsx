'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

// V-ROLES step 2 - ONE shared affordance truth. Every editable surface renders
// this with its own actions; the component fetches the viewer's real state once
// per space (module-level cache) and shows the right thing:
//   visitor      -> the suggest action (always working) + sign-in nudge
//   member       -> the suggest action + THE PATH: real XP distance to
//                   contributor and where XP comes from (no vague "level up")
//   contributor+ -> the edit action
// Lock states are the surface's own business (it knows why); pass lockNote.

export interface AffordanceState {
  canEdit: boolean;
  role: string;
  stage?: string;
  xp?: number;
  threshold: number;
  xpToContributor?: number;
}

const cache = new Map<string, Promise<AffordanceState>>();

export function fetchAffordance(groupSlug: string, owner?: string): Promise<AffordanceState> {
  const key = `${groupSlug}:${owner ?? ''}`;
  if (!cache.has(key)) {
    cache.set(key, fetch(`/api/verse/can-edit?group=${groupSlug}${owner ? `&owner=${encodeURIComponent(owner)}` : ''}`)
      .then((r) => (r.ok ? r.json() : { canEdit: false, role: 'visitor', threshold: 100 }))
      .catch(() => ({ canEdit: false, role: 'visitor', threshold: 100 })));
  }
  return cache.get(key)!;
}

export function RoleAffordance({ groupSlug, owner, edit, suggest, lockNote, compact }: {
  groupSlug: string;
  /** The resource's author id: authors edit their own resource. */
  owner?: string | undefined;
  /** The edit action (shown when the viewer truly can edit), rendered as-is. */
  edit: React.ReactNode;
  /** The visitor/member action (a working suggest control), rendered as-is. */
  suggest: React.ReactNode;
  /** When the surface is locked: why + who can (shown to everyone, replacing actions). */
  lockNote?: string | undefined;
  compact?: boolean;
}): React.ReactElement | null {
  const [state, setState] = useState<AffordanceState | null>(null);
  useEffect(() => { let on = true; void fetchAffordance(groupSlug, owner).then((s) => { if (on) setState(s); }); return () => { on = false; }; }, [groupSlug, owner]);

  if (lockNote) {
    return (
      <p className="flex items-center gap-1.5 text-[12px] text-tertiary">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
        {lockNote}
      </p>
    );
  }
  if (!state) return null;

  if (state.canEdit) return <>{edit}</>;

  // Copy is STAGE-TRUE (the stage system's law: at stage A/B curators review
  // everything; contributors edit directly only at stage C). The member's path
  // states a REAL unlock: the contributor role opens wiki-page creation
  // everywhere, whatever the stage.
  return (
    <div className={compact ? 'flex flex-wrap items-center gap-x-3 gap-y-1' : 'flex flex-col gap-1'}>
      {suggest}
      {state.role === 'member' ? (
        <p className="text-[12px] leading-snug text-tertiary">
          You are <strong className="font-bold text-secondary">{state.xpToContributor} XP</strong> from the contributor role (create wiki pages):{' '}
          <Link href={`/verse/${groupSlug}/quests`} className="font-semibold underline decoration-dotted underline-offset-2 hover:text-secondary">earn XP on the quest board</Link>.
        </p>
      ) : state.role === 'contributor' ? (
        <p className="text-[12px] leading-snug text-tertiary">
          A curator reviews changes in this space before they go live.
        </p>
      ) : state.role === 'visitor' ? (
        <p className="text-[12px] leading-snug text-tertiary">
          Suggestions are reviewed by the space&rsquo;s curators.{' '}
          <Link href={`/login?returnTo=/verse/${groupSlug}`} className="font-semibold underline decoration-dotted underline-offset-2 hover:text-secondary">Sign in</Link> to build a contributor record.
        </p>
      ) : null}
    </div>
  );
}
