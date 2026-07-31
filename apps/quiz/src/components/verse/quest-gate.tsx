'use client';

import { useEffect, useState } from 'react';

import { JoinButton } from '@/components/verse/join-button';

// V-MODES step 3 - the quest board is members-only (locked Q1). The BAKED
// render (first paint, crawlers, logged-out) is the join pitch, never the
// board; members get the board client-side once membership confirms. The URL
// keeps working for everyone: readers meet the invitation, not a 404.
export function QuestGate({ groupId, groupSlug, groupName, fandomName, board }: {
  groupId: number; groupSlug: string; groupName: string; fandomName: string; board: React.ReactNode;
}): React.ReactElement {
  const [isMember, setIsMember] = useState(false);

  useEffect(() => {
    fetch(`/api/verse/membership?group_id=${groupId}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setIsMember(!!d && d.role && d.role !== 'visitor'))
      .catch(() => {});
  }, [groupId]);

  if (isMember) return <>{board}</>;

  return (
    <div className="mx-auto max-w-[60ch] rounded-2xl px-6 py-10 text-center" style={{ background: 'var(--verse-soft)' }}>
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-tertiary">Quests</p>
      <h1 className="mt-2 text-2xl font-extrabold" style={{ color: 'var(--verse-ink)' }}>Help build the {groupName} space</h1>
      <p className="mt-3 text-sm leading-relaxed text-secondary">
        Quests are the {fandomName} to-build list: era stories waiting for a writer, member lore to
        fill in, facts to source. They open to members. Join, flip on Build mode, and pick one up.
      </p>
      <div className="mt-5 flex justify-center">
        <JoinButton groupId={groupId} groupSlug={groupSlug} fandomName={fandomName} />
      </div>
    </div>
  );
}
