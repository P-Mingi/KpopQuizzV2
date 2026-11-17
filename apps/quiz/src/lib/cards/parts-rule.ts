// Bunnyverse Cards lot 7 (owner, 2026-11-17): a group photo gives 2 OR 3 cards, the smallest window that keeps everyone, and its panorama.
// The pure rule, in one place: the generator of 118 (gen-parts-sql.mts), the admin (the choice 2 or 3, its warning) and the tests read it.
// The geometry is scripts/cards/card-geometry.mjs (the owner's script cuts the files with it): the window of a photo in n cards is the widest
// n x 5.5 : 8.5 window, placed by the photo's one focal point (fx, fy, 0 to 100, as CSS object-position).
//
// The default (integrator, lot 7): 2 cards (11:8.5) when that window keeps everyone, else 3 cards (16.5:8.5) when that one does, else the
// photo goes to "To review" (3 cards proposed, the owner decides). "Keeps everyone": every head of a person the photo itself shows whole is
// inside the window with a margin (half a head on the sides, a quarter above, half below the chin). The heads come from the thumbnail check
// (a 400 px Commons thumbnail, geometry only: never a name, never an age). Without a usable verdict the ratio of the photo decides: a photo
// no wider than 11:8.5 loses nothing on its sides in 2 cards, one no wider than 16.5:8.5 loses nothing on its sides in 3 cards, a wider one
// waits for the owner.
import { PAIR_RATIO, TRIPLE_RATIO, groupBox } from '../../../scripts/cards/card-geometry.mjs';

export type Parts = 2 | 3;

/** Where the heads are, in percent of the photo (0 to 100): x0 the left edge of the leftmost head, x1 the right edge of the rightmost one,
 *  y0 the top of the highest head, y1 the lowest chin, hw the width of a typical head (percent of the photo's width). Geometry only. */
export interface HeadsBox { x0: number; x1: number; y0: number; y1: number; hw: number }

/** The thumbnail verdict of a group photo (lot 7 checkers). */
export interface PartsVerdict {
  /** People the photo shows whole (their head inside the photo). */
  people: number;
  /** People the photo itself already cuts at its edges (they are cut in any window: not counted). */
  cutByPhoto: number;
  /** null when the thumbnail does not let the checker place the heads. */
  box: HeadsBox | null;
  /** True when the thumbnail does not settle it. */
  unclear: boolean;
}

