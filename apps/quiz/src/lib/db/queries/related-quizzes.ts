import { createServerClient } from '@/lib/supabase/server';

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

export async function getRelatedQuizzes(groupSlugs: string[]): Promise<RelatedQuiz[]> {
  if (groupSlugs.length === 0) return [];

  const supabase = await createServerClient();

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
