// This or that splits of the last week, for G9's weekly recap (V12 G7, request
// G9-R6). Server only, read only.
//
// The last 7 full UTC days before `now` ([today-7d 00:00, today 00:00)), every
// vote of duel_votes in that window, grouped by question and pair (order free).
// Real votes only: a vote whose winner is not one of its two songs is dropped, and
// so is every vote of an editorial account (its voter hash, lib/duel/token.ts).
// Most voted first. Fails soft to []: flag off (no read at all), no key (the team
// cannot be left out, so nothing is shown), a missing table or any read error.

import { createServiceRoleClient } from '@/lib/supabase/server';
import { isMissingTable } from '@/lib/ux-v1/p8/features';
import { isUxV12 } from '@/lib/ux-v12';

import { pairKey } from './pairs';
import { duelKey, voterHash } from './token';

import type { SupabaseClient } from '@supabase/supabase-js';

export interface WeeklySplit { question: string; a: string; b: string; votesA: number; votesB: number }

const DAY = 86_400_000;
const PAGE = 1000;
/** 50k votes a week is far above today's traffic; past it the read stops (bounded). */
const MAX_PAGES = 50;
export const WEEKLY_SPLITS_MAX = 10;

/** [start, end) of the last 7 full UTC days before `now`. */
export function splitsWindow(now: number): { startIso: string; endIso: string } {
  const todayStart = Date.parse(`${new Date(now).toISOString().slice(0, 10)}T00:00:00Z`);
  return { startIso: new Date(todayStart - 7 * DAY).toISOString(), endIso: new Date(todayStart).toISOString() };
}

async function editorialHashes(db: SupabaseClient, key: Buffer): Promise<Set<string>> {
  const { data, error, status } = await db.from('editorial_accounts').select('user_id').limit(PAGE);
  if (error) {
    if (isMissingTable(error, status)) return new Set();
    throw new Error(`editorial_accounts: ${error.message}`);
  }
  return new Set(((data ?? []) as Array<{ user_id: string }>).map((r) => voterHash(key, `u:${r.user_id}`)));
}

interface Tally { q: string; x: string; y: string; vx: number; vy: number }

async function read(db: SupabaseClient, key: Buffer, now: number): Promise<WeeklySplit[]> {
  const team = await editorialHashes(db, key);
  const w = splitsWindow(now);
  const tallies = new Map<string, Tally>();
  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * PAGE;
    const { data, error } = await db.from('duel_votes').select('question_id, option_a_id, option_b_id, winner_id, voter_hash')
      .gte('created_at', w.startIso).lt('created_at', w.endIso)
      .order('created_at', { ascending: true }).order('id', { ascending: true }).range(from, from + PAGE - 1);
    if (error) throw new Error(`duel_votes: ${error.message}`);
    const rows = (data ?? []) as Array<{ question_id: string; option_a_id: string; option_b_id: string; winner_id: string; voter_hash: string | null }>;
    for (const r of rows) {
      if (r.voter_hash && team.has(r.voter_hash)) continue;
      const a = r.option_a_id.toLowerCase();
      const b = r.option_b_id.toLowerCase();
      const win = r.winner_id.toLowerCase();
      if (a === b || (win !== a && win !== b)) continue;
      const k = `${r.question_id}|${pairKey(a, b)}`;
      const [x = '', y = ''] = pairKey(a, b).split('|');
      const t = tallies.get(k) ?? { q: r.question_id, x, y, vx: 0, vy: 0 };
      if (win === x) t.vx++; else t.vy++;
      tallies.set(k, t);
    }
    if (rows.length < PAGE) break;
  }
  const top = [...tallies.values()]
    .sort((m, n) => n.vx + n.vy - (m.vx + m.vy) || m.q.localeCompare(n.q) || m.x.localeCompare(n.x) || m.y.localeCompare(n.y))
    .slice(0, WEEKLY_SPLITS_MAX);
  if (!top.length) return [];

  const qids = [...new Set(top.map((t) => t.q))];
  const eids = [...new Set(top.flatMap((t) => [t.x, t.y]))];
  const [qs, rs] = await Promise.all([
    db.from('duel_questions').select('id, prompt').in('id', qids),
    db.from('duel_ratings').select('question_id, entity_id, entity_name').in('question_id', qids).in('entity_id', eids).limit(PAGE),
  ]);
  if (qs.error) throw new Error(`duel_questions: ${qs.error.message}`);
  if (rs.error) throw new Error(`duel_ratings: ${rs.error.message}`);
  const prompt = new Map(((qs.data ?? []) as Array<{ id: string; prompt: string }>).map((q) => [q.id, q.prompt] as const));
  const name = new Map(((rs.data ?? []) as Array<{ question_id: string; entity_id: string; entity_name: string }>).map((r) => [`${r.question_id}|${r.entity_id.toLowerCase()}`, r.entity_name] as const));
  // A pair without its question text or a song name is left out, never guessed.
  const out: WeeklySplit[] = [];
  for (const t of top) {
    const question = prompt.get(t.q);
    const a = name.get(`${t.q}|${t.x}`);
    const b = name.get(`${t.q}|${t.y}`);
    if (question && a && b) out.push({ question, a, b, votesA: t.vx, votesB: t.vy });
  }
  return out;
}

/** The week's This or that splits, most voted first; [] when there is nothing real to show. */
export async function readWeeklySplits(now: number, db?: SupabaseClient): Promise<WeeklySplit[]> {
  if (!isUxV12()) return [];
  const key = duelKey();
  if (!key) return [];
  try {
    return await read(db ?? createServiceRoleClient(), key, now);
  } catch (err) {
    console.warn('[duel] weekly splits:', err instanceof Error ? err.message : err);
    return [];
  }
}
