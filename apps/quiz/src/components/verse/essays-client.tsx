'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

import { fetchAffordance } from '@/components/verse/roles/role-affordance';

interface Essay { id: number; title: string; slug: string | null; status: string; author: { username: string | null; displayName: string | null } | null }

const STATUS_LABEL: Record<string, string> = { draft: 'Draft', submitted: 'In review', featured: 'Featured', rejected: 'Returned' };

/** W4.12 / V-ESSAYS-MAX - the AUTHOR side: the member's write CTA + their own
 * drafts. Curator work (review, hero, series, unpublish) lives in the Build-mode
 * EssayCuratorPanel. Keeps the essays page ISR (this is an auth-dependent island). */
export function EssaysClient({ groupId, groupSlug }: { groupId: number; groupSlug: string }): React.ReactElement | null {
  const [mine, setMine] = useState<Essay[] | null>(null);
  // V-MODES step 3 - essay writing is a MEMBER affordance; visitors and the
  // logged-out see no write CTA (their invitation stays the join path).
  const [isMember, setIsMember] = useState(false);

  const load = useCallback(async () => {
    const mr = await fetch(`/api/verse/essays?group_id=${groupId}&scope=mine`);
    if (mr.ok) setMine((await mr.json()).essays ?? []); else setMine([]);
  }, [groupId]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetchAffordance(groupSlug).then((a) => setIsMember(a.role !== 'visitor')).catch(() => {});
  }, [groupSlug]);

  if (!isMember && !(mine && mine.length)) return null;

  return (
    <div className="space-y-6">
      {isMember ? (
        <div>
          <Link href={`/verse/${groupSlug}/essays/write`} className="inline-block rounded-full px-4 py-2 text-sm font-bold no-underline" style={{ background: 'var(--verse-cta, var(--verse-accent))', color: 'var(--verse-cta-text, var(--verse-accent-text))' }}>Write an essay</Link>
        </div>
      ) : null}

      {mine && mine.length > 0 ? (
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--verse-ink)' }}>Your essays</h2>
          <ul className="space-y-1.5">
            {mine.map((e) => (
              <li key={e.id} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--verse-soft)' }}>
                <span className="font-semibold" style={{ color: 'var(--verse-ink)' }}>{e.title}</span>
                <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase text-tertiary" style={{ border: '1px solid var(--verse-line)' }}>{STATUS_LABEL[e.status] ?? e.status}</span>
                <span className="ml-auto flex gap-3">
                  {e.status === 'featured' ? <Link href={`/verse/${groupSlug}/essays/${e.id}`} className="text-xs font-semibold no-underline" style={{ color: 'var(--verse-ink)' }}>View</Link> : null}
                  {e.status === 'draft' || e.status === 'rejected' ? <Link href={`/verse/${groupSlug}/essays/write?id=${e.id}`} className="text-xs font-semibold no-underline" style={{ color: 'var(--verse-ink)' }}>Edit</Link> : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
