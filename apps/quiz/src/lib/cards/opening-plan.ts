// KpopCards, lots 3 to 5 (agent C): the pure plan of the opening, one place for every number of the v6 prototype (docs/design/cards/
// kpopcards-prototype-v6.html: REV, NOTES, sSting, sBoom, reveal(), summary(), multiGrid(), the opening sizes). No DOM, no timer, no sound
// here: the component and the sound engine only run what this file decides, so the tests can drive all of it. Nothing in this file draws a
// card or decides a result: the server did, the client only shows (the best card of a pack is read from the cards it was given).
import { RARITIES } from '@/lib/cards/rules';

import type { Edition, Rarity } from '@/lib/cards/types';

/* ------------------------------------------------------------------ timings per edition */

/** Prototype REV: wait before the flip, flip length, then (from the start of the flip) the weight of the label wait, in ms. */
export interface EditionTiming { wait: number; flip: number; label: number }
export const REVEAL: Record<Edition, EditionTiming> = {
  std: { wait: 0, flip: 520, label: 240 },
  stage: { wait: 0, flip: 600, label: 320 },
  holo: { wait: 0, flip: 700, label: 380 },
  era: { wait: 450, flip: 800, label: 420 },
  gold: { wait: 800, flip: 1050, label: 620 },
  full: { wait: 1100, flip: 1300, label: 900 },
};
/** The edition of each rarity (the one name per rarity: rules.ts RARITY_LABEL). */
export const EDITION_OF: Record<Rarity, Edition> = { C: 'std', U: 'stage', R: 'holo', SR: 'era', UR: 'gold', L: 'full' };
/** Under reduced motion every change of state is a fade of this length, never zero. */
export const FADE_MS = 200;

export const rarityIndex = (r: Rarity): number => RARITIES.indexOf(r);
export const isGoldOrBetter = (r: Rarity): boolean => rarityIndex(r) >= 4;
export const isFullArt = (r: Rarity): boolean => r === 'L';

/** The --flip custom property of the card (ms): 0 under reduced motion, where the faces cross-fade in 200 ms by CSS instead of turning. */
export function flipMs(r: Rarity, reduced: boolean): number {
  return reduced ? 0 : REVEAL[EDITION_OF[r]].flip;
}
/** The wait before the flip (the charge: a glow and a shake of the back). Kept under reduced motion, where it is a still pause, not motion. */
export function waitMs(r: Rarity): number {
  return REVEAL[EDITION_OF[r]].wait;
}
/** From the start of the flip to the label, the burst and the sting: 55 % of the flip plus 45 % of the edition's label weight. */
export function labelAfterMs(r: Rarity, reduced: boolean): number {
  if (reduced) return FADE_MS;
  const t = REVEAL[EDITION_OF[r]];
  return Math.round(t.flip * 0.55 + t.label * 0.45);
}

/* ------------------------------------------------------------------ colours and bursts */

/** The particle colours of each rarity (the prototype's RCOL), the one place outside the style sheets that holds raw colours. */
export const RARITY_COLORS: Record<Rarity, readonly string[]> = {
  C: ['#8B93A7'], U: ['#12A877', '#4BE3A3'], R: ['#2F80ED', '#5DB2FF'], SR: ['#9B59D9', '#BE92FF', '#E8457A'],
  UR: ['#D99A00', '#FFC94D', '#FF9E5E'], L: ['#E8457A', '#FFC24B', '#3CCB7F', '#2F9BFF', '#9B59D9'],
};
/** The colours of the pack's tear burst. */
export const TEAR_COLORS: readonly string[] = ['#FF8DB8', '#C55BFF', '#4CC9FF', '#FFD27A'];
/** The finished-set confetti. */
export const FINISH_COLORS: readonly string[] = ['#166534', '#3CCB7F', '#FFC24B', '#E8457A'];
/** The glow behind the best card of Reveal all (the prototype's SPOT). */
export const SPOT_GLOW: Record<Rarity, string> = {
  C: 'rgba(201,206,219,.7)', U: 'rgba(75,227,163,.6)', R: 'rgba(93,178,255,.65)', SR: 'rgba(190,146,255,.7)', UR: 'rgba(255,201,77,.75)', L: 'rgba(255,118,182,.8)',
};
/** Particles on the canvas at once, at most (lot 5: one canvas pixel per screen pixel and a ceiling on the work per frame). */
export const MAX_PARTICLES = 260;

