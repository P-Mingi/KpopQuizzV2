import { createServiceRoleClient } from '@/lib/supabase/server';
import { STATIC_MODES } from '@/lib/blind-test-modes';

import type { MetadataRoute } from 'next';

const SITE_URL = 'https://kpopquiz.org';

// Caps to prevent timeouts as the dataset grows. Google's sitemap limit is
// 50,000 URLs per file, so anything above these values should eventually be
// split into sub-sitemaps. For now a safe ceiling.
const QUIZZES_LIMIT = 10000;
const PROFILES_LIMIT = 500;
const BT_SONG_LIMIT = 5000;

// Must match the threshold used in group-trivia-page.tsx (`notFound()` when
// `uniqueFacts.length < 12`). If that number changes, change it here too or
// the sitemap will start advertising 404 pages again.
const TRIVIA_MIN_FACTS = 12;
const TRIVIA_MIN_FACT_LENGTH = 20;

/**
 * Mirror of the dedup/filter logic in group-trivia-page.tsx so the sitemap
 * only lists `-trivia` URLs that will actually render with content. Keeping
 * these in sync is intentional: if the page's threshold changes, update both.
 */
function buildTriviaEligibleGroupSet(
  quizzes: Array<{ group_id: number | null; questions: unknown }>,
): Set<number> {
  const factsByGroup = new Map<number, Set<string>>();

  for (const quiz of quizzes) {
    if (quiz.group_id == null) continue;
    const questions = Array.isArray(quiz.questions)
      ? (quiz.questions as Array<{ fun_fact?: string }>)
      : [];

    for (const q of questions) {
      const rawFact = q.fun_fact?.trim();
      if (!rawFact || rawFact.length <= TRIVIA_MIN_FACT_LENGTH) continue;

      const key = rawFact
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .trim()
        .slice(0, 60);

      let set = factsByGroup.get(quiz.group_id);
      if (!set) {
        set = new Set<string>();
        factsByGroup.set(quiz.group_id, set);
      }
      set.add(key);
    }
  }

  const eligible = new Set<number>();
  for (const [groupId, facts] of factsByGroup) {
    if (facts.size >= TRIVIA_MIN_FACTS) eligible.add(groupId);
  }
  return eligible;
}

/**
 * Dynamic sitemap. Queries are wrapped in try/catch so a database blip
 * returns the static pages only instead of a 500 - Google indexes what it
 * can and tries again later.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages - always returned, even if every dynamic query fails.
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE_URL}/quizzes`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/trending`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/new`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/most-liked`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/hall-of-fame`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/easy-kpop-quizzes`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/hard-kpop-quizzes`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/kpop-quiz-2026`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/guess-the-kpop-idol`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/kpop-true-or-false`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/blind-test`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/games`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/terms`, lastModified: new Date('2026-03-27'), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/privacy`, lastModified: new Date('2026-03-27'), changeFrequency: 'yearly', priority: 0.3 },
  ];

  // Static blind test mode pages (from the in-code catalogue).
  const blindTestModePages: MetadataRoute.Sitemap = STATIC_MODES.map((mode) => ({
    url: `${SITE_URL}/blind-test/${mode.id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  let quizPages: MetadataRoute.Sitemap = [];
  let groupPages: MetadataRoute.Sitemap = [];
  let profilePages: MetadataRoute.Sitemap = [];
  let blindTestGroupPages: MetadataRoute.Sitemap = [];
  let gamePages: MetadataRoute.Sitemap = [];

  try {
    const supabase = createServiceRoleClient();

    const [quizzesResult, groupsResult, profilesResult, btSongGroupsResult, gamesResult] = await Promise.all([
      supabase
        .from('quizzes')
        .select('slug, updated_at, group_id, questions')
        .eq('status', 'published')
        .order('updated_at', { ascending: false })
        .limit(QUIZZES_LIMIT),
      supabase
        .from('groups')
        .select('id, slug, quiz_count'),
      supabase
        .from('profiles')
        .select('username, updated_at')
        .gte('total_quizzes_created', 3)
        .order('total_quizzes_created', { ascending: false })
        .limit(PROFILES_LIMIT),
      supabase
        .from('blind_test_songs')
        .select('groups!inner(slug)')
        .eq('status', 'active')
        .not('clip_chorus', 'is', null)
        .limit(BT_SONG_LIMIT),
      supabase
        .from('games')
        .select('slug, game_type, updated_at')
        .eq('status', 'published')
        .eq('game_type', 'name_all_members')
        .limit(500),
    ]);

    // Dynamic group blind test pages (deduplicated)
    const btGroupSlugs = [
      ...new Set(
        (btSongGroupsResult.data ?? [])
          .map((r) => (r.groups as unknown as { slug: string } | null)?.slug)
          .filter(Boolean) as string[],
      ),
    ];
    blindTestGroupPages = btGroupSlugs.map((slug) => ({
      url: `${SITE_URL}/blind-test/group-${slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    }));

    // Only list `-trivia` URLs for groups that have enough unique fun facts
    // to actually render the page (matches `notFound()` guard in
    // group-trivia-page.tsx). Prevents Google from indexing 404s.
    const triviaEligibleGroupIds = buildTriviaEligibleGroupSet(
      (quizzesResult.data ?? []) as Array<{ group_id: number | null; questions: unknown }>,
    );

    groupPages = (groupsResult.data ?? []).flatMap((g) => {
      const entries: MetadataRoute.Sitemap = [];

      // `-quiz` page renders an empty "be the first" state when quiz_count
      // is 0 - thin content that Google soft-404s. Skip those.
      if ((g.quiz_count ?? 0) > 0) {
        entries.push({
          url: `${SITE_URL}/${g.slug}-quiz`,
          lastModified: new Date(),
          changeFrequency: 'weekly' as const,
          priority: 0.9,
        });
      }

      if (triviaEligibleGroupIds.has(g.id as number)) {
        entries.push({
          url: `${SITE_URL}/${g.slug}-trivia`,
          lastModified: new Date(),
          changeFrequency: 'weekly' as const,
          priority: 0.5,
        });
      }

      return entries;
    });

    quizPages = (quizzesResult.data ?? []).map((q) => ({
      url: `${SITE_URL}/q/${q.slug}`,
      lastModified: new Date(q.updated_at),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }));

    profilePages = (profilesResult.data ?? []).map((p) => ({
      url: `${SITE_URL}/u/${p.username}`,
      lastModified: new Date(p.updated_at),
      changeFrequency: 'weekly' as const,
      priority: 0.4,
    }));

    gamePages = (gamesResult.data ?? []).map((g) => ({
      url: `${SITE_URL}/games/name-all/${g.slug}`,
      lastModified: new Date(g.updated_at),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));
  } catch (err) {
    // Don't 500 the sitemap - log and return whatever we have.
    console.error('[sitemap] dynamic query failed, returning static pages only:', err);
  }

  return [
    ...staticPages,
    ...blindTestModePages,
    ...blindTestGroupPages,
    ...groupPages,
    ...quizPages,
    ...profilePages,
    ...gamePages,
  ];
}
