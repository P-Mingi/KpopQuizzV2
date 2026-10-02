import { fetchAllRows } from '@/lib/db/fetch-all';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { isMissingTable } from '@/lib/ux-v1/p8/features';

import { MIN_SONG_ANSWERS } from './templates';

import type { ComebackRow, WeeklyRecapData } from './templates';

// The reads behind the draft templates (server only, read only, service role
// because bt_runs is a closed table). Each one fails soft to "no fact": a missing
// table (pending SQL) or a read error drops that line, never invents one.
//   hardest song     bt_runs (v12-g1-bt-runs.sql), real runs only, the 7 days covered
//   most played quiz plays, the same 7 days
//   This or that     G7's data. Its module is not on this branch yet: [] until G7
//                    exposes a read (request G9-R6); the recap simply has no such line.
//   comebacks        comebacks (the owner's release calendar), the next 7 days

type Svc = ReturnType<typeof createServiceRoleClient>;

const DAY = 86_400_000;
const utcDay = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

/** The last 7 full UTC days before `now`: [from 00:00, to+1 00:00). */
export function recapWeek(now: number): { from: string; to: string; startIso: string; endIso: string } {
  const todayStart = Date.parse(`${utcDay(now)}T00:00:00Z`);
  return { from: utcDay(todayStart - 7 * DAY), to: utcDay(todayStart - DAY), startIso: new Date(todayStart - 7 * DAY).toISOString(), endIso: new Date(todayStart).toISOString() };
}

async function soft<T>(label: string, fallback: T, run: () => Promise<T>): Promise<T> {
  try { return await run(); } catch (err) {
    console.warn(`[editorial templates] ${label}:`, err instanceof Error ? err.message : err);
    return fallback;
  }
}

async function tableExists(svc: Svc, table: string, col: string): Promise<boolean> {
  const { error, status } = await svc.from(table).select(col).limit(1);
  if (!error) return true;
  if (isMissingTable(error, status)) return false;
  throw new Error(`${table}: ${error.message}`);
}

async function hardestSong(svc: Svc, startIso: string, endIso: string): Promise<WeeklyRecapData['hardestSong']> {
  if (!(await tableExists(svc, 'bt_runs', 'id'))) return null;
  const runs = await fetchAllRows<{ songs: unknown }>(() => svc.from('bt_runs').select('songs')
    .eq('is_test', false).gte('created_at', startIso).lt('created_at', endIso).order('created_at', { ascending: true }));
  const stat = new Map<string, { answers: number; correct: number }>();
  for (const r of runs) {
    for (const s of Array.isArray(r.songs) ? r.songs as Array<{ song_id?: unknown; correct?: unknown }> : []) {
      if (typeof s?.song_id !== 'string' || typeof s.correct !== 'boolean') continue;
      const cur = stat.get(s.song_id) ?? { answers: 0, correct: 0 };
      cur.answers++;
      if (s.correct) cur.correct++;
      stat.set(s.song_id, cur);
    }
  }
  // Lowest correct rate among the songs with enough answers; ties: the most answered.
  const ranked = [...stat.entries()].filter(([, v]) => v.answers >= MIN_SONG_ANSWERS)
    .sort((a, b) => a[1].correct / a[1].answers - b[1].correct / b[1].answers || b[1].answers - a[1].answers || a[0].localeCompare(b[0]));
  const top = ranked[0];
  if (!top) return null;
  const { data, error } = await svc.from('songs').select('title, artist_name').eq('id', top[0]).maybeSingle();
  if (error || !data) return null;
  const song = data as { title: string; artist_name: string | null };
  return { title: song.title, artist: song.artist_name, answers: top[1].answers, correct: top[1].correct };
}

async function topQuiz(svc: Svc, startIso: string, endIso: string): Promise<WeeklyRecapData['topQuiz']> {
  const plays = await fetchAllRows<{ quiz_id: string; score: number | null; total_questions: number | null }>(() => svc.from('plays')
    .select('quiz_id, score, total_questions').gte('created_at', startIso).lt('created_at', endIso).order('created_at', { ascending: true }));
  const stat = new Map<string, { plays: number; perfect: number }>();
  for (const p of plays) {
    const cur = stat.get(p.quiz_id) ?? { plays: 0, perfect: 0 };
    cur.plays++;
    if (p.total_questions && p.score === p.total_questions) cur.perfect++;
    stat.set(p.quiz_id, cur);
  }
  const ranked = [...stat.entries()].sort((a, b) => b[1].plays - a[1].plays || a[0].localeCompare(b[0])).slice(0, 10);
  if (!ranked.length) return null;
  const { data, error } = await svc.from('quizzes').select('id, title, slug').in('id', ranked.map(([id]) => id)).eq('status', 'published');
  if (error) throw new Error(`quizzes: ${error.message}`);
  const byId = new Map(((data ?? []) as { id: string; title: string; slug: string }[]).map((q) => [q.id, q] as const));
  // The most played quiz that is still published.
  for (const [id, s] of ranked) {
    const q = byId.get(id);
    if (q) return { title: q.title, slug: q.slug, plays: s.plays, perfect: s.perfect };
  }
  return null;
}

/** Everything the weekly recap template reads. */
export async function readWeeklyRecap(now: number, svc: Svc = createServiceRoleClient()): Promise<WeeklyRecapData> {
  const w = recapWeek(now);
  const [song, quiz] = await Promise.all([
    soft('hardest song', null, () => hardestSong(svc, w.startIso, w.endIso)),
    soft('top quiz', null, () => topQuiz(svc, w.startIso, w.endIso)),
  ]);
  return { from: w.from, to: w.to, hardestSong: song, topQuiz: quiz, splits: [] };
}

/** Active comebacks released from today to 7 days ahead (UTC days). */
export async function readUpcomingComebacks(now: number, svc: Svc = createServiceRoleClient()): Promise<ComebackRow[]> {
  return soft('comebacks', [], async () => {
    const { data, error } = await svc.from('comebacks').select('id, group_id, artist, title, release_date, kind')
      .eq('active', true).gte('release_date', utcDay(now)).lte('release_date', utcDay(now + 7 * DAY)).order('release_date', { ascending: true }).limit(20);
    if (error) throw new Error(error.message);
    return (data ?? []) as ComebackRow[];
  });
}
