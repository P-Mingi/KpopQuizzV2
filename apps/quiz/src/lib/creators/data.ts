// G8 (V12): server reads of the creators board (/creators). PUBLIC, cookie-free
// reads (the anon client), cached, so the page stays static/ISR. Reads only.
//
// The counts are computed here from the real `plays` rows with the rules of
// ./board.ts (unique player per quiz per day, own plays out, published quizzes
// only). `plays` is read in full pages (PostgREST caps a select at 1000 rows):
// one pass feeds both boards. Only the aggregate is cached (a few hundred
// creators), never the rows. A failed read THROWS inside the cache, so a blip is
// never stored; the page shows "could not load" instead of an empty board.

import { unstable_cache } from 'next/cache';

import { CACHE_TTL } from '@/lib/db/cache-policy';
import { fetchAllRows } from '@/lib/db/fetch-all';
import { getTeamIds } from '@/lib/editorial/accounts';
import { createPublicReadClient } from '@/lib/supabase/server';
import { avatarOf, quizzesLabel, realFandomName } from '@/lib/ux-v1/p9/format';

import { RISING_CARDS, countPlays, monthStart, quizCounts, rankCreators, risingByFandom } from './board';

import type { AvatarView } from '@/lib/ux-v1/p9/format';
import type { PlayRow, QuizRow, Ranked } from './board';

/** Rows shown on each board (podium 3 + rows), like the v11 leaderboard boards. */
export const CREATORS_ROWS = 10;
const PAGE = 1000;
const PARALLEL = 6;

/** Every play, oldest first, read in parallel pages over a stable order. */
async function readAllPlays(): Promise<PlayRow[]> {
  const db = createPublicReadClient();
  const head = await db.from('plays').select('id', { count: 'exact', head: true });
  if (head.error || head.count === null) throw new Error(`creators plays count: ${head.error?.message ?? 'no count'}`);
  // One page more than the count needs: plays written while we read are not lost.
  const pages = Math.floor(head.count / PAGE) + 1;
  const out: PlayRow[] = [];
  for (let from = 0; from < pages; from += PARALLEL) {
    const batch = await Promise.all(
      Array.from({ length: Math.min(PARALLEL, pages - from) }, (_, i) => {
        const start = (from + i) * PAGE;
        return db
          .from('plays')
          .select('id, quiz_id, player_id, anon_id, created_at')
          .order('created_at', { ascending: true })
          .order('id', { ascending: true })
          .range(start, start + PAGE - 1);
      }),
    );
    for (const res of batch) {
      if (res.error) throw new Error(`creators plays: ${res.error.message}`);
      out.push(...((res.data ?? []) as PlayRow[]));
    }
  }
  // A row can shift between two pages while plays are being written: count it once.
  const seen = new Set<string>();
  return out.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
}

interface Aggregate {
  since: string;
  month: Ranked[];
  all: Ranked[];
  /** Published quizzes per creator id. */
  quizzes: Record<string, number>;
  rising: Array<{ groupId: number; creatorId: string; plays: number; title: string; slug: string }>;
}

async function readAggregate(teamKey: string): Promise<Aggregate> {
  const db = createPublicReadClient();
  const [quizRows, banned, plays] = await Promise.all([
    fetchAllRows<QuizRow>(() => db.from('quizzes').select('id, creator_id, group_id, title, slug, created_at').eq('status', 'published').order('id', { ascending: true })),
    fetchAllRows<{ id: string }>(() => db.from('profiles').select('id').not('banned_at', 'is', null).order('id', { ascending: true })),
    readAllPlays(),
  ]);
  if (quizRows.length === 0) throw new Error('creators: empty quizzes read');
  const quizzes = new Map(quizRows.map((q) => [q.id, q]));
  const excluded = new Set<string>([...teamKey.split(',').filter(Boolean), ...banned.map((b) => b.id)]);
  const since = monthStart(new Date());
  const all = countPlays(plays, quizzes, excluded);
  const month = countPlays(plays, quizzes, excluded, since);
  const counts = quizCounts(quizRows);
  return {
    since,
    month: rankCreators(month.byCreator),
    all: rankCreators(all.byCreator),
    quizzes: Object.fromEntries(counts),
    rising: risingByFandom(quizRows, month.byQuiz, since, excluded)
      .slice(0, RISING_CARDS)
      .map((r) => {
        const q = quizzes.get(r.quizId)!;
        return { groupId: r.groupId, creatorId: r.creatorId, plays: r.plays, title: q.title, slug: q.slug };
      }),
  };
}

// The month changes on the 1st: the key carries the month so the first render of
// a new month never serves last month's board for the TTL.
const cachedAggregate = unstable_cache(
  (teamKey: string, _month: string) => readAggregate(teamKey),
  ['v12:g8:creators-aggregate:v1'],
  { revalidate: CACHE_TTL.stats, tags: ['creators'] },
);

async function getAggregate(): Promise<Aggregate> {
  const team = [...(await getTeamIds())].sort().join(',');
  return cachedAggregate(team, monthStart(new Date()).slice(0, 7));
}

