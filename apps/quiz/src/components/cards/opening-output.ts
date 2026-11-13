// KpopCards (agent C): the one sound and vibration output of the opening, wired to the two switches (lib/cards/opening-prefs) and to the
// first gesture of the player. Browser only.
import { browserEnv, OpeningOutput } from '@/lib/cards/opening-sound';
import { getPrefs, subscribePrefs } from '@/lib/cards/opening-prefs';

let out: OpeningOutput | null = null;
let off: (() => void) | null = null;
let users = 0;

function build(): OpeningOutput {
  if (!out) {
    out = new OpeningOutput(browserEnv());
    const p = getPrefs();
    out.setPrefs(p);
    off = subscribePrefs((n) => out?.setPrefs(n));
  }
  return out;
}
export function openingOutput(): OpeningOutput { return build(); }

const EVENTS = ['pointerdown', 'keydown', 'touchstart', 'click'] as const;
const unlock = (): void => { build().unlock(); };

/** Starts listening for the first gesture (capture, on the window). Returns the stop; the output stays for the next opening. */
export function listenForGesture(): () => void {
  build();
  users += 1;
  for (const e of EVENTS) window.addEventListener(e, unlock, { capture: true, passive: true });
  return () => {
    users -= 1;
    if (users > 0) return;
    for (const e of EVENTS) window.removeEventListener(e, unlock, { capture: true });
  };
}

/** The tick the top bar plays when the Sound switch is turned on (call it inside the click). */
export function previewTick(): void {
  const o = build();
  o.unlock();
  o.cue({ kind: 'flip' });
  o.vibrate(null);
}
/** For the tests and for a full teardown. */
export function disposeOpeningOutput(): void { off?.(); off = null; out?.close(); out = null; users = 0; }
