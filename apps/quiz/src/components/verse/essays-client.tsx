'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

interface Essay { id: number; title: string; slug: string | null; status: string; author: { username: string | null; displayName: string | null } | null }

const STATUS_LABEL: Record<string, string> = { draft: 'Draft', submitted: 'In review', featured: 'Featured', rejected: 'Returned' };

/** W4.12 - the signed-in member's drafts + the curator review queue. Keeps the essays page
 * ISR (featured list is server-rendered; these auth-dependent sections are a client island). */
export function EssaysClient({ groupId, groupSlug }: { groupId: number; groupSlug: string }): React.ReactElement | null {
  const [mine, setMine] = useState<Essay[] | null>(null);
  const [queue, setQueue] = useState<Essay[] | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const mr = await fetch(`/api/verse/essays?group_id=${groupId}&scope=mine`);
    if (mr.status === 401) { setSignedIn(false); setMine([]); } else if (mr.ok) { setSignedIn(true); setMine((await mr.json()).essays ?? []); }
    const qr = await fetch(`/api/verse/essays?group_id=${groupId}&scope=queue`);
    if (qr.ok) setQueue((await qr.json()).essays ?? []); else setQueue(null);
  }, [groupId]);
  useEffect(() => { load(); }, [load]);

  async function review(id: number, action: 'feature' | 'reject') {
    if (action === 'reject' && !confirm('Return this essay to its author?')) return;
    setBusy(true);
    const r = await fetch('/api/verse/essays', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action }) });
    setBusy(false);
    if (r.ok) load(); else alert((await r.json()).error ?? 'error');
  }

  return (
    <div className="space-y-6">
      <div>
        {signedIn
          ? <Link href={`/verse/${groupSlug}/essays/write`} className="inline-block rounded-full px-4 py-2 text-sm font-bold no-underline" style={{ background: 'var(--verse-accent)', color: 'var(--verse-accent-text)' }}>Write an essay</Link>
          : <Link href={`/login?returnTo=/verse/${groupSlug}/essays/write`} className="inline-block rounded-full px-4 py-2 text-sm font-bold no-underline" style={{ background: 'var(--verse-accent)', color: 'var(--verse-accent-text)' }}>Sign in to write an essay</Link>}
      </div>

      {mine && mine.length > 0 ? (
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--verse-ink)' }}>Your essays</h2>
          <ul className="space-y-1.5">
            {mine.map((e) => (
              <li key={e.id} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--verse-soft)' }}>
                <span className="font-semibold" style={{ color: 'var(--verse-ink)' }}>{e.title}</span>
                <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase text-tertiary" style={{ border: '1px solid var(--verse-line)' }}>{STATUS_LABEL[e.status] ?? e.status}</span>
                <span className="ml-auto flex gap-3">
                  {e.status === 'featured' && e.slug ? <Link href={`/verse/${groupSlug}/essays/${e.id}`} className="text-xs font-semibold no-underline" style={{ color: 'var(--verse-ink)' }}>View</Link> : null}
                  {e.status === 'draft' || e.status === 'rejected' ? <Link href={`/verse/${groupSlug}/essays/write?id=${e.id}`} className="text-xs font-semibold no-underline" style={{ color: 'var(--verse-ink)' }}>Edit</Link> : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {queue && queue.length > 0 ? (
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--verse-ink)' }}>Review queue</h2>
          <ul className="space-y-1.5">
            {queue.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-default px-3 py-2 text-sm">
                <Link href={`/verse/${groupSlug}/essays/${e.id}`} className="font-semibold no-underline" style={{ color: 'var(--verse-ink)' }}>{e.title}</Link>
                <span className="text-xs text-tertiary">by {e.author?.displayName || e.author?.username || 'a fan'}</span>
                <span className="ml-auto flex gap-2">
                  <button onClick={() => review(e.id, 'feature')} disabled={busy} className="rounded border border-default px-2 py-1 text-xs font-semibold">Feature</button>
                  <button onClick={() => review(e.id, 'reject')} disabled={busy} className="rounded border border-default px-2 py-1 text-xs text-tertiary">Return</button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
