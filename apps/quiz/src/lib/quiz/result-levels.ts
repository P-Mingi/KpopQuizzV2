// SEO Mission 2, part B point 8: a quiz whose result is a level ("BTS ARMY level test").
// The levels live in the quiz's own settings (quizzes.settings.result_levels, written only by
// the owner-run SQL of docs/pending-migrations/seo-m2-bts-army-level-test.sql), so no column
// and no migration of the schema is needed, and every other quiz is untouched.
//
// Fail soft: settings without a valid `result_levels` array give null, and the results screen
// renders exactly as before. For a quiz WITH levels, the "You beat N% of players" line shows
// only from 200 finished attempts (rulebook 4.3, the percentile floor); below it the level is
// the result. Quizzes without levels keep today's percentile line unchanged.
// Pure and unit tested (result-levels.test.ts).

/** Rulebook 4.3: a percentile needs 200 attempts. */
export const PERCENTILE_MIN_ATTEMPTS = 200;

export interface ResultLevel {
  /** Lowest score, in percent of the maximum, that reaches this level (0 to 100). */
  min: number;
  name: string;
  blurb: string;
}

const MAX_LEVELS = 8;
const NAME_MAX = 40;
const BLURB_MAX = 160;

const text = (v: unknown, max: number): string | null => {
  if (typeof v !== 'string') return null;
  const t = v.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  return t.length > 0 && t.length <= max ? t : null;
};

/**
 * The levels of a quiz, lowest first, or null when the settings carry none or carry an invalid
 * list (2 to 8 levels, distinct whole-number thresholds from 0 to 100, one of them 0, a name
 * and a blurb each). Never throws.
 */
export function parseResultLevels(settings: unknown): ResultLevel[] | null {
  if (!settings || typeof settings !== 'object') return null;
  const raw = (settings as { result_levels?: unknown }).result_levels;
  if (!Array.isArray(raw) || raw.length < 2 || raw.length > MAX_LEVELS) return null;
  const out: ResultLevel[] = [];
  for (const r of raw) {
    if (!r || typeof r !== 'object') return null;
    const { min, name, blurb } = r as { min?: unknown; name?: unknown; blurb?: unknown };
    if (typeof min !== 'number' || !Number.isInteger(min) || min < 0 || min > 100) return null;
    const n = text(name, NAME_MAX);
    const b = text(blurb, BLURB_MAX);
    if (!n || !b) return null;
    out.push({ min, name: n, blurb: b });
  }
  out.sort((a, b) => a.min - b.min);
  if (out[0]!.min !== 0) return null;
  for (let i = 1; i < out.length; i++) if (out[i]!.min === out[i - 1]!.min) return null;
  return out;
}

/** The level reached with `pct` percent (the highest level whose threshold it meets). */
export function levelFor(pct: number, levels: readonly ResultLevel[]): ResultLevel {
  const p = Number.isFinite(pct) ? Math.min(100, Math.max(0, pct)) : 0;
  let hit = levels[0]!;
  for (const l of levels) if (p >= l.min) hit = l;
  return hit;
}

/**
 * The percentile the results may show. A quiz without levels: unchanged. A quiz with levels:
 * only from PERCENTILE_MIN_ATTEMPTS finished attempts, else null (no line).
 */
export function percentileShown(percentile: number | null, quiz: { resultLevels?: readonly ResultLevel[] | null; attempts?: number | null }): number | null {
  if (!quiz.resultLevels) return percentile;
  return (quiz.attempts ?? 0) >= PERCENTILE_MIN_ATTEMPTS ? percentile : null;
}
