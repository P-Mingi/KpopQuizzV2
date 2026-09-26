import { unstable_cache } from 'next/cache';

import { getFandomWarMap } from '@/lib/db/queries/community';
import { fetchAllRows } from '@/lib/db/fetch-all';
import { createPublicReadClient } from '@/lib/supabase/server';

import { dayAgo, timeAgo } from './format';
import { getP8Groups, readDailyDebates } from './feed';
import { readPeople } from './people';

import type { BadgeWatchRow, HappeningRow, P8Features, Pulse, TodayDebate, WarEntry } from './types';

// The community rail (DESIGN-SPEC 16.7: Daily debate, Happening now with the pulse
// line, Badge watch; phones: the fandom war strip + the debate on top, Happening now
// + Badge watch after the 3rd post). Every read is public and write-free: the daily
// debate is READ (never ensure_daily_debate, which writes), Happening now is the same
// activity_events feed as components/community/happening-now.tsx, Badge watch the
// same user_badges read as components/community/badge-showcase.tsx.

function must<T extends { error: { message: string } | null }>(r: T, what: string): T {
  if (r.error) throw new Error(`p8 rail ${what}: ${r.error.message}`);
  return r;
}

/* ----------------------------------------------------------- daily debate --- */

async function readTodayDebate(today: string): Promise<TodayDebate | null> {
  const db = createPublicReadClient();
  const [d] = await readDailyDebates(db, today, 1);
  if (!d || d.date !== today) return null; // no debate today: the panel hides (no dead vote)
  return { date: d.date, question: d.question, sides: [d.sideA, d.sideB], votes: [d.votesA, d.votesB] };
}

/** Today's debate (UTC day, the DB's current_date), cached 2 min; the island refreshes
 *  the split after a vote from the vote response. */
export const getTodayDebate = unstable_cache(readTodayDebate, ['ux-v1:p8:today-debate:v1'], { revalidate: 120, tags: ['community'] });

/* ---------------------------------------------------------- happening now --- */

interface EventRow { id: number; event_type: string; user_id: string | null; display_name: string; group_slug: string | null; payload: Record<string, unknown> | null; created_at: string }

/** The phrase of an activity event, with its bold parts (prototype: "scored **10/10**
 *  on **...**"). Same event mapping as lib/db/queries/community.ts getHappeningNow;
 *  unknown types return null (skipped, never invented). */
export function eventPhrase(r: Pick<EventRow, 'event_type' | 'group_slug' | 'payload'>, groupName: (slug: string | null) => string): { parts: HappeningRow['parts']; href: string | null } | null {
  const p = r.payload ?? {};
  const num = (k: string): number | null => (typeof p[k] === 'number' ? (p[k] as number) : null);
  const str = (k: string): string | null => (typeof p[k] === 'string' && (p[k] as string).trim() ? (p[k] as string).trim() : null);
  const g = groupName(r.group_slug);
  const hub = r.group_slug ? `/${r.group_slug}-quiz` : null;
  const score = num('score');
  const total = num('total');
  switch (r.event_type) {
    case 'quiz_created': {
      const title = str('title');
      const slug = str('slug');
      return { parts: title ? [{ t: 'published' }, { t: title, b: true }] : [{ t: 'made a new' }, { t: `${g} quiz`, b: true }], href: slug ? `/q/${slug}` : hub };
    }
    case 'group_mastered':
      return { parts: [{ t: 'mastered' }, { t: g, b: true }], href: hub };
    case 'perfect_score':
      return { parts: total !== null ? [{ t: 'scored a perfect' }, { t: `${total}/${total}`, b: true }, { t: 'on a' }, { t: `${g} quiz`, b: true }] : [{ t: 'aced a' }, { t: `${g} quiz`, b: true }], href: hub };
    case 'quiz_completed':
      return { parts: score !== null && total !== null ? [{ t: 'scored' }, { t: `${score}/${total}`, b: true }, { t: 'on a' }, { t: `${g} quiz`, b: true }] : [{ t: 'played a' }, { t: `${g} quiz`, b: true }], href: hub };
    case 'blindtest_played':
      return { parts: score !== null && total !== null ? [{ t: 'got' }, { t: `${score}/${total}`, b: true }, { t: 'on the blindtest' }] : [{ t: 'played the blindtest' }], href: '/blindtest' };
    case 'streak_milestone': {
      const s = num('streak');
      return { parts: s !== null ? [{ t: 'hit a' }, { t: `${s}-day streak`, b: true }] : [{ t: 'kept a streak going' }], href: null };
    }
    case 'debate_voted':
      return { parts: [{ t: 'voted in the' }, { t: 'daily debate', b: true }], href: '/community' };
    case 'duel_voted':
      return { parts: [{ t: 'voted in a duel' }], href: hub };
    case 'battle_won':
      return { parts: [{ t: 'won a battle' }], href: hub };
    default:
      return null;
  }
}

