import { createServiceRoleClient } from '@/lib/supabase/server';

import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createServiceRoleClient();
  const siteUrl = 'https://kpopquiz.org';

  const [quizzesResult, groupsResult, profilesResult] = await Promise.all([
    supabase
      .from('quizzes')
      .select('slug, updated_at')
      .eq('status', 'published')
      .order('updated_at', { ascending: false }),
    supabase
      .from('groups')
      .select('slug')
      .gt('quiz_count', 0),
    supabase
      .from('profiles')
      .select('username, updated_at')
      .gte('total_quizzes_created', 3),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${siteUrl}/trending`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${siteUrl}/new`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${siteUrl}/most-liked`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${siteUrl}/terms`, lastModified: new Date('2026-03-27'), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${siteUrl}/privacy`, lastModified: new Date('2026-03-27'), changeFrequency: 'yearly', priority: 0.3 },
  ];

  const groupPages: MetadataRoute.Sitemap = (groupsResult.data ?? []).map((g) => ({
    url: `${siteUrl}/group/${g.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

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

  return [...staticPages, ...groupPages, ...quizPages, ...profilePages];
}
