'use client';

import { useEffect, useState } from 'react';

import type { CardState } from '@/lib/verse/photocards';

// V-CARDS-MAX step 3 - own / want on a card's own page. Reuses the private
// collection truth (/api/verse/collection); state loads for the signed-in owner,
// logged-out users are sent to sign in. Counts on the page are aggregate-only.
export function PhotocardCollectControl({ cardId, groupSlug }: { cardId: number; groupSlug: string }): React.ReactElement {
  const [state, setStateVal] = useState<CardState | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/verse/collection?photocard_id=${cardId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) { setSignedIn(!!d.signedIn); setStateVal(d.state ?? null); } })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [cardId]);

  async function set(next: CardState | 'none'): Promise<void> {
    if (!signedIn) { window.location.href = `/login?returnTo=/verse/${groupSlug}/photocards/${cardId}`; return; }
    setStateVal(next === 'none' ? null : next);
    await fetch('/api/verse/collection', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ photocard_id: cardId, state: next }) });
  }

  const owned = state === 'owned', wanted = state === 'wanted';
  return (
    <div className="flex flex-wrap gap-2" aria-busy={!loaded}>
      <button type="button" onClick={() => set(owned ? 'none' : 'owned')} aria-pressed={owned}
        className="v-tap inline-flex min-h-[44px] items-center gap-2 rounded-full px-5 text-sm font-bold"
        style={owned ? { background: 'var(--verse-cta, var(--verse-accent))', color: 'var(--verse-cta-text, var(--verse-accent-text))' } : { border: '1px solid var(--verse-line)', color: 'var(--verse-ink)' }}>
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20 6 9 17l-5-5" /></svg>
        {owned ? 'Owned' : 'I own this'}
      </button>
      <button type="button" onClick={() => set(wanted ? 'none' : 'wanted')} aria-pressed={wanted}
        className="v-tap inline-flex min-h-[44px] items-center rounded-full px-5 text-sm font-bold"
        style={wanted ? { background: 'var(--verse-soft-strong)', color: 'var(--verse-ink)' } : { border: '1px solid var(--verse-line)', color: 'var(--verse-ink)' }}>
        {wanted ? 'On my wishlist' : 'I want this'}
      </button>
    </div>
  );
}
