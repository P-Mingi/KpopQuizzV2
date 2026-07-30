'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

// V-SPACE-FLOW - the empty-intro nudge. The page is ISR, so member-ness is
// resolved client-side (same endpoint the JoinButton uses): members see the
// "Start writing" invitation, visitors see nothing at all (no dishonest
// placeholder in the served HTML).
export function IntroNudge({ groupId, groupSlug, groupName }: { groupId: number; groupSlug: string; groupName: string }): React.ReactElement | null {
  const [member, setMember] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/verse/membership?group_id=${groupId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d && (d.member || d.role === 'curator' || d.role === 'space_admin')) setMember(true); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [groupId]);
  if (!member) return null;
  return (
    <div className="v-module">
      <p className="text-sm leading-relaxed text-secondary" style={{ maxWidth: 'var(--v-measure)' }}>
        This space has no introduction yet. Two to four sentences on who {groupName} are, written by a fan, would live right here.
      </p>
      <Link href={`/verse/${groupSlug}/about`} className="mt-1 inline-flex min-h-[44px] items-center gap-1 text-sm font-bold no-underline" style={{ color: 'var(--verse-ink)' }}>
        Start writing
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </Link>
    </div>
  );
}
