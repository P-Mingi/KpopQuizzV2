// P11 (UX v11.2): the server reads of the search overlay, behind
// GET /api/ux-v1/p11/search (a new endpoint: the live /api/search payload is never
// changed). Reads only, all cookie-free public reads (anon key, RLS applies), the
// same catalog the live /search page reads:
//   groups   = the visible groups with their PUBLISHED quiz counts (16.10), P3's
//              cached index (lib/ux-v1/p3/data.ts getGroupsIndex, one read per TTL)
//   quizzes  = published quizzes whose title matches, plus the published quizzes
//              of the matched groups (WIRING-MAP v10 "incl. quizzes of a matched group")
//   songs    = active songs of the blindtest catalog (`songs`, the table the game
//              plays, DECISIONS-LOG 2026-09-25) whose title or artist matches
// Nothing about any user is read or returned. A read that fails is reported as
// `degraded` (never shown as "no results") and the route does not cache it.

import { unstable_cache } from 'next/cache';

import { createPublicReadClient } from '@/lib/supabase/server';
import { isNextInternalError } from '@/lib/error-handling';
import { isConfiguredImageHost } from '@/lib/image-hosts';
import { groupPhotoUrl } from '@/lib/ux-v1/a0/group-photos';
import { getGroupsIndex, getPlayableSongs } from '@/lib/ux-v1/p3/data';
import { CATCH_ALL_SLUG, initials } from '@/lib/ux-v1/p3/model';

import {
  MAX_QUIZZES, MAX_SONGS, POPULAR_GROUPS, POPULAR_QUIZZES,
  likePattern, matchGroups, mergeQuizzes, mergeSongs, playsLabel, quizzesLabel, songHref,
} from './search-model';

import type { IndexGroup } from '@/lib/ux-v1/p3/model';
import type { P11SearchGroup, P11SearchQuiz, P11SearchResult, QuizRow, SongRow } from './search-model';

const QUIZ_COLS = 'slug, title, play_count, cover_image_url, groups!inner(name, slug)';
const SONG_COLS = 'id, title, artist_name, play_count, groups(slug)';
const TIMEOUT_MS = 4000;

export type P11SearchPayload = P11SearchResult & { degraded: boolean };

interface RawQuiz { slug: string; title: string; play_count: number | null; cover_image_url: string | null; groups: { name: string; slug: string } | null }
interface RawSong { id: string; title: string; artist_name: string | null; play_count: number | null; groups: { slug: string } | null }
interface PgRes { data: unknown; error: { message: string } | null }

function toQuizRows(data: unknown): QuizRow[] {
  return ((data ?? []) as RawQuiz[]).flatMap((r) => (r.groups
    ? [{ slug: r.slug, title: r.title, play_count: r.play_count, cover_image_url: r.cover_image_url, group_name: r.groups.name, group_slug: r.groups.slug }]
    : []));
}

function toSongRows(data: unknown): SongRow[] {
  return ((data ?? []) as RawSong[]).map((r) => ({ id: r.id, title: r.title, artist_name: r.artist_name, play_count: r.play_count, group_slug: r.groups?.slug ?? null }));
}

interface Attempt<T> { value: T; ok: boolean }

/** Run one read with a timeout; a PostgREST error, a throw or a timeout = not ok
 *  (logged, never thrown, Next's own control-flow errors re-thrown). */
