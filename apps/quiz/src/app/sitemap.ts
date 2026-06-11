import { createServiceRoleClient } from '@/lib/supabase/server';
import { STATIC_MODES } from '@/lib/blind-test-modes';
import { buildOverriddenFacts, type FactSourceQuiz } from '@/lib/trivia/facts';
import { TRIVIA_MIN_FACTS } from '@/lib/db/queries/trivia';

import type { MetadataRoute } from 'next';

const SITE_URL = 'https://kpopquiz.org';

// Caps to prevent timeouts as the dataset grows. Google's sitemap limit is
// 50,000 URLs per file, so anything above these values should eventually be
// split into sub-sitemaps. For now a safe ceiling.
const QUIZZES_LIMIT = 10000;
const PROFILES_LIMIT = 500;
const BT_SONG_LIMIT = 5000;

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
  // Static pages - always returned, even if every dynamic query fails.
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE_URL}/quizzes`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/trending`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/new`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/most-liked`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/trivia`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/leaderboard`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/easy-kpop-quizzes`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/hard-kpop-quizzes`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/kpop-quiz-2026`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/guess-the-kpop-idol`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/kpop-true-or-false`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/blind-test`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/games`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/games/this-or-that`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/games/name-all`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/faq`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/contact`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
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

    const [quizzesResult, groupsResult, profilesResult, btSongGroupsResult, gamesResult, totCategoriesResult] = await Promise.all([
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
      supabase
        .from('tot_categories')
        .select('slug, created_at')
        .eq('is_published', true)
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
    // to actually render the page (matches the `notFound()` gate in
    // [slug]/page.tsx). Prevents Google from indexing 404s.
    const slugByGroupId = new Map<number, string>(
      (groupsResult.data ?? []).map((g) => [g.id as number, g.slug as string]),
    );
    const triviaEligibleGroupIds = buildTriviaEligibleGroupSet(
      (quizzesResult.data ?? []) as Array<{ group_id: number | null; slug: string; questions: unknown }>,
      slugByGroupId,
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

    gamePages = [
      ...(gamesResult.data ?? []).map((g) => ({
        url: `${SITE_URL}/games/name-all/${g.slug}`,
        lastModified: new Date(g.updated_at),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      })),
      ...(totCategoriesResult.data ?? []).map((c) => ({
        url: `${SITE_URL}/games/this-or-that/${c.slug}`,
        lastModified: new Date(c.created_at),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      })),
    ];
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
