// Run O1, lot H2b: Today, the debate of the day. The debate tables have no site_id: they are the K-pop debate. The read is the one of
// the K-pop home (lib/ux-v1/p1/home-data.ts): never ensure_daily_debate, which writes. It is today's UTC date, or yesterday's during the
// ten minutes before the debate cron (00:10 UTC) has made today's. No debate in that window: null, and the card disappears.

import { createPublicReadClient } from '@/lib/supabase/server';

import { hubCached } from './cache';
import { DAY_MS, resolveOrigins, siteName, utcDate } from './util';

import type { HubDebate, HubOpts, HubOrigins } from './types';

const PATH = '/community';

type Db = ReturnType<typeof createPublicReadClient>;

export async function readDebate(origins: HubOrigins, now: Date, db: Db): Promise<HubDebate | null> {
  const today = utcDate(now);
  const yesterday = utcDate(new Date(now.getTime() - DAY_MS));
  const dd = await db.from('daily_debates').select('date, question_id').lte('date', today).gte('date', yesterday)
    .order('date', { ascending: false }).limit(1).maybeSingle();
  if (dd.error) throw new Error(`daily_debates: ${dd.error.message}`);
  const day = dd.data as { date: string; question_id: string } | null;
  if (!day) return null;
  const [q, votes] = await Promise.all([
    db.from('debate_questions').select('question, side_a, side_b').eq('id', day.question_id).maybeSingle(),
    db.from('debate_votes').select('id', { count: 'exact', head: true }).eq('date', day.date),
  ]);
  if (q.error) throw new Error(`debate_questions: ${q.error.message}`);
  if (votes.error) throw new Error(`debate_votes: ${votes.error.message}`);
  const row = q.data as { question: string; side_a: string; side_b: string } | null;
  if (!row || !row.question.trim()) return null;
  return {
    site: 'kpop',
    siteName: siteName('kpop'),
    date: day.date,
    question: row.question.trim(),
    sideA: row.side_a,
    sideB: row.side_b,
    votes: votes.count ?? 0,
    path: PATH,
    href: `${origins.kpop}${PATH}`,
  };
}

const cached = hubCached('debate', (origins: HubOrigins) => readDebate(origins, new Date(), createPublicReadClient()));

/** The debate of the day or null (the card disappears), cached one hour (tag hub:debate). */
export async function getDebate(opts?: HubOpts): Promise<HubDebate | null> {
  return cached(resolveOrigins(opts));
}