export interface BurstSpec { n: number; colors: readonly string[]; speed: number; size: number; shape?: 'confetti'; g?: number; delay?: number }
export interface RainSpec { colors: readonly string[]; n: number }

const BURST_N = [0, 18, 30, 60, 80, 120] as const;
const BURST_SPEED = [0, 5, 6, 8, 9, 11] as const;

/* ------------------------------------------------------------------ sound and vibration */

export const NOTES = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98] as const;
export interface ToneSpec { freq: number; at: number; dur: number; type: OscillatorType; vol: number }

/** The flip tick: two short tones. */
export function flipTicks(): ToneSpec[] {
  return [{ freq: 1800, at: 0, dur: 0.035, type: 'square', vol: 0.035 }, { freq: 900, at: 0.018, dur: 0.06, type: 'triangle', vol: 0.05 }];
}
/** The sting of a revealed card: notes rising with the edition (one more note per rarity, the last one long), and the shimmer from Gold. */
export function stingTones(ri: number): ToneSpec[] {
  if (ri < 1) return [{ freq: 660, at: 0, dur: 0.14, type: 'sine', vol: 0.05 }];
  const out: ToneSpec[] = [];
  for (let i = 0; i <= ri; i++) out.push({ freq: NOTES[i]!, at: i * 0.075, dur: 0.38 + (i === ri ? 0.5 : 0), type: 'triangle', vol: 0.09 });
  if (ri >= 4) for (let j = 0; j < 6; j++) out.push({ freq: 2093 + j * 190, at: 0.45 + j * 0.05, dur: 0.26, type: 'sine', vol: 0.025 });
  return out;
}
/** The low boom of a Full Art (and of a Gold or Full Art in the summary): two low tones, plus the noise of the tear. */
export function boomTones(): ToneSpec[] {
  return [{ freq: 70, at: 0, dur: 0.9, type: 'sine', vol: 0.22 }, { freq: 140, at: 0, dur: 0.5, type: 'triangle', vol: 0.08 }];
}
/** The rising hum while a Gold or Full Art charges: a sawtooth from 110 to 880 Hz over the wait. */
export function humSpec(ms: number): { from: number; to: number; sec: number; peak: number } {
  return { from: 110, to: 880, sec: ms / 1000, peak: 0.05 };
}
/** The noise of the rip: 340 ms of noise through a band that sweeps from 800 to 4400 Hz. */
export const RIP = { sec: 0.34, from: 800, to: 4400, sweep: 0.3, q: 1.1, gain: 0.3, curve: 1.4 } as const;

export type SoundCue =
  | { kind: 'rip' } | { kind: 'flip' } | { kind: 'sting'; ri: number } | { kind: 'hum'; ms: number } | { kind: 'boom' };

export const VIBE = {
  warn: [12, 80, 12], tear: 18, charge: [10, 60, 10], high: [20, 40, 30], full: [30, 40, 30, 40, 140],
} as const;
/** The vibration of a revealed card: nothing below Era, a short pattern for Era and Gold, a long one for Full Art. */
export function revealVibe(ri: number): readonly number[] | null {
  if (ri < 3) return null;
  return ri >= 5 ? VIBE.full : VIBE.high;
}

/** Sound and vibration are separate switches, and neither plays before the player has touched the page. */
export interface OutputGate { sound: boolean; vibration: boolean; gesture: boolean }
export function canSound(g: OutputGate): boolean { return g.sound && g.gesture; }
export function canVibrate(g: OutputGate): boolean { return g.vibration && g.gesture; }

/* ------------------------------------------------------------------ the reveal of one card */

export interface RevealPlan {
  /** Wait before the flip (ms). */
  wait: number;
  /** The flip length (ms), 0 under reduced motion. */
  flip: number;
  /** ms after the start of the flip to the label, the burst and the sting. */
  labelAt: number;
  /** The back of the card charges (a glow and a shake) while it waits. */
  charge: boolean;
  /** The hint while it charges. */
  chargeHint: 'full' | 'better' | null;
  /** The dark stage rises while it charges (Gold and Full Art). */
  stageOnCharge: boolean;
  hum: number | null;
  /** At the label: the rings (Gold and Full Art), the flash and the shake (Full Art, by the CSS of tone-L), the stamp and the boom (Full Art). */
  bang: boolean;
  legend: boolean;
  stamp: boolean;
  boom: boolean;
  sweep: boolean;
  burst: BurstSpec | null;
  rain: RainSpec | null;
  /** The confetti burst of a Full Art and the second burst 180 ms later. */
  confetti: BurstSpec | null;
  afterBurst: BurstSpec | null;
  vibrate: readonly number[] | null;
  sting: ToneSpec[];
}

