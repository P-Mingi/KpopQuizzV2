import { createServiceRoleClient } from '@/lib/supabase/server';
import { STATIC_MODES } from '@/lib/blind-test-modes';

import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createServiceRoleClient();
  const siteUrl = 'https://kpopquiz.org';

  const [quizzesResult, groupsResult, profilesResult, btSongGroupsResult] = await Promise.all([
    supabase
      .from('quizzes')
      .select('slug, updated_at')
      .eq('status', 'published')
      .order('updated_at', { ascending: false }),
    supabase
      .from('groups')
      .select('slug, quiz_count'),
    supabase
      .from('profiles')
      .select('username, updated_at')
      .gte('total_quizzes_created', 3),
    supabase
      .from('blind_test_songs')
      .select('groups!inner(slug)')
      .eq('status', 'active')
      .not('clip_chorus', 'is', null),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${siteUrl}/trending`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${siteUrl}/new`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${siteUrl}/most-liked`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${siteUrl}/easy-kpop-quizzes`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${siteUrl}/hard-kpop-quizzes`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${siteUrl}/kpop-quiz-2026`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${siteUrl}/guess-the-kpop-idol`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    { url: `${siteUrl}/kpop-true-or-false`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    { url: `${siteUrl}/blind-test`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${siteUrl}/terms`, lastModified: new Date('2026-03-27'), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${siteUrl}/privacy`, lastModified: new Date('2026-03-27'), changeFrequency: 'yearly', priority: 0.3 },
  ];

  // Static blind test mode pages
  const blindTestModePages: MetadataRoute.Sitemap = STATIC_MODES.map(mode => ({
    url: `${siteUrl}/blind-test/${mode.id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  // Dynamic group blind test pages
  const btGroupSlugs = [...new Set(
    (btSongGroupsResult.data ?? [])
      .map(r => (r.groups as unknown as { slug: string } | null)?.slug)
      .filter(Boolean) as string[]
  )];
  const blindTestGroupPages: MetadataRoute.Sitemap = btGroupSlugs.map(slug => ({
    url: `${siteUrl}/blind-test/group-${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.5,
  }));

  const groupPages: MetadataRoute.Sitemap = (groupsResult.data ?? []).flatMap((g) => [
    {
      url: `${siteUrl}/${g.slug}-quiz`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: `${siteUrl}/${g.slug}-trivia`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    },
  ]);

  const quizPages: MetadataRoute.Sitemap = (quizzesResult.data ?? []).map((q) => ({
    url: `${siteUrl}/q/${q.slug}`,
    lastModified: new Date(q.updated_at),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  const profilePages: MetadataRoute.Sitemap = (profilesResult.data ?? []).map((p) => ({
    url: `${siteUrl}/u/${p.username}`,
    lastModified: new Date(p.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.4,
  }));

  return [...staticPages, ...blindTestModePages, ...blindTestGroupPages, ...groupPages, ...quizPages, ...profilePages];
}
