import { createServiceRoleClient } from '@/lib/supabase/server';
import { STATIC_MODES } from '@/lib/blind-test-modes';
import { buildOverriddenFacts, type FactSourceQuiz } from '@/lib/trivia/facts';
import { TRIVIA_MIN_FACTS } from '@/lib/db/queries/trivia';
import { getRankingsIndex } from '@/lib/db/queries/duels';
import { getPersonalityGroups } from '@/lib/personality/data';
import { ARTICLES } from '@/lib/articles/registry';
import { SORT_IT_PLAYLISTS } from '@/lib/games/sort-it';
import { MATCH_UP_PLAYLISTS } from '@/lib/games/match-up';
import { NAME_THEM_ALL_PLAYLISTS } from '@/lib/games/name-them-all';
import { slugify as verseSlugify } from '@/lib/verse/slug';
import { verseHidden, spaceUnpublished } from '@/lib/verse/visibility';
import { fetchAllRows } from '@/lib/db/fetch-all';

import type { MetadataRoute } from 'next';

const SITE_URL = 'https://kpopquiz.org';

// Caps to prevent timeouts as the dataset grows. Google's sitemap limit is
// 50,000 URLs per file, so anything above these values should eventually be
// split into sub-sitemaps. For now a safe ceiling.
const QUIZZES_LIMIT = 10000;
const BT_SONG_LIMIT = 5000;

// LASTMOD honesty (SEO audit v2): evergreen pages (legal/info) carry a STABLE
// date so we stop emitting `new Date()` every deploy - false "changed today"
// signals poison Google's recrawl prioritization. Catalog-driven pages instead
// carry `contentDate` = the newest quiz updated_at (computed at request time),
// and each group page carries its own group's newest quiz date. Terms/Privacy
// keep their own real edit dates.
const STATIC_DATE = new Date('2026-06-15');
const TERMS_DATE = new Date('2026-03-27');

// URLs whose content is derived from the live quiz catalogue: their lastmod is
// the newest quiz updated_at, not the deploy time.
const CATALOG_PATHS = new Set<string>([
  '', '/quizzes', '/quizzes/popular-today', '/quizzes/popular-this-week', '/quizzes/popular-this-month',
  '/trending', '/new', '/most-liked', '/trivia', '/leaderboard',
  '/easy-kpop-quizzes', '/hard-kpop-quizzes', '/kpop-quiz-2026',
  '/guess-the-kpop-idol', '/kpop-true-or-false', '/blindtest', '/games',
  '/games/this-or-that', '/games/name-all', '/stats',
  '/pt', '/pt/quizzes', '/pt/blindtest', '/pt/games', '/pt/leaderboard', '/pt/stats',
  '/pt/easy-kpop-quizzes', '/pt/hard-kpop-quizzes', '/pt/kpop-quiz-2026',
  '/pt/guess-the-kpop-idol', '/pt/kpop-true-or-false',
].map((p) => `${SITE_URL}${p}`));

/**
 * `-trivia` URLs that will actually render (>=12 facts AFTER the J1 override
 * layer). Runs the SAME buildOverriddenFacts the page/gate uses - not a raw
 * mirror - so the sitemap never advertises a -trivia URL that now 404s.
 */
function buildTriviaEligibleGroupSet(
  quizzes: Array<{ group_id: number | null; slug: string; questions: unknown }>,
  slugByGroupId: Map<number, string>,
): Set<number> {
  const quizzesByGroup = new Map<number, FactSourceQuiz[]>();
  for (const quiz of quizzes) {
    if (quiz.group_id == null) continue;
    let arr = quizzesByGroup.get(quiz.group_id);
    if (!arr) {
      arr = [];
      quizzesByGroup.set(quiz.group_id, arr);
    }
    arr.push({ slug: quiz.slug, questions: quiz.questions });
  }

  const eligible = new Set<number>();
  for (const [groupId, groupQuizzes] of quizzesByGroup) {
    const slug = slugByGroupId.get(groupId);
    if (!slug) continue;
    if (buildOverriddenFacts(slug, groupQuizzes).length >= TRIVIA_MIN_FACTS) {
      eligible.add(groupId);
    }
  }
  return eligible;
}

