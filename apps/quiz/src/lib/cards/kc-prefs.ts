'use client';

// KpopCards: the two switches of the profile panel, Sound and Vibration (separate, both on by default, as in the v6 prototype). Kept in this browser
// (localStorage, never the account) until the prefs file 107 of the contract is applied; the opening (agent C's sound and vibration) reads them
// through readPrefs(). A change is announced with the `kc-prefs` event so every mounted reader updates at once.
import { useEffect, useState } from 'react';

export interface KcPrefs { sound: boolean; vibration: boolean }
export const PREFS_KEY = 'kpopcards-prefs';
export const PREFS_EVENT = 'kc-prefs';
const DEFAULTS: KcPrefs = { sound: true, vibration: true };

export function readPrefs(): KcPrefs {
  try {
    const j = JSON.parse(localStorage.getItem(PREFS_KEY) ?? 'null') as Partial<KcPrefs> | null;
    return { sound: typeof j?.sound === 'boolean' ? j.sound : DEFAULTS.sound, vibration: typeof j?.vibration === 'boolean' ? j.vibration : DEFAULTS.vibration };
  } catch {
    return { ...DEFAULTS };
  }
}

export function writePrefs(patch: Partial<KcPrefs>): KcPrefs {
  const next = { ...readPrefs(), ...patch };
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(next)); } catch { /* private mode: the switch still works for this visit */ }
  try { window.dispatchEvent(new CustomEvent(PREFS_EVENT, { detail: next })); } catch { /* no CustomEvent */ }
  return next;
}

/** The switches as React state, read after mount (so the server and the first client paint agree on the defaults). */
export function useKcPrefs(): [KcPrefs, (patch: Partial<KcPrefs>) => void] {
  const [p, setP] = useState<KcPrefs>(DEFAULTS);
  useEffect(() => {
    setP(readPrefs());
    const on = (): void => setP(readPrefs());
    window.addEventListener(PREFS_EVENT, on);
    window.addEventListener('storage', on);
    return () => { window.removeEventListener(PREFS_EVENT, on); window.removeEventListener('storage', on); };
  }, []);
  return [p, (patch) => setP(writePrefs(patch))];
}
