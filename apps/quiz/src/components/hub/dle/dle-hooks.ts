'use client';

// Daily games step 4: the browser side of the pages of the Terrier: this device's storage, the calls to Postgres, the countdown.
import { useEffect, useMemo, useState } from 'react';

import { dleClient } from '@/lib/dle/client';
import { secondsUntilReset } from '@/lib/dle/day';
import { createBrowserClient } from '@/lib/supabase/client';

import type { DleClient, DleRpc } from '@/lib/dle/client';
import type { KeyStore } from '@/lib/dle/local';

/** A storage for the server and for a browser that refuses one: nothing is remembered. */
const NO_STORE: KeyStore = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

export function deviceStore(): KeyStore {
  if (typeof window === 'undefined') return NO_STORE;
  try {
    return window.localStorage;
  } catch {
    return NO_STORE;
  }
}

/** The public client of the browser: its session, when there is one, is what dle_guess reads as auth.uid(). */
export function useDleClient(): DleClient {
  return useMemo(() => {
    const rpc: DleRpc = (fn, args) => createBrowserClient().rpc(fn, args) as unknown as ReturnType<DleRpc>;
    return dleClient(rpc, deviceStore());
  }, []);
}

/** The seconds to the reset, ticking; null until the browser runs it (the server never prints a clock it would have to correct). */
export function useResetCountdown(): number | null {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = (): void => setLeft(secondsUntilReset(new Date()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  return left;
}

/** 07:12:33, the clock of the boards. */
export function clock(seconds: number | null): string {
  if (seconds === null) return '--:--:--';
  const s = Math.max(0, seconds);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}
