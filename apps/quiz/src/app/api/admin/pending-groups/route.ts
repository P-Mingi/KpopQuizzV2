import { NextResponse } from 'next/server';

import { adminNotFound, requireAdmin } from '@/lib/admin/guard';

export async function GET(): Promise<NextResponse> {
  const gate = await requireAdmin('api');
  if (!gate.ok) return gate.res;
  const { supabase } = gate;

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

// ADMIN-1: a method this route does not implement is the admin 404 too (Next would answer 405 and name the real ones).
export const POST = adminNotFound;
export const PUT = adminNotFound;
export const PATCH = adminNotFound;
export const DELETE = adminNotFound;
export const HEAD = adminNotFound;
export const OPTIONS = adminNotFound;
