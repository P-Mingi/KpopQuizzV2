'use client';

import { useEffect, useState } from 'react';

// V-CARDS-MAX step 4 - pin a card to the profile showcase (top 3-5). The cap is
// enforced server-side; a rejected 6th pin surfaces here as a message, never a
// silent failure. The showcase itself is public only after the opt-in on the profile.
export function ShelfPinButton({ itemType, itemId, groupSlug }: {
  itemType: 'photocard' | 'collectible'; itemId: number; groupSlug: string;
}): React.ReactElement {
  const [pinned, setPinned] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/verse/shelf').then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) { setSignedIn(!!d.signedIn); setPinned((d.cards ?? []).some((c: { item_type: string; item_id: number }) => c.item_type === itemType && c.item_id === itemId)); } })
      .catch(() => {});
  }, [itemType, itemId]);

  async function toggle(): Promise<void> {
    if (!signedIn) { window.location.href = `/login?returnTo=/verse/${groupSlug}/photocards/${itemId}`; return; }
    const res = await fetch('/api/verse/shelf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item_type: itemType, item_id: itemId, action: pinned ? 'unpin' : 'pin' }) });
    const d = await res.json().catch(() => ({}));
    if (res.status === 409) { setMsg(`Your showcase is full (max ${d.cap}). Unpin one on your profile first.`); return; }
    if (res.ok) { setPinned(!!d.pinned); setMsg(null); }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => void toggle()} aria-pressed={pinned}
        className="v-tap inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3.5 text-xs font-bold"
        style={pinned ? { borderColor: 'var(--verse-cta, var(--verse-accent))', color: 'var(--verse-cta, var(--verse-accent))', background: 'var(--verse-soft)' } : { borderColor: 'var(--verse-line)', color: 'var(--verse-ink)' }}>
        <svg viewBox="0 0 24 24" width="13" height="13" fill={pinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden><path d="m12 3 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 18.3 6.2 21.4l1.1-6.5L2.6 9.8l6.5-.9Z" /></svg>
        {pinned ? 'On your profile' : 'Pin to profile'}
      </button>
      {msg ? <span role="status" className="text-[11px] text-tertiary">{msg}</span> : null}
    </span>
  );
}