export interface PartsDecision {
  parts: Parts;
  /** The focal point the window needs (the current one when it already keeps everyone). */
  fx: number;
  fy: number;
  /** True when the focal point had to move. */
  moved: boolean;
  /** True: someone would be cut even in 3 cards (or the ratio alone cannot settle it): the photo waits in "To review". */
  review: boolean;
  /** 'thumbnail' (the heads decided) or 'ratio' (no usable verdict). */
  by: 'thumbnail' | 'ratio';
  /** One plain line for the admin and the SQL note. */
  note: string;
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** The area that must stay inside the window, in percent of the photo: the heads plus their margins. */
export function neededArea(w: number, h: number, b: HeadsBox): { l: number; r: number; t: number; b: number } {
  const hv = (b.hw * w) / h; // a head's width in percent of the photo's HEIGHT
  return { l: clamp(b.x0 - b.hw / 2, 0, 100), r: clamp(b.x1 + b.hw / 2, 0, 100), t: clamp(b.y0 - hv / 4, 0, 100), b: clamp(b.y1 + hv / 2, 0, 100) };
}

/** The window of `parts` cards at (fx, fy), in percent of the photo. */
export function windowPct(w: number, h: number, parts: Parts, fx: number, fy: number): { l: number; r: number; t: number; b: number } {
  const box = groupBox(w, h, parts, fx, fy);
  return { l: (box.left / w) * 100, r: ((box.left + box.width) / w) * 100, t: (box.top / h) * 100, b: ((box.top + box.height) / h) * 100 };
}

const EPS = 0.05;

/** True when the window of `parts` cards at (fx, fy) keeps every head with its margin. */
export function keepsEveryone(w: number, h: number, parts: Parts, fx: number, fy: number, b: HeadsBox): boolean {
  const need = neededArea(w, h, b);
  const win = windowPct(w, h, parts, fx, fy);
  return win.l <= need.l + EPS && win.r >= need.r - EPS && win.t <= need.t + EPS && win.b >= need.b - EPS;
}

/** One axis: the focal percent (0 to 100) that puts a window of `size` percent around [lo, hi], as close as possible to `cur`; null if none. */
function axis(size: number, lo: number, hi: number, cur: number): number | null {
  if (size >= 100 - EPS) return cur; // the window spans the whole axis: the focal point does not move it
  const minStart = Math.max(0, hi - size);
  const maxStart = Math.min(100 - size, lo);
  if (minStart > maxStart + EPS) return null;
  const curStart = ((100 - size) * cur) / 100;
  const start = clamp(curStart, minStart, maxStart);
  return clamp(Math.round((start / (100 - size)) * 100), 0, 100);
}

/** The focal point that makes the window of `parts` cards keep everyone: the current one when it does, else the nearest that does; null if none. */
export function placeWindow(w: number, h: number, parts: Parts, b: HeadsBox, fx: number, fy: number): { fx: number; fy: number; moved: boolean } | null {
  if (keepsEveryone(w, h, parts, fx, fy, b)) return { fx, fy, moved: false };
  const need = neededArea(w, h, b);
  const win = windowPct(w, h, parts, 0, 0);
  const nx = axis(win.r - win.l, need.l, need.r, fx);
  const ny = axis(win.b - win.t, need.t, need.b, fy);
  if (nx === null || ny === null) return null;
  // the rounding of the focal point can miss by a pixel: try the neighbours
  for (const dx of [0, -1, 1, -2, 2]) {
    for (const dy of [0, -1, 1, -2, 2]) {
      const x = clamp(nx + dx, 0, 100);
      const y = clamp(ny + dy, 0, 100);
      if (keepsEveryone(w, h, parts, x, y, b)) return { fx: x, fy: y, moved: x !== fx || y !== fy };
    }
  }
  return null;
}

/** The ratio rule alone (no usable verdict): what the window loses on the sides. */
export function partsByRatio(w: number, h: number): { parts: Parts; review: boolean; note: string } {
  const r = w / h;
  if (r <= PAIR_RATIO + 1e-9) return { parts: 2, review: false, note: `2 cards by the ratio (${r.toFixed(2)}): the 11:8.5 window keeps the whole width` };
  if (r <= TRIPLE_RATIO + 1e-9) return { parts: 3, review: false, note: `3 cards by the ratio (${r.toFixed(2)}): the 16.5:8.5 window keeps the whole width` };
  return { parts: 3, review: true, note: `To review: the photo is wider than 16.5:8.5 (${r.toFixed(2)}) and no thumbnail placed the heads; even 3 cards cut its sides` };
}

/** The default of a group photo: the smallest window (2, then 3 cards) that keeps everyone; else "To review" with 3 cards proposed. */
export function decideParts(w: number, h: number, fx: number, fy: number, v: PartsVerdict | null): PartsDecision {
  if (v && !v.unclear && v.box && v.people > 0) {
    for (const parts of [2, 3] as const) {
      const at = placeWindow(w, h, parts, v.box, fx, fy);
      if (at) {
        return {
          parts, fx: at.fx, fy: at.fy, moved: at.moved, review: false, by: 'thumbnail',
          note: parts === 2
            ? `2 cards: the 11:8.5 window keeps all ${v.people} people${at.moved ? ` once its focal point moves to ${at.fx}/${at.fy}` : ''}`
            : `3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all ${v.people} people${at.moved ? ` once its focal point moves to ${at.fx}/${at.fy}` : ''}`,
        };
      }
    }
    return { parts: 3, fx, fy, moved: false, review: true, by: 'thumbnail', note: `To review: someone would be cut even in 3 cards (${v.people} people in the photo)` };
  }
  const r = partsByRatio(w, h);
  return { parts: r.parts, fx, fy, moved: false, review: r.review, by: 'ratio', note: r.note };
}
