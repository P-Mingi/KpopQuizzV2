// Draft templates fed by real data (SYSTEM.md 5.6). Pure and unit tested: the
// readers live in ./template-data.ts, this module only turns their rows into a
// draft. Rules:
//   - every factual line comes from a row and is listed in `sources`,
//   - a fact that does not exist is left out; a template with no fact returns null
//     (no draft is ever padded or invented),
//   - a template draft is a DRAFT: an admin reads, edits and approves it like any other.

import type { DraftInput, DraftSource, EditorialAccount } from './types';

export interface TemplateDraft { templateKey: string; input: DraftInput }

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** "Sep 28" / "Sep 28, 2026" from a YYYY-MM-DD day (UTC, no Date parsing surprises). */
export function dayLabel(day: string, withYear = false): string {
  const m = DAY_RE.exec(day);
  if (!m) return day;
  const s = `${MONTHS[Number(m[2]) - 1] ?? ''} ${Number(m[3])}`;
  return withYear ? `${s}, ${m[1]}` : s;
}

const n = (v: number): string => Math.round(v).toLocaleString('en-US');

/** The account for a template: the first active one whose beat matches the hint,
 *  else the active accounts in turn (seed). Null when no account is active. */
export function pickAccount(accounts: EditorialAccount[], hint: RegExp | null, seed: number): EditorialAccount | null {
  const active = accounts.filter((a) => a.active);
  if (!active.length) return null;
  const match = hint ? active.find((a) => hint.test(a.beat)) : undefined;
  return match ?? active[Math.abs(Math.trunc(seed)) % active.length] ?? null;
}

/* ------------------------------------------------------------ weekly recap --- */

/** Fewer answers than this on a song say nothing about how hard it is. */
export const MIN_SONG_ANSWERS = 20;

export interface WeeklyRecapData {
  /** First and last UTC day of the week covered (inclusive), YYYY-MM-DD. */
  from: string;
  to: string;
  hardestSong: { title: string; artist: string | null; answers: number; correct: number } | null;
  topQuiz: { title: string; slug: string; plays: number; perfect: number } | null;
  /** This or that splits (G7). Empty until its data exists. */
  splits: { question: string; a: string; b: string; votesA: number; votesB: number }[];
}

export function buildWeeklyRecap(data: WeeklyRecapData, accounts: EditorialAccount[]): TemplateDraft | null {
  const lines: string[] = [];
  const sources: DraftSource[] = [];
  const range = `${dayLabel(data.from)} to ${dayLabel(data.to, true)}`;
  let headline: string | null = null;

  const song = data.hardestSong && data.hardestSong.answers >= MIN_SONG_ANSWERS ? data.hardestSong : null;
  if (song) {
    const pct = Math.round((song.correct / song.answers) * 100);
    const by = song.artist ? ` by ${song.artist}` : '';
    lines.push(`The hardest song in the blindtest this week was ${song.title}${by}. Fans named it ${pct}% of the time (${n(song.correct)} of ${n(song.answers)} answers).`);
    sources.push({ label: `KpopQuiz blindtest runs, ${range}: ${n(song.answers)} answers on ${song.title}`, url: null });
    headline = `the hardest song was ${song.title}`;
  }
  const quiz = data.topQuiz && data.topQuiz.plays > 0 ? data.topQuiz : null;
  if (quiz) {
    const perfect = quiz.perfect > 0 ? ` and ${n(quiz.perfect)} perfect ${quiz.perfect === 1 ? 'score' : 'scores'}` : '';
    lines.push(`The most played quiz was ${quiz.title}: ${n(quiz.plays)} ${quiz.plays === 1 ? 'play' : 'plays'}${perfect}.`);
    sources.push({ label: `KpopQuiz plays, ${range}: ${quiz.title}`, url: `https://kpopquiz.org/q/${quiz.slug}` });
    headline ??= `the most played quiz was ${quiz.title}`;
  }
  for (const s of data.splits.slice(0, 2)) {
    const total = s.votesA + s.votesB;
    if (total <= 0) continue;
    const pa = Math.round((s.votesA / total) * 100);
    lines.push(`This or that, ${s.question}: ${s.a} ${pa}%, ${s.b} ${100 - pa}% (${n(total)} votes).`);
    sources.push({ label: `KpopQuiz This or that votes, ${range}: ${s.question}`, url: null });
    headline ??= `${s.a} or ${s.b}`;
  }
  if (!lines.length || !headline) return null;

  const account = pickAccount(accounts, /chart|data|number|stat/i, 0);
  if (!account) return null;
  const title = `Weekly recap: ${headline}`.slice(0, 160);
  lines.push('Which one surprised you? Tell us in one line.');
  return {
    templateKey: `weekly_recap:${data.to}`,
    input: { account_id: account.user_id, kind: 'thread', group_id: null, title, body: lines.join('\n\n'), options: null, sources, debate_days: null },
  };
}

/* --------------------------------------------------------- comeback topics --- */

export interface ComebackRow { id: number; group_id: number | null; artist: string; title: string; release_date: string; kind: string }

const KIND_LABEL: Record<string, string> = { single: 'single', ep: 'EP', album: 'album', mv: 'music video' };

export function buildComebackTopic(c: ComebackRow, accounts: EditorialAccount[]): TemplateDraft | null {
  const artist = c.artist.trim();
  const name = c.title.trim();
  if (!artist || !name || !DAY_RE.test(c.release_date)) return null;
  const title = `${artist} comes back with ${name}: what do you expect?`;
  if (title.length > 160) return null;
  // Everything but the data account takes the comeback topics in turn.
  const pool = accounts.filter((a) => a.active && !/chart|data|number|stat/i.test(a.beat));
  const account = pickAccount(pool.length ? pool : accounts, null, c.id);
  if (!account) return null;
  const kind = KIND_LABEL[c.kind] ?? 'release';
  const date = dayLabel(c.release_date, true);
  return {
    templateKey: `comeback:${c.id}`,
    input: {
      account_id: account.user_id, kind: 'thread', group_id: c.group_id, title,
      body: [`${artist} releases ${name} (${kind}) on ${date}.`, 'What do you want from this comeback? One line.'].join('\n\n'),
      options: null,
      sources: [{ label: `KpopQuiz release calendar: ${artist}, ${name}, ${date}`, url: null }],
      debate_days: null,
    },
  };
}
