'use client';

import { useEffect, useState } from 'react';
import { WidgetShell } from '@/components/verse/primitives/widget-shell';
import Link from 'next/link';

// V-CARDS-MAX step 7 - the SHELF home widget (duality). Its own identity: mini
// lightstick silhouettes on a ledge + my completion, distinct from the binder
// widget's pocket row. Personal; hydrates client-side, min-gated by the wrapper.
export function ShelfWidget({ groupId, groupSlug, items }: {
  groupId: number; groupSlug: string; items: { id: number; kind: string }[];
}): React.ReactElement {
  const [states, setStates] = useState<Record<number, 'owned' | 'wanted'>>({});
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    fetch(`/api/verse/collectible-collection?group_id=${groupId}`).then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) { setSignedIn(!!d.signedIn); setStates(d.states ?? {}); } }).catch(() => {});
  }, [groupId]);

  const total = items.length;
  const owned = items.filter((i) => states[i.id] === 'owned').length;

  return (
    <WidgetShell eyebrow="My shelf" wrapClassName="">
      <Link href={`/verse/${groupSlug}/collectibles`} className="mt-2 flex items-end gap-3 no-underline">
        {/* Mini ledge with standing silhouettes: the shelf motif in miniature. */}
        <span className="flex items-end gap-1.5 border-b-2 pb-0.5" style={{ borderColor: 'var(--verse-soft-strong)' }} aria-hidden>
          {items.slice(0, 4).map((it) => {
            const on = states[it.id] === 'owned';
            return (
              <svg key={it.id} viewBox="0 0 20 46" width="12" height="28" fill="none" aria-hidden>
                <circle cx="10" cy="9" r="7" fill={on ? 'var(--verse-cta, var(--verse-accent))' : 'none'} stroke={on ? 'var(--verse-cta, var(--verse-accent))' : 'var(--verse-ink)'} strokeWidth="1.6" />
                <rect x="7.5" y="15" width="5" height="27" rx="2" fill={on ? 'var(--verse-cta, var(--verse-accent))' : 'none'} stroke={on ? 'var(--verse-cta, var(--verse-accent))' : 'var(--verse-ink)'} strokeWidth="1.6" />
              </svg>
            );
          })}
        </span>
        <span className="min-w-0 pb-0.5">
          <span className="block text-lg font-extrabold leading-none tabular-nums" style={{ color: 'var(--verse-ink)' }}>{signedIn ? `${owned}/${total}` : total}</span>
          <span className="block text-[11px] text-tertiary">{signedIn ? 'owned' : 'on the shelf'}</span>
        </span>
      </Link>
      <Link href={`/verse/${groupSlug}/collectibles`} className="mt-2 inline-block text-xs font-bold verse-link">{signedIn ? 'Open the shelf' : 'Track your shelf'} ›</Link>
    </WidgetShell>
  );
}
