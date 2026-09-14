'use client';

import { useEffect, useState } from 'react';

// The like button + a one-shot view ping for a published list. Both dedup per
// browser via localStorage so a reload does not inflate the count; the counter
// bump itself happens server-side (/api/tier-list/engage). Fail-soft: if storage
// or the network is unavailable, the page still renders and reads fine.

export function PublicEngage({ slug, initialLikes }: { slug: string; initialLikes: number }) {
  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    try { if (localStorage.getItem(`tl:liked:${slug}`)) setLiked(true); } catch { /* ignore */ }
    // One view per browser session-ish (per stored flag).
    try {
      if (!localStorage.getItem(`tl:viewed:${slug}`)) {
        localStorage.setItem(`tl:viewed:${slug}`, '1');
        void fetch('/api/tier-list/engage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, action: 'view' }) });
      }
    } catch { /* ignore */ }
  }, [slug]);

  async function like() {
    if (liked) return;
    setLiked(true);
    setLikes((n) => n + 1);
    try { localStorage.setItem(`tl:liked:${slug}`, '1'); } catch { /* ignore */ }
    try {
      const res = await fetch('/api/tier-list/engage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, action: 'like' }) });
      if (res.ok) { const j = await res.json(); if (typeof j.likes === 'number') setLikes(j.likes); }
    } catch { /* keep optimistic count */ }
  }

  return (
    <button type="button" className="tl-btn out sm" onClick={like} aria-pressed={liked} data-testid="tl-like" style={liked ? { color: 'var(--brand)', borderColor: 'var(--brand)' } : undefined}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1L12 21l7.7-7.6 1.1-1a5.5 5.5 0 0 0 0-7.8z" />
      </svg>
      <span data-testid="tl-like-count">{likes}</span>
    </button>
  );
}
