// Bunnyverse Cards lot 7: from the thumbnail checks (private, outside the repository) to docs/design/cards/data/lot7/parts.json, the public
// data of 118: per group photo, its cards (2 or 3), the heads' box (geometry only), the rule's line, the focal point it needs, "To review",
// or "rejected" (the lot 6 limit: a thumbnail that seems to show a person under 18). Pure: no file, no network. The script is
// scripts/cards/gen-parts-data.mts.
//
// Two looks per photo: (1) the checker reads where the heads are on a 10 % grid (PrivateVerdict); the rule (parts-rule.ts) places the
// 11:8.5 and the 16.5:8.5 windows from it; (2) the checker looks at each placed window drawn on the thumbnail and says whether it cuts
// anyone (WindowCheck). A window the second look says cuts someone is not used: 2 then goes to 3, 3 goes to "To review". A second look that
// is unclear or missing leaves the geometry's answer.
import { decideParts, placeWindow } from './parts-rule';

import type { HeadsBox, Parts, PartsVerdict } from './parts-rule';

/** One group photo of lots 3 and 6 that can become cards (not out), as the research files give it. */
export interface PartsItem { page: string; w: number; h: number; fx: number; fy: number }

/** A checker's first look (one line of the private verdicts file). */
export interface PrivateVerdict {
  people?: number | null;
  cut_by_photo?: number | null;
  x0?: number | null; x1?: number | null; y0?: number | null; y1?: number | null; hw?: number | null;
  seems_minor?: boolean;
  unclear?: boolean;
}

/** A checker's second look at one placed window. */
export interface WindowCheck { parts: Parts; cuts: boolean; unclear?: boolean }

export interface PartsEntry {
  page: string;
  parts: Parts;
  heads_box: HeadsBox | null;
  note: string;
  focal_from: { x: number; y: number };
  focal: { x: number; y: number };
  review: boolean;
  rejected: boolean;
  /** 'thumbnail': the heads decided (first look, or the second look overruled the geometry); 'ratio': no usable first look. */
  by: 'thumbnail' | 'ratio';
  /** True when the second look overruled the geometry (a window the geometry accepted cut someone on the thumbnail). */
  checked?: true;
}

export const REJECTED_NOTE = 'Rejected by the lot 7 thumbnail check: a person seems under 18';

const num = (v: number | null | undefined): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** The first look as the rule reads it; null when there is none. */
export function verdictOf(v: PrivateVerdict | undefined): PartsVerdict | null {
  if (!v) return null;
  const [x0, x1, y0, y1, hw] = [num(v.x0), num(v.x1), num(v.y0), num(v.y1), num(v.hw)];
  const ok = x0 !== null && x1 !== null && y0 !== null && y1 !== null && hw !== null && x1 > x0 && y1 >= y0 && hw > 0;
  return {
    people: num(v.people) ?? 0,
    cutByPhoto: num(v.cut_by_photo) ?? 0,
    box: ok ? { x0: x0!, x1: x1!, y0: y0!, y1: y1!, hw: hw! } : null,
    unclear: v.unclear === true || !ok,
  };
}

/** The window positions the second look is asked about: each of 2 and 3 cards that the geometry can place. */
export function windowsToCheck(it: PartsItem, v: PartsVerdict | null): Array<{ parts: Parts; fx: number; fy: number }> {
  if (!v || v.unclear || !v.box || v.people <= 0) return [];
  const out: Array<{ parts: Parts; fx: number; fy: number }> = [];
  for (const parts of [2, 3] as const) {
    const at = placeWindow(it.w, it.h, parts, v.box, it.fx, it.fy);
    if (at) out.push({ parts, fx: at.fx, fy: at.fy });
  }
  return out;
}

export function partsEntry(it: PartsItem, raw: PrivateVerdict | undefined, checks: readonly WindowCheck[] = []): PartsEntry {
  const from = { x: it.fx, y: it.fy };
  if (raw?.seems_minor === true) {
    return { page: it.page, parts: 2, heads_box: null, note: REJECTED_NOTE, focal_from: from, focal: from, review: false, rejected: true, by: 'thumbnail' };
  }
  const v = verdictOf(raw);
  const d = decideParts(it.w, it.h, it.fx, it.fy, v);
  const base = { page: it.page, heads_box: v && !v.unclear ? v.box : null, focal_from: from, rejected: false };
  if (d.by !== 'thumbnail' || d.review) return { ...base, parts: d.parts, note: d.note, focal: { x: d.fx, y: d.fy }, review: d.review, by: d.by };
  const says = (parts: Parts): boolean | null => {
    const c = checks.find((x) => x.parts === parts);
    return !c || c.unclear ? null : c.cuts;
  };
  if (says(d.parts) !== true) return { ...base, parts: d.parts, note: d.note, focal: { x: d.fx, y: d.fy }, review: false, by: 'thumbnail' };
  // the second look saw someone cut by the window the geometry chose
  if (d.parts === 2 && v?.box) {
    const at3 = placeWindow(it.w, it.h, 3, v.box, it.fx, it.fy);
    if (at3 && says(3) !== true) {
      return {
        ...base, parts: 3, focal: { x: at3.fx, y: at3.fy }, review: false, by: 'thumbnail', checked: true,
        note: `3 cards: on the thumbnail the 11:8.5 window cuts someone, the 16.5:8.5 window keeps all ${v.people} people${at3.moved ? ` once its focal point moves to ${at3.fx}/${at3.fy}` : ''}`,
      };
    }
  }
  return { ...base, parts: 3, focal: from, review: true, by: 'thumbnail', checked: true, note: `To review: on the thumbnail someone is cut even in 3 cards (${v?.people ?? 0} people in the photo)` };
}

export interface PartsCounts { photos: number; two: number; three: number; review: number; rejected: number; moved: number; byRatio: number; byCheck: number }

export function countsOf(entries: readonly PartsEntry[]): PartsCounts {
  const live = entries.filter((e) => !e.rejected);
  return {
    photos: entries.length,
    two: live.filter((e) => !e.review && e.parts === 2).length,
    three: live.filter((e) => !e.review && e.parts === 3).length,
    review: live.filter((e) => e.review).length,
    rejected: entries.length - live.length,
    moved: live.filter((e) => e.focal.x !== e.focal_from.x || e.focal.y !== e.focal_from.y).length,
    byRatio: live.filter((e) => e.by === 'ratio').length,
    byCheck: live.filter((e) => e.checked === true).length,
  };
}
