// Bunnyverse Cards, lot 3 (points B5, B8, B9): the small pure machines under the pack opening, kept out of the component so the tests can
// drive them with fake timers. No React, no DOM except finishAnimations (browser only, and it tolerates a missing Web Animations API).
import { RARITIES } from '@/lib/cards/rules';

import type { Rarity } from '@/lib/cards/types';

/** Point B5: a card stays at least this long on screen before a tap can send it down (Standard to Holo, then Era and above). */
export const DWELL_LOW_MS = 150;
export const DWELL_HIGH_MS = 450;
/** Point B8: how long the best card of a pack is held up after "Reveal all" has dealt the five. */
export const SPOTLIGHT_MS = 600;
/** Point B9: under reduced motion a change of state is a short fade of this length instead of a cut or a flip. */
export const FADE_MS = 200;
/** Point B7: the sweep of light over a Holo card at its reveal, in the same units as the CSS (duration and easing). */
export const SWEEP_MS = 900;
export const SWEEP_EASE = 'cubic-bezier(.2,.8,.2,1)';

/** Index of the first rarity that counts as "Era or better" (Era, Gold, Full Art). */
const ERA = RARITIES.indexOf('SR');

export const isEraOrBetter = (r: Rarity): boolean => RARITIES.indexOf(r) >= ERA;

/** How long a revealed card of this rarity stays before a tap can leave it. */
export function dwellMs(r: Rarity): number {
  return isEraOrBetter(r) ? DWELL_HIGH_MS : DWELL_LOW_MS;
}

/** The ms still to wait before a card shown at `shownAt` may be left (0 when it can go now). */
export function leaveWait(shownAt: number, now: number, r: Rarity): number {
  return Math.max(0, Math.ceil(shownAt + dwellMs(r) - now));
}

/**
 * Point B8: the card "Reveal all" holds up once the five are dealt: the best card of Era or better (the highest rarity, the first of
 * them on a tie). null when the pack holds no Era or better, so a pack of lower rarities gets no spotlight.
 */
export function spotlightIndex(rarities: readonly Rarity[]): number | null {
  let best = -1;
  let at = -1;
  rarities.forEach((r, i) => {
    const k = RARITIES.indexOf(r);
    if (k > best) { best = k; at = i; }
  });
  return best >= ERA ? at : null;
}

interface Pending { run: () => void; t: ReturnType<typeof setTimeout> }

/**
 * Point B5: the timed steps of one animation, which a tap can run to their end at once. start() schedules the steps (delays from now),
 * finish() clears the timers and runs every step not yet run, in order, synchronously. onIdle fires when the last step has run, by
 * its timer or by finish(), so the caller can run the tap it buffered.
 */
export class StepRunner {
  private pending: Pending[] = [];
  constructor(private onIdle: () => void = () => undefined) {}

  get busy(): boolean { return this.pending.length > 0; }

  start(steps: readonly (readonly [number, () => void])[]): void {
    for (const [ms, run] of steps) {
      const e: Pending = { run, t: setTimeout(() => {
        this.pending = this.pending.filter((p) => p !== e);
        run();
        if (!this.busy) this.onIdle();
      }, ms) };
      this.pending.push(e);
    }
  }

  /** Runs what is left of the animation now. Returns true when there was something left. */
  finish(): boolean {
    const rest = this.pending;
    this.pending = [];
    for (const e of rest) clearTimeout(e.t);
    for (const e of rest) e.run();
    if (rest.length && !this.busy) this.onIdle();
    return rest.length > 0;
  }

  cancel(): void {
    for (const e of this.pending) clearTimeout(e.t);
    this.pending = [];
  }
}

/**
 * Point B5 (the CSS side): jumps the running Web Animations (CSS animations and transitions) under `root` to their end. An infinite
 * animation (the Full Art ring) has no end and is left alone.
 */
export function finishAnimations(root: Element | null): void {
  if (!root || typeof root.getAnimations !== 'function') return;
  for (const a of root.getAnimations({ subtree: true })) {
    try {
      const end = a.effect?.getComputedTiming().endTime;
      if (end === Infinity) continue;
      a.finish();
    } catch { /* an animation that cannot finish is left to run */ }
  }
}
