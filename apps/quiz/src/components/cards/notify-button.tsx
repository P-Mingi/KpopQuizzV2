'use client';

// Bunnyverse Cards, lot 4: the minimal "Notify me" button over lib/cards/push-client.ts (the packs page tile may draw its own). Not drawn when the
// feature is off or the browser has no web push. 44 px tall. The browser permission is asked on the tap only. Says "Turn on" / "On".
import { useCallback, useEffect, useState } from 'react';

import { pushState, turnOff, turnOn } from '@/lib/cards/push-client';

import type { PushState } from '@/lib/cards/push-client';

export function NotifyButton({ className }: { className?: string }): React.ReactElement | null {
  const [state, setState] = useState<PushState>('unsupported');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    void pushState().then((s) => {
      if (live) setState(s);
    });
    return () => {
      live = false;
    };
  }, []);

  const tap = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      setState(state === 'on' ? await turnOff() : await turnOn());
    } finally {
      setBusy(false);
    }
  }, [busy, state]);

  if (state === 'unsupported') return null;
  const denied = state === 'denied';
  return (
    <button
      type="button"
      className={className}
      style={{ minHeight: 44, minWidth: 44, padding: '0 16px', cursor: denied ? 'not-allowed' : 'pointer' }}
      aria-pressed={state === 'on'}
      aria-label={denied ? 'Notifications are blocked in your browser' : 'Notify me when my packs are ready'}
      disabled={busy || denied}
      onClick={() => void tap()}
    >
      {denied ? 'Blocked' : state === 'on' ? 'On' : 'Turn on'}
    </button>
  );
}
