'use client';

import { useEffect, useState } from 'react';

// The like control + a one-shot view ping for a published list. A like is an
// authenticated toggle (POST /api/tier-list/like), idempotent server-side by the
// 147 (list_id,user_id) row; logged out, the heart prompts sign-in and writes
// nothing. The public count always shows. Views bump atomically (POST
// /api/tier-list/view), deduped per browser so a reload does not inflate. Fail-soft
// throughout.

export function PublicEngage({ slug, initialLikes }: { slug: string; initialLikes: number }) {
  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [prompt, setPrompt] = useState(false);

  useEffect(() => {
    // The viewer's own like state (filled heart) + a fresh count.
    fetch(`/api/tier-list/like?slug=${encodeURIComponent(slug)}`).then((r) => r.json()).then((j) => {
      if (typeof j.likes === 'number') setLikes(j.likes);
      setLiked(Boolean(j.liked));
      setNeedsAuth(Boolean(j.needsAuth));
    }).catch(() => { /* ignore */ });
    // One view per browser (stored flag), bumped atomically server-side.
    try {
      if (!localStorage.getItem(`tl:viewed:${slug}`)) {
        localStorage.setItem(`tl:viewed:${slug}`, '1');
        void fetch('/api/tier-list/view', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug }) });
      }
    } catch { /* ignore */ }
  }, [slug]);

  async function toggle() {
    if (needsAuth) { setPrompt(true); return; }
    const next = !liked;
    setLiked(next);
    setLikes((n) => Math.max(0, n + (next ? 1 : -1)));
    try {
      const res = await fetch('/api/tier-list/like', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, action: next ? 'like' : 'unlike' }) });
      const j = await res.json().catch(() => ({}));
      if (res.status === 401) { setNeedsAuth(true); setPrompt(true); setLiked(false); setLikes((n) => Math.max(0, n - 1)); return; }
      if (res.ok) { setLiked(Boolean(j.liked)); if (typeof j.likes === 'number') setLikes(j.likes); }
    } catch { /* keep optimistic */ }
  }

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
      <button type="button" className="tl-btn out sm" onClick={toggle} aria-pressed={liked} data-testid="tl-like" style={liked ? { color: 'var(--brand)', borderColor: 'var(--brand)' } : undefined}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1L12 21l7.7-7.6 1.1-1a5.5 5.5 0 0 0 0-7.8z" />
        </svg>
        <span data-testid="tl-like-count">{likes}</span>
      </button>
      {prompt && needsAuth && (
        <span className="tl-mut" role="status" data-testid="tl-like-signin" style={{ fontSize: 12 }}>
          <a className="tl-crumb" style={{ color: 'var(--brand)' }} href="/login">Sign in</a> to like
        </span>
      )}
    </span>
  );
}