async function attempt<T>(run: () => PromiseLike<T>, fallback: T, label: string): Promise<Attempt<T>> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<'timeout'>((resolve) => { timer = setTimeout(() => resolve('timeout'), TIMEOUT_MS); });
    const out = await Promise.race([Promise.resolve(run()), timeout]);
    if (out === 'timeout') { console.warn(`[p11 search] ${label} timed out`); return { value: fallback, ok: false }; }
    return { value: out as T, ok: true };
  } catch (err) {
    if (isNextInternalError(err)) throw err;
    console.error(`[p11 search] ${label} failed:`, err);
    return { value: fallback, ok: false };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function pgRows<T>(label: string, map: (d: unknown) => T[]): (res: PgRes) => T[] {
  return (res) => {
    if (res.error) throw new Error(`${label}: ${res.error.message}`);
    return map(res.data);
  };
}

function groupView(g: IndexGroup): P11SearchGroup {
  return { name: g.name, slug: g.slug, href: `/${g.slug}-quiz`, sub: quizzesLabel(g.quizzes), photo: g.photo, initials: initials(g.name) };
}

function quizView(r: QuizRow, sub: string): P11SearchQuiz {
  const own = r.cover_image_url && isConfiguredImageHost(r.cover_image_url) ? r.cover_image_url : null;
  return { title: r.title, href: `/q/${r.slug}`, sub, thumb: own ?? groupPhotoUrl(r.group_slug), initials: initials(r.group_name) };
}

/** The lists shown before typing (prototype: Popular groups = most quizzes,
 *  Most played quizzes = the 3 most played). Same for everyone: cached 10 min.
 *  Throws on a failed read so a failure is never cached as the popular list. */
const cachedPopular = unstable_cache(
  async (): Promise<P11SearchResult> => {
    const db = createPublicReadClient();
    const [groups, top] = await Promise.all([
      getGroupsIndex(),
      Promise.resolve(db.from('quizzes').select(QUIZ_COLS).eq('status', 'published').order('play_count', { ascending: false }).limit(POPULAR_QUIZZES))
        .then(pgRows('popular quizzes', toQuizRows)),
    ]);
    if (groups.length === 0 || top.length === 0) throw new Error('p11 popular search: empty read');
    return {
      q: '',
      mode: 'popular',
      groups: groups
        .filter((g) => g.slug !== CATCH_ALL_SLUG && g.quizzes > 0)
        .sort((a, b) => b.quizzes - a.quizzes || a.name.localeCompare(b.name, 'en'))
        .slice(0, POPULAR_GROUPS)
        .map(groupView),
      quizzes: top.map((r) => quizView(r, r.group_name)),
      songs: [],
    };
  },
  ['db:ux-v1:p11:popular-search:v1'],
  { revalidate: 600, tags: ['groups', 'quizzes'] },
);

export async function popularSearch(): Promise<P11SearchPayload> {
  const r = await attempt(() => cachedPopular(), null as P11SearchResult | null, 'popular lists');
  return r.value
    ? { ...r.value, degraded: false }
    : { q: '', mode: 'popular', groups: [], quizzes: [], songs: [], degraded: true };
}

/** Everything matching `q` (already normalised, non-empty). */
export async function searchCatalog(q: string): Promise<P11SearchPayload> {
  const db = createPublicReadClient();
  const pattern = likePattern(q);
  const index = await attempt(() => getGroupsIndex(), [] as IndexGroup[], 'groups index');
  const groups = matchGroups(index.value, q);
  const slugs = groups.map((g) => g.slug);

  const none = <T,>(): Promise<Attempt<T[]>> => Promise.resolve({ value: [] as T[], ok: true });
  const quizByTitle = pattern
    ? attempt(() => db.from('quizzes').select(QUIZ_COLS).eq('status', 'published').ilike('title', pattern)
      .order('play_count', { ascending: false }).limit(MAX_QUIZZES).then(pgRows('quizzes by title', toQuizRows)), [] as QuizRow[], 'quizzes by title')
    : none<QuizRow>();
  const quizByGroup = slugs.length
    ? attempt(() => db.from('quizzes').select(QUIZ_COLS).eq('status', 'published').in('groups.slug', slugs)
      .order('play_count', { ascending: false }).limit(MAX_QUIZZES).then(pgRows('quizzes by group', toQuizRows)), [] as QuizRow[], 'quizzes by group')
    : none<QuizRow>();
  // The blindtest pool rules (lib/blind-test-playlists.ts cleanSongs): active,
  // no remix / instrumental / karaoke rows.
  const songsBy = (col: 'title' | 'artist_name'): Promise<Attempt<SongRow[]>> => (pattern
    ? attempt(() => db.from('songs').select(SONG_COLS)
      .eq('status', 'active')
      .not('title', 'ilike', '%remix%').not('title', 'ilike', '%instrumental%').not('title', 'ilike', '%inst.%').not('title', 'ilike', '%karaoke%')
      .ilike(col, pattern)
      .order('play_count', { ascending: false })
      .limit(MAX_SONGS)
      .then(pgRows(`songs by ${col}`, toSongRows)), [] as SongRow[], `songs by ${col}`)
    : none<SongRow>());

  const [byTitle, byGroup, songTitle, songArtist, playable] = await Promise.all([
    quizByTitle, quizByGroup, songsBy('title'), songsBy('artist_name'),
    attempt(() => getPlayableSongs(), {} as Record<string, number>, 'playable groups'),
  ]);
  const playableSet = new Set(Object.keys(playable.value));
  const degraded = ![index, byTitle, byGroup, songTitle, songArtist].every((a) => a.ok);

  return {
    q,
    mode: 'query',
    groups: groups.map(groupView),
    quizzes: mergeQuizzes([byTitle.value, byGroup.value]).map((r) => quizView(r, `${r.group_name} · ${playsLabel(r.play_count ?? 0)}`)),
    songs: mergeSongs([songTitle.value, songArtist.value]).map((s) => ({ title: s.title, href: songHref(s.group_slug, playableSet), sub: s.artist_name ?? '' })),
    degraded,
  };
}
