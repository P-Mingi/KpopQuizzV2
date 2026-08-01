'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

// V-CARDS-MAX step 7 - the BINDER home widget (duality: the binder tool as a
// space-home module). Its own identity: a mini pocket-row + my completion + the
// next card to find. Personal, so it hydrates client-side; the SSR shell shows
// the catalog size + a start pitch (min-gated to hide at 0 catalog by the wrapper).
export function BinderWidget({ groupId, groupSlug, cards }: {
  groupId: number; groupSlug: string; cards: { id: number; name: string }[];
}): React.ReactElement {
  const [states, setStates] = useState<Record<number, 'owned' | 'wanted'>>({});
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    fetch(`/api/verse/collection?group_id=${groupId}`).then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) { setSignedIn(!!d.signedIn); setStates(d.states ?? {}); } }).catch(() => {});
  }, [groupId]);

  const total = cards.length;
  const owned = cards.filter((c) => states[c.id] === 'owned').length;
  const pct = total ? Math.round((owned / total) * 100) : 0;
  const nextCard = cards.find((c) => states[c.id] === 'wanted') ?? cards.find((c) => states[c.id] !== 'owned') ?? null;

  return (
    <div>
      <p className="v-eyebrow">My binder</p>
      <Link href={`/verse/${groupSlug}/photocards`} className="mt-2 flex items-center gap-3 no-underline">
        {/* Mini pocket row: the binder motif in miniature. */}
        <span className="flex gap-1" aria-hidden>
          {cards.slice(0, 4).map((c) => (
            <span key={c.id} className="block w-5 rounded-[3px]" style={{ aspectRatio: '55 / 85', background: states[c.id] === 'owned' ? 'var(--verse-cta, var(--verse-accent))' : 'transparent', border: states[c.id] === 'owned' ? '1px solid transparent' : '1px dashed var(--verse-line)' }} />
          ))}
        </span>
        <span className="min-w-0">
          <span className="block text-lg font-extrabold leading-none tabular-nums" style={{ color: 'var(--verse-ink)' }}>{signedIn ? `${owned}/${total}` : total}</span>
          <span className="block text-[11px] text-tertiary">{signedIn ? `owned · ${pct}%` : 'cards catalogued'}</span>
        </span>
      </Link>
      {signedIn && nextCard ? (
        <p className="mt-2 truncate text-xs text-secondary">Next to find: <Link href={`/verse/${groupSlug}/photocards/${nextCard.id}`} className="verse-link font-semibold">{nextCard.name}</Link></p>
      ) : (
        <Link href={`/verse/${groupSlug}/photocards`} className="mt-2 inline-block text-xs font-bold verse-link">{signedIn ? 'Open the binder' : 'Start your binder'} ›</Link>
      )}
    </div>
  );
}
