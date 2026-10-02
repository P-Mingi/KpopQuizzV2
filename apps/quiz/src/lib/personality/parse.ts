// V12 G5: reading the personality tables as they are (migration 118, seeded by
// scripts/seed-personality.mjs). Pure validators: a row that does not have the
// expected shape is dropped, never repaired.

import { AXIS_KEYS } from './engine';

import type { Axes, AxisQuestion, Weights } from './engine';

/** SYSTEM.md 5.2: eight questions. The table holds ten active ones; the first eight by `ord` are asked. */
export const WMA_QUESTION_COUNT = 8;

export interface WmaProfile {
  /** personality_profiles.member_slug: the result id. */
  id: string;
  /** personality_profiles.member_name: also the key of the saved results. */
  name: string;
  axes: Axes;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function parseWeights(v: unknown): Weights | null {
  if (!isRecord(v)) return null;
  const out: Weights = {};
  for (const k of AXIS_KEYS) {
    const n = v[k];
    if (typeof n === 'number' && Number.isFinite(n)) out[k] = n;
  }
  return out;
}

/** Active questions in `ord` order, cut to the first `count`. Fewer valid rows than `count` = no quiz. */
export function parseQuestions(rows: unknown, count: number = WMA_QUESTION_COUNT): AxisQuestion[] {
  if (!Array.isArray(rows)) return [];
  const list: Array<{ ord: number; q: AxisQuestion }> = [];
  for (const r of rows) {
    if (!isRecord(r) || typeof r.question !== 'string' || !r.question.trim() || typeof r.ord !== 'number') continue;
    if (!Array.isArray(r.options) || r.options.length < 2) continue;
    const options: AxisQuestion['options'] = [];
    for (const o of r.options) {
      if (!isRecord(o) || typeof o.text !== 'string' || !o.text.trim()) continue;
      const weights = parseWeights(o.weights);
      if (!weights) continue;
      options.push({ text: o.text.trim(), weights });
    }
    if (options.length !== r.options.length) continue;
    list.push({ ord: r.ord, q: { text: r.question.trim(), options } });
  }
  list.sort((a, b) => a.ord - b.ord);
  if (list.length < count) return [];
  return list.slice(0, count).map((x) => x.q);
}

/** Active profiles of one group, in their stored order. A profile needs all six axes. */
export function parseProfiles(rows: unknown): WmaProfile[] {
  if (!Array.isArray(rows)) return [];
  const out: WmaProfile[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    if (!isRecord(r) || typeof r.member_name !== 'string' || typeof r.member_slug !== 'string') continue;
    const name = r.member_name.trim();
    const id = r.member_slug.trim();
    if (!name || !id || seen.has(id) || !isRecord(r.axes)) continue;
    const axes = {} as Axes;
    let ok = true;
    for (const k of AXIS_KEYS) {
      const n = r.axes[k];
      if (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > 100) { ok = false; break; }
      axes[k] = n;
    }
    if (!ok) continue;
    seen.add(id);
    out.push({ id, name, axes });
  }
  return out;
}

/** Rows of get_personality_counts(): member_name -> count. */
export function parseCounts(rows: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!Array.isArray(rows)) return out;
  for (const r of rows) {
    if (!isRecord(r) || typeof r.member_name !== 'string') continue;
    const n = Number(r.cnt);
    if (Number.isFinite(n) && n > 0) out[r.member_name] = Math.floor(n);
  }
  return out;
}

/** A group slug as it appears in a URL. */
export function isGroupSlug(v: unknown): v is string {
  return typeof v === 'string' && /^[a-z0-9][a-z0-9-]{0,59}$/.test(v);
}