/**
 * Dynamic sitemap. Queries are wrapped in try/catch so a database blip
 * returns the static pages only instead of a 500 - Google indexes what it
 * can and tries again later.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Catalog freshness. Defaults to STATIC_DATE so a DB outage still emits stable
  // (never future/now) lastmods; overwritten with the newest quiz date below.
  let contentDate = STATIC_DATE;
  const groupLatest = new Map<number, Date>();

  // Static pages - always returned, even if every dynamic query fails. Catalog
  // pages start at STATIC_DATE and get bumped to contentDate after the fetch.
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: STATIC_DATE, changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE_URL}/quizzes`, lastModified: STATIC_DATE, changeFrequency: 'daily', priority: 0.9 },
    // S2 #3 time-sliced popular index pages (lastmod bumped to contentDate below).
    { url: `${SITE_URL}/quizzes/popular-today`, lastModified: STATIC_DATE, changeFrequency: 'hourly', priority: 0.7 },
    { url: `${SITE_URL}/quizzes/popular-this-week`, lastModified: STATIC_DATE, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/quizzes/popular-this-month`, lastModified: STATIC_DATE, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/trending`, lastModified: STATIC_DATE, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/new`, lastModified: STATIC_DATE, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/most-liked`, lastModified: STATIC_DATE, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/trivia`, lastModified: STATIC_DATE, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/leaderboard`, lastModified: STATIC_DATE, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/easy-kpop-quizzes`, lastModified: STATIC_DATE, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/hard-kpop-quizzes`, lastModified: STATIC_DATE, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/kpop-quiz-2026`, lastModified: STATIC_DATE, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/guess-the-kpop-idol`, lastModified: STATIC_DATE, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/kpop-true-or-false`, lastModified: STATIC_DATE, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/blindtest`, lastModified: STATIC_DATE, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/games`, lastModified: STATIC_DATE, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/games/this-or-that`, lastModified: STATIC_DATE, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/games/name-all`, lastModified: STATIC_DATE, changeFrequency: 'weekly', priority: 0.7 },
    // Workstream V1 - Sort It index + one page per programmatic playlist. The
    // playlists are a static code registry, so they enumerate without a DB query.
    { url: `${SITE_URL}/games/sort-it`, lastModified: STATIC_DATE, changeFrequency: 'weekly', priority: 0.7 },
    ...SORT_IT_PLAYLISTS.map((p) => ({
      url: `${SITE_URL}/games/sort-it/${p.slug}`,
      lastModified: STATIC_DATE,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
    // Workstream V2 - Match-Up index + one page per programmatic playlist.
    { url: `${SITE_URL}/games/match-up`, lastModified: STATIC_DATE, changeFrequency: 'weekly', priority: 0.7 },
    ...MATCH_UP_PLAYLISTS.map((p) => ({
      url: `${SITE_URL}/games/match-up/${p.slug}`,
      lastModified: STATIC_DATE,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
    // Workstream V3 - Name Them All index + one page per programmatic dataset.
    { url: `${SITE_URL}/games/name-them-all`, lastModified: STATIC_DATE, changeFrequency: 'weekly', priority: 0.7 },
    ...NAME_THEM_ALL_PLAYLISTS.map((p) => ({
      url: `${SITE_URL}/games/name-them-all/${p.slug}`,
      lastModified: STATIC_DATE,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
    { url: `${SITE_URL}/stats`, lastModified: STATIC_DATE, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/about`, lastModified: STATIC_DATE, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/faq`, lastModified: STATIC_DATE, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/contact`, lastModified: STATIC_DATE, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: TERMS_DATE, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/privacy`, lastModified: TERMS_DATE, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/dmca`, lastModified: TERMS_DATE, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/articles`, lastModified: STATIC_DATE, changeFrequency: 'weekly', priority: 0.7 },
    // Workstream T0 monthly Pulse index. Per-month reports are appended below.
    { url: `${SITE_URL}/data/pulse`, lastModified: STATIC_DATE, changeFrequency: 'monthly', priority: 0.6 },

    // Portuguese (pt-BR) - live, reviewed, indexable
    { url: `${SITE_URL}/pt`, lastModified: STATIC_DATE, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/pt/quizzes`, lastModified: STATIC_DATE, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/pt/blindtest`, lastModified: STATIC_DATE, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/pt/games`, lastModified: STATIC_DATE, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/pt/leaderboard`, lastModified: STATIC_DATE, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/pt/faq`, lastModified: STATIC_DATE, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/pt/about`, lastModified: STATIC_DATE, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/pt/stats`, lastModified: STATIC_DATE, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/pt/articles`, lastModified: STATIC_DATE, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/pt/easy-kpop-quizzes`, lastModified: STATIC_DATE, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/pt/hard-kpop-quizzes`, lastModified: STATIC_DATE, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/pt/kpop-quiz-2026`, lastModified: STATIC_DATE, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/pt/guess-the-kpop-idol`, lastModified: STATIC_DATE, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/pt/kpop-true-or-false`, lastModified: STATIC_DATE, changeFrequency: 'weekly', priority: 0.6 },
  ];

  const articlePages: MetadataRoute.Sitemap = ARTICLES.filter((a) => !a.noindex).map((a) => ({
    url: `${SITE_URL}/articles/${a.slug}`,
    lastModified: new Date(a.updatedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  // Workstream P: the "which {group} member are you" personality quizzes.
  let personalityPages: MetadataRoute.Sitemap = [];
  try {
    const pGroups = await getPersonalityGroups();
    personalityPages = pGroups.map((g) => ({
      url: `${SITE_URL}/which-${g.slug}-member-are-you`,
      lastModified: STATIC_DATE,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }));
  } catch {
    personalityPages = [];
  }

  // Static blind test mode pages (from the in-code catalogue) - evergreen.
  const blindTestModePages: MetadataRoute.Sitemap = STATIC_MODES.map((mode) => ({
    url: `${SITE_URL}/blindtest/${mode.id}`,
    lastModified: STATIC_DATE,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  let quizPages: MetadataRoute.Sitemap = [];
  let groupPages: MetadataRoute.Sitemap = [];
  // SEO crawl-budget concentration: /u/ profile pages are intentionally NOT in the
  // sitemap. They are thin, rarely rank, and diluted crawl budget away from the
  // quiz/group/trivia pages that actually earn traffic. Profiles stay indexable
  // (self-canonical, no noindex above the 3-quiz gate) and reachable via internal
  // links - we just stop advertising them so Google spends its budget on winners.
  let blindTestGroupPages: MetadataRoute.Sitemap = [];
  let gamePages: MetadataRoute.Sitemap = [];
  let rankingPages: MetadataRoute.Sitemap = [];
  let pulsePages: MetadataRoute.Sitemap = [];

  try {
    const supabase = createServiceRoleClient();

    // Hard 15s ceiling for the entire sitemap batch. Under a DB outage the
    // build would otherwise hang for 60s per attempt and fail the deploy.
    // 15s is generous (sitemap usually finishes <5s) and well under Vercel's
    // 60s per-page build cap. On timeout we emit just the static URLs below.
    type Row = { data: Array<Record<string, unknown>> | null };
    const SITEMAP_BATCH_TIMEOUT_MS = 15000;
    const timeoutSentinel = Symbol('sitemap-batch-timeout');
    const raced = await Promise.race([
      Promise.all([
        supabase.from('quizzes').select('slug, updated_at, group_id, questions').eq('status', 'published').order('updated_at', { ascending: false }).limit(QUIZZES_LIMIT),
        supabase.from('groups').select('id, slug, quiz_count'),
        supabase.from('blind_test_songs').select('groups!inner(slug)').eq('status', 'active').not('clip_chorus', 'is', null).limit(BT_SONG_LIMIT),
        supabase.from('games').select('slug, game_type, updated_at').eq('status', 'published').eq('game_type', 'name_all_members').limit(500),
        supabase.from('tot_categories').select('slug, created_at').eq('is_published', true).limit(500),
      ]),
      new Promise<typeof timeoutSentinel>((resolve) => setTimeout(() => resolve(timeoutSentinel), SITEMAP_BATCH_TIMEOUT_MS)),
    ]);
    if (raced === timeoutSentinel) {
      console.warn('[sitemap] DB batch timed out - emitting static-only sitemap');
      throw new Error('sitemap batch timeout');
    }
    const [quizzesResult, groupsResult, btSongGroupsResult, gamesResult, totCategoriesResult] = raced as [Row, Row, Row, Row, Row];

    // LASTMOD: quizzes are ordered updated_at desc, so [0] is the newest content
    // change on the site. Also fold the per-group newest date for group pages.
    const quizRows = (quizzesResult.data ?? []) as Array<{ slug: string; updated_at: string; group_id: number | null }>;
    if (quizRows[0]?.updated_at) contentDate = new Date(quizRows[0].updated_at);
    for (const q of quizRows) {
      if (q.group_id == null || !q.updated_at) continue;
      const d = new Date(q.updated_at);
      const prev = groupLatest.get(q.group_id);
      if (!prev || d > prev) groupLatest.set(q.group_id, d);
    }

    // Dynamic group blind test pages (deduplicated)
    const btGroupSlugs = [
      ...new Set(
        (btSongGroupsResult.data ?? [])
          .map((r) => (r.groups as unknown as { slug: string } | null)?.slug)
          .filter(Boolean) as string[],
      ),
    ];
    blindTestGroupPages = btGroupSlugs.map((slug) => ({
      url: `${SITE_URL}/blindtest/group-${slug}`,
      lastModified: contentDate,
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    }));

    // Only list `-trivia` URLs for groups that have enough unique fun facts
    // to actually render the page (matches the `notFound()` gate in
    // [slug]/page.tsx). Prevents Google from indexing 404s.
    const slugByGroupId = new Map<number, string>(
      (groupsResult.data ?? []).map((g) => [g.id as number, g.slug as string]),
    );
    const triviaEligibleGroupIds = buildTriviaEligibleGroupSet(
      (quizzesResult.data ?? []) as Array<{ group_id: number | null; slug: string; questions: unknown }>,
      slugByGroupId,
    );

    groupPages = ((groupsResult.data ?? []) as Array<{ id: number; slug: string; quiz_count: number | null }>).flatMap((g) => {
      const entries: MetadataRoute.Sitemap = [];
      // Honest lastmod: the group page changes when one of its quizzes changes.
      const groupDate = groupLatest.get(g.id) ?? contentDate;

      // `-quiz` page renders an empty "be the first" state when quiz_count
      // is 0 - thin content that Google soft-404s. Skip those.
      if ((g.quiz_count ?? 0) > 0) {
        entries.push({
          url: `${SITE_URL}/${g.slug}-quiz`,
          lastModified: groupDate,
          changeFrequency: 'weekly' as const,
          priority: 0.9,
        });
      }

      if (triviaEligibleGroupIds.has(g.id)) {
        entries.push({
          url: `${SITE_URL}/${g.slug}-trivia`,
          lastModified: groupDate,
          changeFrequency: 'weekly' as const,
          priority: 0.5,
        });
      }

      return entries;
    });

    quizPages = quizRows.map((q) => ({
      url: `${SITE_URL}/q/${q.slug}`,
      lastModified: new Date(q.updated_at),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }));

    gamePages = [
      ...((gamesResult.data ?? []) as Array<{ slug: string; updated_at: string }>).map((g) => ({
        url: `${SITE_URL}/games/name-all/${g.slug}`,
        lastModified: new Date(g.updated_at),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      })),
      // SEO indexguard: the per-category /games/this-or-that/[slug] pages were
      // consolidated into the query-param model - that route now 308-permanent-
      // redirects to /games/this-or-that?group=...&type=... So listing the slug
      // URLs advertised redirecting (non-canonical) pages. The hub /games/this-or-that
      // is in the static list; the category slugs are intentionally NOT sitemap'd.
      // (totCategoriesResult is still fetched to keep the batch shape stable.)
    ];
    void totCategoriesResult;
  } catch (err) {
    // Don't 500 the sitemap - log and return whatever we have.
    console.error('[sitemap] dynamic query failed, returning static pages only:', err);
  }

  // Bump catalog-driven static pages to the real newest-content date (honest
  // lastmod). Evergreen + legal pages keep their stable dates.
  for (const page of staticPages) {
    if (CATALOG_PATHS.has(page.url)) page.lastModified = contentDate;
  }

  // Ranking pages: ONLY questions whose real votes have crossed min_votes are
  // public/indexable (the rest are noindex locked states). The /rankings hub is
  // listed only when at least one ranking is public (otherwise it's a noindex
  // empty hub). Guarded separately so a failure here can't drop the rest.
  try {
    const RANKINGS_TIMEOUT_MS = 5000;
    const rankingsSentinel = Symbol('rankings-timeout');
    const rankingsResult = await Promise.race([
      getRankingsIndex(),
      new Promise<typeof rankingsSentinel>((resolve) => setTimeout(() => resolve(rankingsSentinel), RANKINGS_TIMEOUT_MS)),
    ]);
    if (rankingsResult === rankingsSentinel) {
      console.warn('[sitemap] rankings index timed out - skipping ranking URLs');
      throw new Error('rankings index timeout');
    }
    const publicRankings = (rankingsResult as Awaited<ReturnType<typeof getRankingsIndex>>).filter((r) => r.public);
    rankingPages = publicRankings.map((r) => ({
      url: `${SITE_URL}/rankings/${r.group_slug}/${r.question_type}`,
      lastModified: contentDate,
      changeFrequency: 'daily' as const,
      priority: 0.6,
    }));
    if (publicRankings.length > 0) {
      rankingPages.unshift({
        url: `${SITE_URL}/rankings`,
        lastModified: contentDate,
        changeFrequency: 'daily' as const,
        priority: 0.6,
      });
    }
  } catch (err) {
    console.error('[sitemap] rankings query failed, skipping ranking pages:', err);
  }

  // Workstream T0: one URL per generated monthly Pulse report. Guarded on its
  // own so a failure here cannot drop the rest of the sitemap. lastmod is each
  // report's real updated_at (honest - it only changes when the cron reruns).
  try {
    const supabase = createServiceRoleClient();
    const { data } = await supabase
      .from('pulse_reports')
      .select('month, updated_at')
      .order('month', { ascending: false });
    pulsePages = ((data ?? []) as Array<{ month: string; updated_at: string }>).map((r) => ({
      url: `${SITE_URL}/data/pulse/${r.month}`,
      lastModified: new Date(r.updated_at),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }));
  } catch (err) {
    console.error('[sitemap] pulse query failed, skipping pulse month pages:', err);
  }

  // Verse: directory + each seeded space (+ its 5 tabs) + idol + album pages.
  // V-UPGRADE-1 Phase B: the shared-surface Verse MIRRORS (/verse/community,
  // /verse/me, /verse/u/[username], /verse/notifications) are deliberately NOT
  // listed here. They canonicalize to their Play originals (/leaderboard, /u/...)
  // or are auth-gated noindex, so advertising them would expose duplicate content.
  // Do not add them below - this sitemap is an allow-list, so omission is the fix.
  let versePages: MetadataRoute.Sitemap = [];
  try {
    const svc = createServiceRoleClient();
    const [{ data: seeds }, { data: idols }, { data: albums }] = await Promise.all([
      svc.from('verse_seed_ids').select('groups(slug)').not('checked_at', 'is', null),
      svc.from('idols').select('name, groups(slug)').eq('active', true),
      svc.from('albums').select('title, groups(slug)'),
    ]);
    const gslug = (g: unknown): string | null => {
      const v = Array.isArray(g) ? g[0] : g;
      return v && typeof v === 'object' && 'slug' in v ? (v as { slug: string }).slug : null;
    };
    const seen = new Set<string>();
    const push = (path: string, priority: number, freq: 'daily' | 'weekly' | 'monthly') => {
      const url = `${SITE_URL}${path}`;
      if (seen.has(url)) return;
      seen.add(url);
      versePages.push({ url, lastModified: STATIC_DATE, changeFrequency: freq, priority });
    };
    push('/verse', 0.8, 'daily');
    push('/verse/promises', 0.6, 'monthly'); // V-TRUST: the covenant is a real indexed trust page
    // PUSH-GATE-1: while the Verse is hidden, ONLY the teaser + covenant stay in the sitemap;
    // every other Verse URL is dropped (belt + braces on top of the 302) so Google stops
    // re-discovering them. Flag true -> the full sitemap returns, byte-identical to today.
    if (!verseHidden()) {
    const spaceSlugs = [...new Set(((seeds ?? []) as { groups: unknown }[]).map((s) => gslug(s.groups)).filter((x): x is string => !!x))];
    for (const slug of spaceSlugs) {
      push(`/verse/${slug}`, 0.7, 'weekly');
      for (const tab of ['members', 'discography', 'timeline', 'community', 'about']) push(`/verse/${slug}/${tab}`, 0.5, 'weekly');
    }
    for (const i of (idols ?? []) as { name: string; groups: unknown }[]) {
      const s = gslug(i.groups);
      if (s) push(`/verse/${s}/members/${verseSlugify(i.name)}`, 0.6, 'monthly');
    }
    for (const a of (albums ?? []) as { title: string; groups: unknown }[]) {
      const s = gslug(a.groups);
      if (s) push(`/verse/${s}/albums/${verseSlugify(a.title)}`, 0.5, 'monthly');
    }
    // V4: the song deck ships per space with albums (same gate as the tab), and
    // every track is a page. Awards enters only where rows exist (no empty pages).
    for (const a of (albums ?? []) as { groups: unknown }[]) {
      const s = gslug(a.groups);
      if (s) push(`/verse/${s}/songs`, 0.5, 'weekly');
    }
    const { data: awardGroups } = await svc.from('awards').select('groups(slug)');
    for (const a of (awardGroups ?? []) as { groups: unknown }[]) {
      const s = gslug(a.groups);
      if (s) push(`/verse/${s}/awards`, 0.5, 'monthly');
    }
    // Song pages: paginate past the 1000-row cap (recorded law).
    for (let pg = 0; pg < 20; pg++) {
      const { data: songRows } = await svc.from('songs').select('id, groups(slug)').order('id').range(pg * 1000, pg * 1000 + 999);
      const rows = (songRows ?? []) as { id: string; groups: unknown }[];
      for (const r of rows) {
        const s = gslug(r.groups);
        if (s) push(`/verse/${s}/songs/${r.id}`, 0.4, 'monthly');
      }
      if (rows.length < 1000) break;
    }
    // V-CARDS-MAX: the binder + shelf SHELLS are indexable catalog pages (the
    // personal state is client-only/private); their tabs gate on published rows,
    // so enter the shell only where a space has that catalog. Card pages enter
    // only when sourced (the leaf's own robots gate matches).
    const [{ data: pcGroups }, { data: colGroups }] = await Promise.all([
      svc.from('photocards').select('groups(slug)').eq('status', 'published'),
      svc.from('collectibles').select('groups(slug)').eq('status', 'published'),
    ]);
    for (const r of (pcGroups ?? []) as { groups: unknown }[]) { const s = gslug(r.groups); if (s) push(`/verse/${s}/photocards`, 0.5, 'weekly'); }
    for (const r of (colGroups ?? []) as { groups: unknown }[]) { const s = gslug(r.groups); if (s) push(`/verse/${s}/collectibles`, 0.5, 'weekly'); }
    for (let pg = 0; pg < 20; pg++) {
      const { data: cardRows } = await svc.from('photocards').select('id, groups(slug)').eq('status', 'published').not('source_url', 'is', null).order('id').range(pg * 1000, pg * 1000 + 999);
      const rows = (cardRows ?? []) as { id: number; groups: unknown }[];
      for (const r of rows) { const s = gslug(r.groups); if (s) push(`/verse/${s}/photocards/${r.id}`, 0.4, 'monthly'); }
      if (rows.length < 1000) break;
    }
    // V-ESSAYS-MAX: the magazine index (per space with a public essay) + each
    // featured essay page (indexable, Article LD). Series need no own URL (they
    // are shelves on the index). Drafts stay out (status='featured' filter).
    const { data: essayRows } = await svc.from('verse_essays').select('id, groups(slug)').eq('status', 'featured').order('id');
    const magSlugs = new Set<string>();
    for (const r of (essayRows ?? []) as { id: number; groups: unknown }[]) {
      const s = gslug(r.groups);
      if (!s) continue;
      if (!magSlugs.has(s)) { magSlugs.add(s); push(`/verse/${s}/essays`, 0.5, 'weekly'); }
      push(`/verse/${s}/essays/${r.id}`, 0.5, 'monthly');
    }
    // V-PAGES: wiki pages enter the sitemap ONLY at published + non-stub (the
    // thin-page protection; stubs are also robots-noindexed at the leaf).
    const { data: wikiPages } = await svc.from('verse_pages')
      .select('slug, published_at, updated_at, groups(slug)')
      .eq('status', 'published').eq('is_stub', false);
    for (const w of (wikiPages ?? []) as { slug: string; updated_at: string; groups: unknown }[]) {
      const s = gslug(w.groups);
      if (!s) continue;
      push(`/verse/${s}/wiki/${w.slug}`, 0.5, 'weekly');
      push(`/verse/${s}/wiki`, 0.5, 'weekly');
    }

    // V-FOUNDATION F1: the page tree enters the sitemap at published + non-stub only
    // (C5 mechanical indexability - a stub is noindex at the leaf AND absent here).
    // Paginated past the 1000-row PostgREST cap (law: fetchAllRows). Portal + index
    // pages are structural, not documents, so they are excluded from the sitemap here.
    const treePages = await fetchAllRows<{ slug: string; type: string; groups: unknown }>(
      () => svc.from('pages').select('slug, type, groups!inner(slug)').eq('status', 'published').eq('is_stub', false).not('type', 'in', '("portal","index")'),
    );
    for (const p of treePages) {
      const s = gslug(p.groups);
      if (s && !spaceUnpublished(s)) push(`/verse/${s}/${p.slug}`, 0.6, 'weekly');  // R1: parked spaces stay out
    }
    } // end PUSH-GATE-1: non-allowlist Verse URLs only when the flag is on
  } catch (err) {
    console.error('[sitemap] verse query failed, skipping verse pages:', err);
    versePages = [];
  }

  return [
    ...staticPages,
    ...articlePages,
    ...personalityPages,
    ...blindTestModePages,
    ...blindTestGroupPages,
    ...groupPages,
    ...quizPages,
    ...gamePages,
    ...rankingPages,
    ...pulsePages,
    ...versePages,
  ];
}