/**
 * Everything the reveal of one card does, from its rarity. `fast` is a tap that jumped the animation to its end (no wait, no confetti
 * burst, a smaller rain, as the prototype's flush); `reduced` is reduced motion (fades of 200 ms, no particles: the burst, the rain and
 * the confetti are skipped by the particle layer itself, the plan keeps them so the layer decides in one place).
 */
export function revealPlan(r: Rarity, opts: { fast?: boolean; reduced?: boolean } = {}): RevealPlan {
  const ri = rarityIndex(r);
  const fast = opts.fast === true;
  const reduced = opts.reduced === true;
  const wait = waitMs(r);
  const colors = RARITY_COLORS[r];
  const burst: BurstSpec | null = !fast && ri >= 1 ? { n: BURST_N[ri]!, colors, speed: BURST_SPEED[ri]!, size: ri >= 4 ? 3.4 : 2.6 } : null;
  const rain: RainSpec | null = ri === 4 ? { colors: RARITY_COLORS.UR, n: fast ? 30 : 60 } : ri === 5 ? { colors: RARITY_COLORS.L, n: fast ? 50 : 90 } : null;
  return {
    wait,
    flip: flipMs(r, reduced),
    labelAt: fast ? 0 : labelAfterMs(r, reduced),
    charge: wait > 0,
    chargeHint: wait > 0 ? (ri >= 5 ? 'full' : 'better') : null,
    stageOnCharge: wait > 0 && ri >= 4,
    hum: wait > 0 && ri >= 4 ? wait + 300 : null,
    bang: ri >= 4,
    legend: ri === 5,
    stamp: ri === 5,
    boom: ri === 5,
    sweep: ri >= 1,
    burst,
    rain,
    confetti: ri === 5 && !fast ? { n: 90, colors: RARITY_COLORS.L, speed: 13, shape: 'confetti', size: 4 } : null,
    afterBurst: ri === 5 && !fast ? { n: 80, colors: RARITY_COLORS.L, speed: 15, size: 3.6, delay: 180 } : null,
    vibrate: revealVibe(ri),
    sting: stingTones(ri),
  };
}

/** The stamp of a Full Art stays this long (ms), then fades by CSS; the CSS delay and this constant are tested to agree. */
export const STAMP_MS = 2400;

/* ------------------------------------------------------------------ the pack and the tear */

export const TEAR = { cutMs: 450, cutMsReduced: 60, tearAfter: 470, pileAfter: 950, pileAfterReduced: 220, burst: { n: 40, speed: 9, g: 0.1, size: 2.6 }, drag: 0.62 } as const;
/** The first screen warns of a big pull: Gold or Full Art in the pack, a halo behind the pack and a short buzz. */
export function warnLevel(best: Rarity): 'UR' | 'L' | null {
  return best === 'UR' || best === 'L' ? best : null;
}

/* ------------------------------------------------------------------ reveal all: the summary and its spotlight */

/** How long the best card of Reveal all is held up: 600 ms, longer when the stage rises for a Gold or a Full Art, 900 under reduced motion... */
export const SPOTLIGHT_MS = 600;
export function spotlightHoldMs(best: Rarity, reduced: boolean): number {
  if (reduced) return 900;
  return isGoldOrBetter(best) ? 1400 : SPOTLIGHT_MS;
}

/** What the summary shows for a pack: the stage and the sound of its best card, the rain, and the sweep. */
export interface SummaryPlan { stage: boolean; boom: boolean; rain: RainSpec | null; sweep: boolean; sting: ToneSpec[]; stageOffMs: number }
export function summaryPlan(best: Rarity, opts: { spot: boolean; multi: boolean; reduced: boolean }): SummaryPlan {
  const ri = rarityIndex(best);
  const stage = ri >= 4;
  const rainN = opts.multi ? (ri === 5 ? 90 : 50) : ri === 5 ? 140 : 60;
  return {
    stage,
    boom: ri === 5,
    rain: stage ? { colors: RARITY_COLORS[best], n: rainN } : null,
    sweep: ri >= 1,
    sting: stingTones(ri),
    stageOffMs: opts.multi ? (opts.reduced ? 400 : 1500) : spotlightHoldMs(best, opts.reduced),
  };
}