/** Collapse one fan's spree: never the same person doing the same thing twice, at
 *  most 2 rows per person (the rule of getHappeningNow: nothing invented, only
 *  collapsed). Pure, for the tests. */
export function collapseSpree<T extends { user_id: string | null; display_name: string; event_type: string }>(rows: T[], limit: number, keep: (r: T) => boolean): T[] {
  const out: T[] = [];
  const perPerson = new Map<string, number>();
  const seen = new Set<string>();
  for (const r of rows) {
    if (out.length >= limit) break;
    const who = r.user_id ?? r.display_name;
    const used = perPerson.get(who) ?? 0;
    if (used >= 2) continue;
    const key = `${who}:${r.event_type}`;
    if (seen.has(key)) continue;
    if (!keep(r)) continue;
    perPerson.set(who, used + 1);
    seen.add(key);
    out.push(r);
  }
  return out;
}

async function readHappening(limit: number): Promise<{ rows: Omit<HappeningRow, 'ago'>[]; at: string[] }> {
  const db = createPublicReadClient();
  const [{ data: evs }, groups] = await Promise.all([
    db.from('activity_events').select('id, event_type, user_id, display_name, group_slug, payload, created_at')
      .order('created_at', { ascending: false }).limit(400).then((r) => must(r, 'activity_events')),
    getP8Groups(),
  ]);
  const nameBySlug = new Map(groups.map((g) => [g.slug, g.name] as const));
  const groupName = (slug: string | null): string => (slug ? nameBySlug.get(slug) ?? 'K-pop' : 'K-pop');
  const picked = collapseSpree((evs ?? []) as EventRow[], limit, (r) => eventPhrase(r, groupName) !== null);
  const [people, cheersRes] = await Promise.all([
    readPeople(db, picked.map((r) => r.user_id)),
    picked.length ? db.from('activity_cheers').select('event_id').in('event_id', picked.map((r) => r.id)).then((r) => must(r, 'activity_cheers')) : Promise.resolve({ data: [] as { event_id: number }[] }),
  ]);
  const cheers = new Map<number, number>();
  for (const c of (cheersRes.data ?? []) as { event_id: number }[]) cheers.set(c.event_id, (cheers.get(c.event_id) ?? 0) + 1);
  const rows = picked.map((r) => {
    const ph = eventPhrase(r, groupName)!;
    const person = r.user_id ? people.get(r.user_id) ?? null : null;
    const anon = (r.display_name || 'someone').trim();
    return { id: r.id, person, name: person ? person.name : anon.charAt(0).toUpperCase() + anon.slice(1), parts: ph.parts, href: ph.href, cheers: cheers.get(r.id) ?? 0 };
  });
  return { rows, at: picked.map((r) => r.created_at) };
}

const cachedHappening = unstable_cache(readHappening, ['ux-v1:p8:happening:v1'], { revalidate: 60, tags: ['community'] });

/** Happening now: the latest real activity (5 rows), with server-time ages. */
export async function getHappening(limit = 5, now: number = Date.now()): Promise<HappeningRow[]> {
  const { rows, at } = await cachedHappening(limit);
  return rows.map((r, i) => ({ ...r, ago: timeAgo(at[i], now) }));
}

/* ------------------------------------------------------------------ pulse --- */

