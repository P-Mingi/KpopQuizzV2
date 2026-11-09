// Schedule rules of the anime daily quiz bank (owner brief, 2026-11-09), reusable for the next lot.
//   node --test scripts/anime/daily/schedule-rules.test.mjs
// A candidate is { key, series, type, difficulty }. `anime-mix` counts as one series. `context` is the
// list of days already filed just before the lot, { date, series, type, difficulty }.

export const RULES = Object.freeze({
  seriesGapDays: 5, // the same series never twice within 4 days: two days of one series are at least 5 apart
  guessWindowDays: 5, // at most one guess_from_clues in any 5 consecutive days
  target: { easy: 0.4, medium: 0.45, hard: 0.15 },
});

const DAY = 86400000;
export const addDays = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
const diff = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY);

/** Violations of an ordered list of days ({date, series, type, difficulty}); empty means the schedule is valid. */
export function checkSchedule(days, rules = RULES) {
  const out = [];
  const s = [...days].sort((a, b) => a.date.localeCompare(b.date));
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && s[i].date === s[i - 1].date) out.push(`${s[i].date}: two quizzes on one day`);
    for (let j = i - 1; j >= 0 && diff(s[j].date, s[i].date) < rules.seriesGapDays; j--) {
      if (s[j].series === s[i].series) out.push(`${s[i].date}: series ${s[i].series} again after ${s[j].date}`);
    }
    if (i > 0 && diff(s[i - 1].date, s[i].date) === 1) {
      if (s[i].type === 'true_false' && s[i - 1].type === 'true_false') out.push(`${s[i].date}: two true or false days in a row`);
      if (s[i].difficulty === 'hard' && s[i - 1].difficulty === 'hard') out.push(`${s[i].date}: two hard days in a row`);
    }
    if (s[i].type === 'guess_from_clues') {
      for (let j = i - 1; j >= 0 && diff(s[j].date, s[i].date) < rules.guessWindowDays; j--) {
        if (s[j].type === 'guess_from_clues') out.push(`${s[i].date}: second guess_from_clues within ${rules.guessWindowDays} days (${s[j].date})`);
      }
    }
  }
  return out;
}

/** Share of each difficulty over the days, e.g. { easy: 0.37, medium: 0.48, hard: 0.15 }. */
export function difficultyMix(days) {
  const n = days.length || 1;
  const c = { easy: 0, medium: 0, hard: 0 };
  for (const d of days) c[d.difficulty] += 1;
  return { easy: c.easy / n, medium: c.medium / n, hard: c.hard / n };
}

/**
 * Deterministic backtracking pick: one candidate per day from `start`, rules respected, difficulty kept near the
 * target mix. Returns [{date, ...candidate}] or throws when no valid order exists.
 */
export function pickSchedule(candidates, start, context = [], rules = RULES) {
  const cs = [...candidates].sort((a, b) => a.key.localeCompare(b.key, 'en', { numeric: true }));
  const n = cs.length;
  const placed = [];
  const used = new Set();
  const want = (d, i) => rules.target[d] * (i + 1);
  const ok = (cand, date) => checkSchedule([...context, ...placed, { ...cand, date }], rules).length === 0;
  const counts = { easy: 0, medium: 0, hard: 0 };
  let steps = 0;
  function go(i) {
    if (i === n) return true;
    if (++steps > 2_000_000) throw new Error('schedule search exhausted');
    const date = addDays(start, i);
    const order = cs.filter((c) => !used.has(c.key)).sort((a, b) => (counts[a.difficulty] - want(a.difficulty, i)) - (counts[b.difficulty] - want(b.difficulty, i)));
    for (const c of order) {
      if (!ok(c, date)) continue;
      used.add(c.key); placed.push({ ...c, date }); counts[c.difficulty] += 1;
      if (go(i + 1)) return true;
      used.delete(c.key); placed.pop(); counts[c.difficulty] -= 1;
    }
    return false;
  }
  if (!go(0)) throw new Error('no valid schedule');
  return placed;
}