/* ------------------------------------------------------------------ Open 5: five packs, 25 cards */

export const MULTI = {
  ripAfter: 450, ripAfterReduced: 60, gridAfter: 650, gridAfterReduced: 150, flipAfterReduced: 120, doneAfterReduced: 250, ripStagger: 110,
  deal: 26, flipStep: 45, highExtra: 260, spotHold: 1300, spotHoldReduced: 600,
} as const;
/** The order of the 25 cards: the best first (rarity, then new before copy, then draw order); the grid turns them from the last to the best. */
export function multiOrder<T extends { rarity: Rarity; isNew: boolean }>(rows: readonly T[]): { row: T; i: number }[] {
  return rows.map((row, i) => ({ row, i })).sort((a, b) => (rarityIndex(b.row.rarity) - rarityIndex(a.row.rarity)) || (Number(b.row.isNew) - Number(a.row.isNew)) || (a.i - b.i));
}
/** The deal delay (--d) and the turn delay (--fd) of the card at `pos` in the order, of `n` cards. The best has the last turn. */
export function multiDelays(pos: number, n: number, r: Rarity): { d: number; fd: number } {
  return { d: pos * MULTI.deal, fd: (n - 1 - pos) * MULTI.flipStep + (rarityIndex(r) >= 4 ? MULTI.highExtra : 0) };
}
/** ms from the dealt grid to the turn (the cards must have arrived), and from the turn to the summary. */
export const multiFlipAfter = (n: number, reduced: boolean): number => (reduced ? MULTI.flipAfterReduced : n * MULTI.deal + 380);
export const multiDoneAfter = (n: number, reduced: boolean): number => (reduced ? MULTI.doneAfterReduced : (n - 1) * MULTI.flipStep + 700);
/** The columns of the grid: five up to 759 px wide, ten from there. */
export const multiColumns = (vw: number): 5 | 10 => (vw >= 760 ? 10 : 5);

/* ------------------------------------------------------------------ sizes from the screen height */

/**
 * The opening's sizes in px, from the screen (vw, svh = the height with the browser bars showing). The same formulas are in the style sheet
 * (cards-opening.css); a test keeps the two together. The stack of the opening is: padding 14, the top row 44, a gap 18, the hint 24, a gap
 * 18, the centre (the pack, the pile or the fan), a gap 18, the label 36, a gap 18, the row of five slots 86, padding 16: the centre may
 * take what is left, and never more, so the row of slots always has room (an empty `.ov-actions` is 0 high).
 */
export const OPENING_CHROME = { pad: 14 + 16, top: 44, hint: 24, label: 36, slots: 86, gap: 18 } as const;
export interface OpeningSizes { pack: number; packH: number; pile: number; pileH: number; fanH: number; fanCard: number; mpack: number; mpacksH: number }
export function openingSizes(vw: number, svh: number): OpeningSizes {
  const pack = Math.max(0, Math.min(240, vw * 0.58, (svh - 310) * 0.625));
  const pile = Math.max(0, Math.min(340, vw * 0.72, (svh - 300) * 0.647));
  const fanCard = Math.max(0, vw <= 520 ? Math.min(vw * 0.26, (svh - 360) * 0.647) : Math.min(165, vw * 0.29, (svh - 360) * 0.647));
  const mpack = Math.max(0, Math.min(130, vw * 0.22, (svh - 330) * 0.5));
  return {
    pack, packH: pack / 0.625, pile, pileH: pile / 0.647,
    fanH: Math.max(0, Math.min(320, svh * 0.48, svh - 340)), fanCard,
    mpack, mpacksH: Math.max(0, Math.min(300, svh - 330)),
  };
}
/** The height of what is stacked around the centre of the pile screen, for the test of "the row of slots always has room". */
export function pileScreenHeight(vw: number, svh: number): number {
  const c = OPENING_CHROME;
  return c.pad + c.top + c.gap + c.hint + c.gap + openingSizes(vw, svh).pileH + c.gap + c.label + c.gap + c.slots;
}
