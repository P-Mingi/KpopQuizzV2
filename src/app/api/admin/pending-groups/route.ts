import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';

export async function GET(): Promise<NextResponse> {
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [pendingRes, allGroupsRes] = await Promise.all([
    supabase
      .from('groups')
      .select('*, quizzes(count)')
      .eq('needs_review', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('groups')
      .select('id, name')
      .eq('needs_review', false)
      .order('name', { ascending: true }),
  ]);

  if (pendingRes.error) {
    return NextResponse.json({ error: 'Failed to fetch pending groups' }, { status: 500 });
  }

  const groups = (pendingRes.data ?? []).map((g: Record<string, unknown>) => {
    const quizzes = g.quizzes as { count: number }[] | null;
    return {
      id: g.id,
      name: g.name,
      slug: g.slug,
      fandom_name: g.fandom_name,
      display_color: g.display_color,
      text_color: g.text_color,
      logo_url: g.logo_url,
      quiz_count: g.quiz_count,
      total_plays: g.total_plays,
      created_at: g.created_at,
      actual_quiz_count: quizzes?.[0]?.count ?? 0,
    };
  });

  const allGroups = (allGroupsRes.data ?? []).map((g: { id: number; name: string }) => ({
    id: g.id,
    name: g.name,
  }));

  return NextResponse.json({ groups, all_groups: allGroups });
}
