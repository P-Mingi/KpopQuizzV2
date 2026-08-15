'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useToast } from '@/components/ui/toast-provider';
import { getAnonId } from '@/lib/anon-id';
import { analytics } from '@/lib/analytics';

import type { ClaimSurface } from '@/lib/analytics';

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

export function ClaimRun({ signedIn, surface }: { signedIn: boolean; surface: ClaimSurface }): React.ReactElement | null {
  const { showToast } = useToast();
  const [hasId, setHasId] = useState(false);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  // localStorage is client-only, so the block decides after mount. No id (private
  // mode) means there is nothing to claim and nothing to promise.
  //
  // W3b PART 1: the funnel starts here. SHOWN only fires when the block actually
  // renders, so the denominator is real impressions, not page views. The refusal
  // case is recorded too, because "we never even showed it" is the single most
  // common reason a claim does not happen and it would otherwise be invisible.
  //
  // SHOWN fires ONCE per mount. React StrictMode double-invokes effects in dev, and
  // without this guard every impression was counted twice, which would have made the
  // funnel's denominator quietly wrong.
  const shownRef = useRef(false);
  useEffect(() => {
    const id = getAnonId();
    setHasId(id !== null);
    if (shownRef.current) return;
    shownRef.current = true;
    if (id !== null) analytics.claimFunnel('shown', surface);
    else analytics.claimFunnel('refused', surface, { reason: 'no_browser_id' });
  }, [surface]);

  const claim = useCallback(async () => {
    setBusy(true);
    analytics.claimFunnel('started', surface);
    try {
      const res = await fetch('/api/claim-runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anonId: getAnonId() }),
      });
      const data = (await res.json()) as { claimed?: { plays: number; battles: number; games?: number }; error?: string };
      if (res.status === 401) {
        analytics.claimFunnel('refused', surface, { reason: 'sign_in_required' });
        showToast('Sign in first, then this run takes your name.', 'info');
        return;
      }
      if (res.status === 403) {
        analytics.claimFunnel('refused', surface, { reason: 'anon_id_mismatch' });
        showToast('Could not attach this run right now.', 'error');
        return;
      }
      if (!res.ok || !data.claimed) {
        analytics.claimFunnel('refused', surface, { reason: 'error' });
        showToast('Could not attach this run right now.', 'error');
        return;
      }
      const total = data.claimed.plays + data.claimed.battles + (data.claimed.games ?? 0);
      // COMPLETED carries the row count, so the funnel can tell "claimed and moved
      // 3 runs" from "claimed and moved nothing", which are very different outcomes.
      if (total > 0) analytics.claimFunnel('completed', surface, { moved: total });
      else analytics.claimFunnel('refused', surface, { reason: 'nothing_to_claim' });
      setDone(true);
      showToast(
        total > 0
          ? `Done. ${total} ${total === 1 ? 'run' : 'runs'} from this browser now carry your name.`
          : 'Done. Your runs from this browser will carry your name.',
        'success',
      );
    } catch {
      analytics.claimFunnel('refused', surface, { reason: 'error' });
      showToast('Could not attach this run right now.', 'error');
    } finally {
      setBusy(false);
    }
  }, [showToast, surface]);

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
        {surface === 'battle-result' ? 'It also makes you reachable when someone beats your run.' : 'Your score is saved whether you do this or not.'}
      </p>
    </div>
  );
}
