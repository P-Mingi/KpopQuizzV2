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

  try {
    const supabase = createServiceRoleClient();

    const [quizzesResult, groupsResult, profilesResult, btSongGroupsResult] = await Promise.all([
      supabase
        .from('quizzes')
        .select('slug, updated_at')
        .eq('status', 'published')
        .order('updated_at', { ascending: false })
        .limit(QUIZZES_LIMIT),
      supabase
        .from('groups')
        .select('slug, quiz_count'),
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

    groupPages = (groupsResult.data ?? []).flatMap((g) => [
      {
        url: `${SITE_URL}/${g.slug}-quiz`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.9,
      },
      {
        url: `${SITE_URL}/${g.slug}-trivia`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.5,
      },
    ]);

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
  ];
}
