import { fetchAllRows } from '@/lib/db/fetch-all';

import type { SupabaseClient } from '@supabase/supabase-js';

// Workstream T0: compute the Monthly K-pop Pulse payload from REAL first-party
// data (the `plays` events table, duel_votes, debates, profiles/quizzes counts)
// over a UTC month window. Thin sections return null and hide. Every number is
// traceable to a query here and dated by the window. No external scraping; the
// context corner is owner-curated pulse_citations.

export interface PulseFandom { name: string; slug: string; plays: number; sentence: string }
export interface PulseQuiz { title: string; slug: string; group: string; plays: number }
export interface PulseDuel { prompt: string; winner: string; votes: number; sentence: string }
export interface PulseDebate { prompt: string; date: string; totalVotes: number; splits: { side: string; count: number; pct: number }[] }
export interface PulseCommunity { plays: number; quizzesCreated: number; newFans: number }
export interface PulseCitation { source: string; claim: string; url: string; as_of_date: string }

export interface PulsePayload {
  month: string;         // 'YYYY-MM'
  monthLabel: string;    // 'July 2026'
  windowStart: string;   // ISO
  windowEnd: string;     // ISO (exclusive)
  generatedAt: string;   // ISO
  fandom: PulseFandom | null;
  mostPlayed: PulseQuiz[];
  duel: PulseDuel | null;
  debate: PulseDebate | null;
  community: PulseCommunity;
  recognition: null;     // GATED: hidden until >= 30 recognitions/song exist (see note)
  citations: PulseCitation[];
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DEBATE_MIN_VOTES = 20; // thin-metric gate: hide the debate section below this
// The cross-group catch-all bucket is not a real fandom, so it cannot "win"
// fandom of the month over the misc pile. Mirrors getFandomWarMap (community.ts).
const NON_FANDOM_SLUGS = new Set(['general-kpop']);

function monthWindow(month: string): { start: string; end: string; label: string } {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const start = new Date(Date.UTC(y, m - 1, 1)).toISOString();
  const end = new Date(Date.UTC(y, m, 1)).toISOString();
  return { start, end, label: `${MONTHS[m - 1]} ${y}` };
}

interface PlayRow { quiz_id: string; quizzes: { slug: string; title: string; group_id: number | null; groups: { name: string; slug: string } | null } | null }

export async function computePulse(db: SupabaseClient, month: string, nowIso: string): Promise<PulsePayload> {
  const { start, end, label } = monthWindow(month);

  // Pull the month's plays with the quiz + group embedded, and aggregate in JS.
  // Paginated: a busy month exceeds the 1000-row PostgREST cap, which would
  // silently truncate the fandom winner + top quizzes (V-REPAIR sweep B).
  const plays = await fetchAllRows<PlayRow>(() => db
    .from('plays')
    .select('quiz_id, quizzes!inner(slug, title, group_id, groups(name, slug))')
    .gte('created_at', start)
    .lt('created_at', end));

  // 1. Fandom of the month (most-played real fandom; the catch-all bucket cannot win).
  const byGroup = new Map<string, { name: string; slug: string; plays: number }>();
  for (const p of plays) {
    const g = p.quizzes?.groups;
    if (!g || NON_FANDOM_SLUGS.has(g.slug)) continue;
    const cur = byGroup.get(g.slug) ?? { name: g.name, slug: g.slug, plays: 0 };
    cur.plays += 1;
    byGroup.set(g.slug, cur);
  }
  const topGroup = [...byGroup.values()].sort((a, b) => b.plays - a.plays || a.slug.localeCompare(b.slug))[0];
  const fandom: PulseFandom | null = topGroup
    ? { ...topGroup, sentence: `${topGroup.name} was ${label}'s most-played fandom on kpopquiz.org, with ${topGroup.plays.toLocaleString('en-US')} quiz plays.` }
    : null;

  // 2. Most-played quizzes of the month (top 5).
  const byQuiz = new Map<string, PulseQuiz>();
  for (const p of plays) {
    if (!p.quizzes) continue;
    const cur = byQuiz.get(p.quiz_id) ?? { title: p.quizzes.title, slug: p.quizzes.slug, group: p.quizzes.groups?.name ?? 'K-pop', plays: 0 };
    cur.plays += 1;
    byQuiz.set(p.quiz_id, cur);
  }
  const mostPlayed = [...byQuiz.values()].sort((a, b) => b.plays - a.plays || a.slug.localeCompare(b.slug)).slice(0, 5);

  // 3. Duel verdict of the month (top matchup by votes; winner = most-won entity).
  const votes = await fetchAllRows<{ question_id: string; winner_id: string }>(() => db
    .from('duel_votes')
    .select('question_id, winner_id')
    .gte('created_at', start)
    .lt('created_at', end));
  const duelByQ = new Map<string, { total: number; wins: Map<string, number> }>();
  for (const v of votes) {
    const q = duelByQ.get(v.question_id) ?? { total: 0, wins: new Map() };
    q.total += 1;
    q.wins.set(v.winner_id, (q.wins.get(v.winner_id) ?? 0) + 1);
    duelByQ.set(v.question_id, q);
  }
  const topDuelEntry = [...duelByQ.entries()].sort((a, b) => b[1].total - a[1].total || a[0].localeCompare(b[0]))[0];
  let duel: PulseDuel | null = null;
  if (topDuelEntry) {
    const [qid, agg] = topDuelEntry;
    const topWinnerId = [...agg.wins.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0];
    const [{ data: q }, { data: rating }] = await Promise.all([
      db.from('duel_questions').select('prompt').eq('id', qid).maybeSingle(),
      topWinnerId ? db.from('duel_ratings').select('entity_name').eq('question_id', qid).eq('entity_id', topWinnerId).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    const prompt = (q?.prompt as string) ?? 'Fan matchup';
    const winner = (rating?.entity_name as string) ?? 'the fan pick';
    duel = { prompt, winner, votes: agg.total, sentence: `Fans cast ${agg.total.toLocaleString('en-US')} votes on "${prompt}" in ${label}, and ${winner} came out on top.` };
  }

  // 4. Debate verdict (GATED: hide unless the top debate cleared DEBATE_MIN_VOTES).
  const { data: debates } = await db
    .from('daily_debates')
    .select('date, question_id')
    .gte('date', start.slice(0, 10))
    .lt('date', end.slice(0, 10));
  let debate: PulseDebate | null = null;
  if (debates && debates.length > 0) {
    const dates = (debates as { date: string; question_id: string }[]).map((d) => d.date);
    const { data: dvotes } = await db.from('debate_votes').select('date, side').in('date', dates);
    const byDate = new Map<string, Map<string, number>>();
    for (const v of (dvotes ?? []) as { date: string; side: string }[]) {
      const m = byDate.get(v.date) ?? new Map<string, number>();
      m.set(v.side, (m.get(v.side) ?? 0) + 1);
      byDate.set(v.date, m);
    }
    const ranked = [...byDate.entries()].map(([date, sides]) => ({ date, total: [...sides.values()].reduce((a, b) => a + b, 0), sides })).sort((a, b) => b.total - a.total || a.date.localeCompare(b.date));
    const top = ranked[0];
    if (top && top.total >= DEBATE_MIN_VOTES) {
      const dq = (debates as { date: string; question_id: string }[]).find((d) => d.date === top.date);
      const { data: q } = dq ? await db.from('duel_questions').select('prompt').eq('id', dq.question_id).maybeSingle() : { data: null };
      const splits = [...top.sides.entries()].map(([side, count]) => ({ side, count, pct: Math.round((count / top.total) * 100) })).sort((a, b) => b.count - a.count || a.side.localeCompare(b.side));
      debate = { prompt: (q?.prompt as string) ?? 'Daily debate', date: top.date, totalVotes: top.total, splits };
    }
  }

  // 5. Community growth (honest absolute numbers).
  const [playsCount, quizzesCount, fansCount] = await Promise.all([
    db.from('plays').select('id', { count: 'exact', head: true }).gte('created_at', start).lt('created_at', end).then((r) => r.count ?? 0),
    db.from('quizzes').select('id', { count: 'exact', head: true }).gte('created_at', start).lt('created_at', end).then((r) => r.count ?? 0),
    db.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', start).lt('created_at', end).then((r) => r.count ?? 0),
  ]);
  const community: PulseCommunity = { plays: playsCount, quizzesCreated: quizzesCount, newFans: fansCount };

  // 7. Context corner (owner-curated citations; only active ones).
  const { data: citeRows } = await db
    .from('pulse_citations')
    .select('source, claim, url, as_of_date')
    .eq('active', true)
    .order('ord');
  const citations = (citeRows ?? []) as PulseCitation[];

  return {
    month,
    monthLabel: label,
    windowStart: start,
    windowEnd: end,
    generatedAt: nowIso,
    fandom,
    mostPlayed,
    duel,
    debate,
    community,
    // 6. Blind-test recognition: the blind test does not persist per-song answer
    // times in a queryable table yet (plays.per_question_times is quiz-question
    // times, not song recognition), so this section stays hidden. It unhides
    // once a per-song source with >= 30 recognitions/song exists.
    recognition: null,
    citations,
  };
}
