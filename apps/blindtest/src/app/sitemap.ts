import { createServiceRoleClient } from '@kpopquiz/shared/supabase/server';
import { STATIC_MODES } from '@/lib/blind-test-modes';

import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kpopblindtest.com';
  const supabase = createServiceRoleClient();

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: 'daily', priority: 1.0, lastModified: new Date() },
    { url: `${baseUrl}/daily`, changeFrequency: 'daily', priority: 0.9, lastModified: new Date() },
    { url: `${baseUrl}/leaderboard`, changeFrequency: 'daily', priority: 0.7, lastModified: new Date() },
    { url: `${baseUrl}/login`, changeFrequency: 'monthly', priority: 0.3, lastModified: new Date() },
  ];

  const modePages: MetadataRoute.Sitemap = STATIC_MODES.map(m => ({
    url: `${baseUrl}/play/${m.id}`,
    changeFrequency: 'weekly',
    priority: 0.6,
    lastModified: new Date(),
  }));

  const { data: groups } = await supabase.from('groups').select('slug');
  const groupPages: MetadataRoute.Sitemap = (groups ?? []).map(g => ({
    url: `${baseUrl}/group/${g.slug}`,
    changeFrequency: 'weekly',
    priority: 0.5,
    lastModified: new Date(),
  }));

  return [...staticPages, ...modePages, ...groupPages];
}
