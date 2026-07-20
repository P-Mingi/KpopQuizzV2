'use client';

import { useEffect, useState } from 'react';

// Workstream LOOP - one place that answers "is this player signed in?" for the
// result screens, so the ResultLoop anon nudge never shows to a signed-in user.
//
// Reuses /api/auth/me, the same payload TopNav already fetches, so this adds no
// new endpoint. Starts as null (unknown) rather than false, which lets callers
// hold the nudge back until the answer is in instead of flashing it at everyone
// for a frame.
export function useSignedIn(): boolean | null {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { profile: null }))
      .then((d: { profile: unknown }) => {
        if (!cancelled) setSignedIn(Boolean(d.profile));
      })
      .catch(() => {
        // Treat a failed check as signed in: showing a sign-in nudge to someone
        // who is already signed in is the worse of the two mistakes.
        if (!cancelled) setSignedIn(true);
      });
    return () => { cancelled = true; };
  }, []);

  return signedIn;
}
