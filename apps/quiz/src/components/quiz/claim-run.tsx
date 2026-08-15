'use client';

import { useCallback, useEffect, useState } from 'react';

import { useToast } from '@/components/ui/toast-provider';
import { getAnonId } from '@/lib/anon-id';

// W3 PART A4 - CLAIM THIS RUN, at the moment it was earned.
//
// The doctrine (docs/PLAY-GUEST-CONVERSION.md): never gate play, gate IDENTITY. The
// account is not a door, it is the name on what the guest already earned. This block
// therefore appears AFTER the score, never before, and refusing it costs nothing:
// the run is already recorded and stays recorded.
//
// COPY HONESTY (A3, non-negotiable). The 36,158 guest plays made before migration
// 155 carry no browser id and can NEVER be claimed. So this must not say "recover
// your history", "get your past scores back", or anything implying old runs return.
// It says only what is true: from here on, this browser's runs carry your name.

export function ClaimRun({ signedIn, surface }: { signedIn: boolean; surface: 'quiz' | 'battle' }): React.ReactElement | null {
  const { showToast } = useToast();
  const [hasId, setHasId] = useState(false);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  // localStorage is client-only, so the block decides after mount. No id (private
  // mode) means there is nothing to claim and nothing to promise.
  useEffect(() => { setHasId(getAnonId() !== null); }, []);

  const claim = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/claim-runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anonId: getAnonId() }),
      });
      const data = (await res.json()) as { claimed?: { plays: number; battles: number }; error?: string };
      if (res.status === 401) {
        showToast('Sign in first, then this run takes your name.', 'info');
        return;
      }
      if (!res.ok || !data.claimed) {
        showToast('Could not attach this run right now.', 'error');
        return;
      }
      const total = data.claimed.plays + data.claimed.battles;
      setDone(true);
      showToast(
        total > 0
          ? `Done. ${total} ${total === 1 ? 'run' : 'runs'} from this browser now carry your name.`
          : 'Done. Your runs from this browser will carry your name.',
        'success',
      );
    } catch {
      showToast('Could not attach this run right now.', 'error');
    } finally {
      setBusy(false);
    }
  }, [showToast]);

  if (!hasId || done) return null;

  return (
    <div className="claim-run">
      <p className="claim-run-line">
        {signedIn ? 'This run is not on your account yet.' : 'This run counts either way.'}
      </p>
      <p className="claim-run-sub">
        {signedIn
          ? 'Put your name on it and on the runs you make from this browser from now on.'
          : 'Sign in and it takes your name, along with the runs you make from this browser from now on. No email needed.'}
      </p>
      {signedIn ? (
        <button type="button" className="claim-run-cta" onClick={() => void claim()} disabled={busy}>
          {busy ? 'Attaching...' : 'Put my name on it'}
        </button>
      ) : (
        <a className="claim-run-cta" href={`/login?next=${encodeURIComponent(typeof window === 'undefined' ? '/' : window.location.pathname)}&claim=1`}>
          Claim your spot
        </a>
      )}
      <p className="claim-run-note">
        {surface === 'battle' ? 'It also makes you reachable when someone beats your run.' : 'Your score is saved whether you do this or not.'}
      </p>
    </div>
  );
}
