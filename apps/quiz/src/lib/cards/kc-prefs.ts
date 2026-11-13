'use client';

// KpopCards: the two switches of the profile panel, Sound and Vibration (separate, both on by default), as React state over agent C's store
// (lib/cards/opening-prefs.ts), which the opening reads and which is saved to the account through syncPrefs (components/cards/opening-prefs-sync.ts).
import { useEffect, useState } from 'react';

import { getPrefs, setPref, subscribePrefs } from './opening-prefs';

import type { OpeningPrefs } from './opening-prefs';

export type KcPrefs = OpeningPrefs;

/** The switches after mount (so the server and the first client paint agree on the defaults). */
export function useKcPrefs(): [KcPrefs, (patch: Partial<KcPrefs>) => void] {
  const [p, setP] = useState<KcPrefs>({ sound: true, vibration: true });
  useEffect(() => {
    setP(getPrefs());
    return subscribePrefs(setP);
  }, []);
  return [p, (patch) => { for (const k of ['sound', 'vibration'] as const) if (patch[k] !== undefined) setPref(k, patch[k]!); }];
}
