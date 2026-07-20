'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { haptic } from '@/lib/haptics';

// Follow / Following button (Workstream M, M1.8). CLIENT island so the public
// /u/[username] page stays static/ISR: the per-viewer follow state is resolved
// client-side via /api/follow (reuses the ProfileOwnerControls / TopNavProfile
// pattern), never inline server auth. Renders nothing on your own profile.
// Optimistic toggle; signed-out users are sent to login.
type State = { signedIn: boolean; isSelf: boolean; following: boolean } | null;

export function FollowButton({ profileUsername }: { profileUsername: string }): React.ReactElement | null {
  const router = useRouter();
  const [state, setState] = useState<State>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/follow?username=${encodeURIComponent(profileUsername)}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: State) => { if (!cancelled) setState(d); })
      .catch(() => { if (!cancelled) setState(null); });
    return () => { cancelled = true; };
  }, [profileUsername]);

  // Hidden until resolved, and on your own profile.
  if (!state || state.isSelf) return null;

  async function toggle(): Promise<void> {
    if (!state) return;
    if (!state.signedIn) { router.push('/login'); return; }
    const next = !state.following;
    if (next) haptic('follow');
    setState({ ...state, following: next }); // optimistic
    setPending(true);
    try {
      const res = await fetch('/api/follow', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ username: profileUsername, action: next ? 'follow' : 'unfollow' }),
      });
      if (!res.ok) setState((s) => (s ? { ...s, following: !next } : s)); // revert
    } catch {
      setState((s) => (s ? { ...s, following: !next } : s));
    } finally {
      setPending(false);
    }
  }

  const following = state.following;
  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={pending}
      aria-pressed={following}
      style={{
        flexShrink: 0,
        padding: '8px 18px',
        borderRadius: 9999,
        fontSize: 13,
        fontWeight: 700,
        cursor: pending ? 'default' : 'pointer',
        fontFamily: 'inherit',
        background: following ? 'transparent' : 'var(--brand-btn)',
        color: following ? 'var(--txt2)' : '#fff',
        border: following ? '1px solid var(--border)' : '1px solid var(--brand)',
      }}
    >
      {following ? 'Following' : 'Follow'}
    </button>
  );
}
