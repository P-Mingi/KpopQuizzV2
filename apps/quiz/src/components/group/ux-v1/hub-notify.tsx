'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { Icon } from '@/components/ux-v1/icon';
import { useSignIn } from '@/components/ux-v1/sign-in-sheet';
import { useUxToast } from '@/components/ux-v1/toast';
import { useIsClient } from '@/components/ux-v1/use-is-client';
import { takePendingAction } from '@/lib/ux-v1/a0/pending-action';

import type { AlertState } from '@/lib/ux-v1/p3/alerts';

const ACTION = 'p3-notify';
const ENDPOINT = '/api/ux-v1/p3/notify';
const NOT_LIVE = 'Group alerts are not switched on yet. Make the first quiz instead.';

/**
 * "Notify me" on an empty group hub (prototype renderHub, DESIGN-SPEC 16.7): a
 * toggle (aria-pressed) that asks to be told when the group's first quiz is out.
 * Guests get the sign-in sheet and the action resumes after sign-in. The store is
 * a pending migration (group_quiz_alerts): until the owner applies it the route
 * answers "not live" and this button says so, with no write.
 */
export function HubNotify({ groupId, groupName }: { groupId: number; groupName: string }): React.ReactElement {
  const toast = useUxToast();
  const signIn = useSignIn();
  const [state, setState] = useState<AlertState | null>(null);
  const [busy, setBusy] = useState(false);
  const resumed = useRef(false);
  const live = useIsClient();

  const save = useCallback(async (on: boolean): Promise<void> => {
    setBusy(true);
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, on }),
      });
      if (res.status === 503) { setState((s) => (s ? { ...s, live: false } : s)); toast(NOT_LIVE); return; }
      if (res.status === 401) { setState((s) => (s ? { ...s, signedIn: false } : s)); signIn({ title: 'Sign in to get notified', action: { id: ACTION, payload: { groupId } } }); return; }
      if (!res.ok) { toast('Could not save. Try again.'); return; }
      const body = (await res.json()) as { subscribed?: boolean };
      const subscribed = body.subscribed === true;
      setState({ live: true, signedIn: true, subscribed });
      toast(subscribed ? `You will get a notification for the first ${groupName} quiz` : 'Notification off');
    } catch {
      toast('Could not save. Try again.');
    } finally {
      setBusy(false);
    }
  }, [groupId, groupName, signIn, toast]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`${ENDPOINT}?group=${groupId}`, { cache: 'no-store' });
        const s = res.ok ? ((await res.json()) as AlertState) : { live: false, signedIn: false, subscribed: false };
        if (cancelled) return;
        setState(s);
        // Continue the action a guest started before signing in (16.6).
        if (!resumed.current && s.signedIn) {
          resumed.current = true;
          const pending = takePendingAction(ACTION);
          const want = (pending?.payload as { groupId?: number } | undefined)?.groupId;
          if (want === groupId && s.live && !s.subscribed) void save(true);
        }
      } catch {
        if (!cancelled) setState({ live: false, signedIn: false, subscribed: false });
      }
    })();
    return () => { cancelled = true; };
  }, [groupId, save]);

  const on = state?.subscribed === true;
  const click = (): void => {
    if (busy) return;
    if (state && !state.live) { toast(NOT_LIVE); return; }
    if (state && !state.signedIn) {
      signIn({ title: 'Sign in to get notified', sub: `We will tell you when the first ${groupName} quiz is out.`, action: { id: ACTION, payload: { groupId } } });
      return;
    }
    void save(!on);
  };

  return (
    <button type="button" className="ux-btn ux-btn-ghost ux-btn-lg p3-notify" aria-pressed={on} onClick={click} aria-busy={busy || undefined} data-live={live || undefined} data-state={state ? (state.live ? 'live' : 'off') : undefined}>
      <Icon name="bell" />
      <span>{on ? 'We will tell you' : 'Notify me'}</span>
    </button>
  );
}