async function readPulse(today: string, f: P8Features): Promise<Pulse> {
  const db = createPublicReadClient();
  const weekAgo = new Date(Date.parse(`${today}T00:00:00Z`) - 6 * 24 * 3600_000).toISOString();
  const count = async (q: PromiseLike<{ count: number | null; error: { message: string } | null }>, what: string): Promise<number> => {
    const r = await q;
    if (r.error) throw new Error(`p8 pulse ${what}: ${r.error.message}`);
    return r.count ?? 0;
  };
  // Exact counts through GET limit(1) + count (never HEAD: a HEAD on a missing
  // table answers 204 without an error).
  const [threads, blogs, debates, votes, quizzes, fanDebates, challenges] = await Promise.all([
    count(db.from('verse_threads').select('id', { count: 'exact' }).eq('status', 'visible').limit(1), 'threads'),
    count(db.from('verse_essays').select('id', { count: 'exact' }).eq('status', 'featured').limit(1), 'essays'),
    count(db.from('daily_debates').select('date', { count: 'exact' }).lte('date', today).limit(1), 'debates'),
    count(db.from('debate_votes').select('id', { count: 'exact' }).eq('date', today).limit(1), 'votes today'),
    count(db.from('quizzes').select('id', { count: 'exact' }).eq('status', 'published').gte('created_at', weekAgo).limit(1), 'new quizzes'),
    f.fanDebates ? count(db.from('community_debates').select('id', { count: 'exact' }).eq('status', 'visible').limit(1), 'fan debates') : Promise.resolve(0),
    f.challenges ? count(db.from('community_challenges').select('id', { count: 'exact' }).eq('status', 'visible').limit(1), 'challenges') : Promise.resolve(0),
  ]);
  return { posts: threads + blogs + debates + fanDebates + challenges, votesToday: votes, newQuizzesWeek: quizzes };
}

/** The pulse line: posts, votes today, new quizzes this week (all real counts). */
export const getPulse = unstable_cache(readPulse, ['ux-v1:p8:pulse:v1'], { revalidate: 300, tags: ['community'] });

/* ------------------------------------------------------------ badge watch --- */

async function readBadgeWatch(limit: number, today: string): Promise<BadgeWatchRow[]> {
  const db = createPublicReadClient();
  const since = new Date(Date.parse(`${today}T00:00:00Z`) - 6 * 24 * 3600_000).toISOString();
  // Earns this week. founding_fan is excluded like components/community/badge-showcase
  // (the mig 104 backfill stamped every account at once; it can never be earned again).
  const earns = await fetchAllRows<{ badge_id: string; user_id: string; earned_at: string }>(() => db.from('user_badges')
    .select('badge_id, user_id, earned_at').gte('earned_at', since).neq('badge_id', 'founding_fan').order('earned_at', { ascending: false }));
  if (!earns.length) return [];
  const byBadge = new Map<string, { n: number; latest: { user_id: string; earned_at: string } }>();
  for (const e of earns) {
    const b = byBadge.get(e.badge_id);
    if (!b) byBadge.set(e.badge_id, { n: 1, latest: e });
    else b.n++;
  }
  // Latest earned first (the rows are ordered by earned_at desc).
  const order = [...byBadge.keys()].slice(0, limit);
  const { data: defs } = must(await db.from('badge_definitions').select('id, name, description').in('id', order), 'badge_definitions');
  const defById = new Map(((defs ?? []) as { id: string; name: string; description: string }[]).map((d) => [d.id, d] as const));
  const people = await readPeople(db, order.map((id) => byBadge.get(id)!.latest.user_id));
  const now = Date.parse(`${today}T12:00:00Z`);
  return order.map((id): BadgeWatchRow | null => {
    const def = defById.get(id);
    const b = byBadge.get(id)!;
    if (!def) return null;
    const who = people.get(b.latest.user_id);
    const tail = b.n > 1 ? `${b.n.toLocaleString('en-US')} fans this week` : `${who?.username ?? who?.name ?? 'a fan'} ${dayAgo(b.latest.earned_at, now)}`;
    const desc = def.description.trim().replace(/[.!]+$/, '');
    return { badgeId: id, name: def.name, description: desc, sub: `${desc} · ${tail}` };
  }).filter((r): r is BadgeWatchRow => r !== null);
}

/** Badge watch: the latest 3 badges earned this week, with how many fans earned each. */
export const getBadgeWatch = unstable_cache(readBadgeWatch, ['ux-v1:p8:badges:v2'], { revalidate: 300, tags: ['community'] });

/* ------------------------------------------------------------- fandom war --- */

/** The fandom war ranking (existing cached RPC read), with fandom names, for the phone
 *  strip ("Fandom war: STAY is #2 this week"; the island picks the viewer's group). */
export async function getWarEntries(): Promise<WarEntry[]> {
  const [war, groups] = await Promise.all([getFandomWarMap(30), getP8Groups()]);
  const fandom = new Map(groups.map((g) => [g.slug, g.fandom] as const));
  return war.map((w, i) => ({ slug: w.slug, name: w.name, fandom: fandom.get(w.slug) ?? null, rank: i + 1 }));
}