export interface CreatorCard {
  rank: number;
  username: string;
  href: string;
  avatar: AvatarView;
  accent: string | null;
  font: string | null;
  bias: string | null;
  plays: number;
  /** "3 quizzes · STAY" */
  sub: string;
}

export interface RisingCard {
  /** The fandom ("EYEKON"), or the group when the fandom has no name. */
  fandom: string;
  username: string;
  href: string;
  quizTitle: string;
  quizHref: string;
  plays: number;
}

export interface CreatorsPageData {
  /** "October 2026" (UTC month of the board). */
  monthLabel: string;
  month: CreatorCard[];
  all: CreatorCard[];
  rising: RisingCard[];
}

interface ProfileRow {
  id: string;
  username: string | null;
  avatar_url: string | null;
  avatar_kind: string | null;
  avatar_ref: string | null;
  ult_groups: string[] | null;
  name_accent: string | null;
  name_font: string | null;
  bias: string | null;
}

interface GroupRow { id: number; slug: string; name: string; fandom_name: string | null }

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function monthLabelOf(sinceIso: string): string {
  const d = new Date(sinceIso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

async function readPage(): Promise<CreatorsPageData> {
  const agg = await getAggregate();
  const top = (list: Ranked[]): Ranked[] => list.slice(0, CREATORS_ROWS);
  const ids = [...new Set([...top(agg.month), ...top(agg.all)].map((r) => r.id).concat(agg.rising.map((r) => r.creatorId)))];
  const db = createPublicReadClient();
  const [profs, groups] = await Promise.all([
    ids.length
      ? db.from('profiles').select('id, username, avatar_url, avatar_kind, avatar_ref, ult_groups, name_accent, name_font, bias').in('id', ids)
      : Promise.resolve({ data: [] as ProfileRow[], error: null }),
    db.from('groups').select('id, slug, name, fandom_name'),
  ]);
  if (profs.error) throw new Error(`creators profiles: ${profs.error.message}`);
  if (groups.error) throw new Error(`creators groups: ${groups.error.message}`);
  const byId = new Map(((profs.data ?? []) as ProfileRow[]).map((p) => [p.id, p]));
  const groupRows = (groups.data ?? []) as GroupRow[];
  const bySlug = new Map(groupRows.map((g) => [g.slug, g]));
  const byGroupId = new Map(groupRows.map((g) => [g.id, g]));

  const card = (r: Ranked): CreatorCard | null => {
    const p = byId.get(r.id);
    if (!p?.username) return null;
    const main = Array.isArray(p.ult_groups) && typeof p.ult_groups[0] === 'string' ? bySlug.get(p.ult_groups[0]) : undefined;
    const fandom = main ? realFandomName(main.fandom_name) : null;
    return {
      rank: r.rank,
      username: p.username,
      href: `/u/${encodeURIComponent(p.username)}`,
      avatar: avatarOf(p),
      accent: p.name_accent,
      font: p.name_font,
      bias: p.bias,
      plays: r.plays,
      sub: [quizzesLabel(agg.quizzes[r.id] ?? 0), fandom].filter(Boolean).join(' · '),
    };
  };
  const cards = (list: Ranked[]): CreatorCard[] => top(list).map(card).filter((c): c is CreatorCard => c !== null);

  return {
    monthLabel: monthLabelOf(agg.since),
    month: cards(agg.month),
    all: cards(agg.all),
    rising: agg.rising
      .map((r): RisingCard | null => {
        const p = byId.get(r.creatorId);
        const g = byGroupId.get(r.groupId);
        if (!p?.username || !g) return null;
        return {
          fandom: realFandomName(g.fandom_name) ?? g.name,
          username: p.username,
          href: `/u/${encodeURIComponent(p.username)}`,
          quizTitle: r.title,
          quizHref: `/q/${r.slug}`,
          plays: r.plays,
        };
      })
      .filter((c): c is RisingCard => c !== null),
  };
}

/** The whole page. Not wrapped in a cache of its own (unstable_cache entries cannot
 *  nest): the heavy part is the cached aggregate, the rest is two small reads per
 *  ISR render of /creators (revalidate 300). */
export async function getCreatorsPage(): Promise<CreatorsPageData> {
  return readPage();
}

export interface CreatorStanding {
  quizzes: number;
  month: { rank: number | null; plays: number };
  all: { rank: number | null; plays: number };
}

/** One creator's own place on both boards, from the same aggregate as the page
 *  (so the pinned row can never disagree with the board). */
export async function getCreatorStanding(userId: string): Promise<CreatorStanding> {
  const agg = await getAggregate();
  const find = (list: Ranked[]): { rank: number | null; plays: number } => {
    const r = list.find((x) => x.id === userId);
    return r ? { rank: r.rank, plays: r.plays } : { rank: null, plays: 0 };
  };
  return { quizzes: agg.quizzes[userId] ?? 0, month: find(agg.month), all: find(agg.all) };
}
