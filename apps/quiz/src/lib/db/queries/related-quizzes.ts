import { unstable_cache } from 'next/cache';

import { createPublicReadClient } from '@/lib/supabase/server';
import { CACHE_TTL } from '@/lib/db/cache-policy';

export interface RelatedQuiz {
  id: string;
  title: string;
  slug: string;
  play_count: number;
  difficulty: string;
  group_name: string;
  group_slug: string;
  group_logo_url: string | null;
  group_text_color: string;
}

// FREE-VIABILITY: the "Fans also play" rail on every group hub. Was on the cookie
// client (forced the hub dynamic); it is a public read (top quiz per related
// group, same for everyone), so it moves cookie-free + cached. The array arg is
// part of the cache key, so each hub's fixed related-set is one stable entry.
export const getRelatedQuizzes = unstable_cache(
  fetchRelatedQuizzes,
  ['db:related-quizzes:getRelatedQuizzes:v1'],
  { revalidate: CACHE_TTL.catalog, tags: ['quizzes'] },
);

async function fetchRelatedQuizzes(groupSlugs: string[]): Promise<RelatedQuiz[]> {
  if (groupSlugs.length === 0) return [];

  const supabase = createPublicReadClient();

  const results = await Promise.all(
    groupSlugs.map(async (slug) => {
      const { data } = await supabase
        .from('quizzes')
        .select('id, title, slug, play_count, difficulty, groups!inner(name, slug, logo_url, text_color)')
        .eq('groups.slug', slug)
        .eq('status', 'published')
        .order('play_count', { ascending: false })
        .limit(1)
        .single();
      return data;
    })
  );

  return results
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .map((row) => {
      const group = row.groups as unknown as { name: string; slug: string; logo_url: string | null; text_color: string };
      return {
        id: row.id,
        title: row.title,
        slug: row.slug,
        play_count: row.play_count,
        difficulty: row.difficulty,
        group_name: group.name,
        group_slug: group.slug,
        group_logo_url: group.logo_url,
        group_text_color: group.text_color,
      };
    });
}
