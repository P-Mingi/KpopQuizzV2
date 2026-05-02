import { NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';

export async function GET(): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = createServiceRoleClient();

  // Get published quizzes and match with existing pinterest_originals
  const { data: quizzes } = await db
    .from('quizzes')
    .select('id, slug, title, quiz_type, groups(name)')
    .eq('status', 'published')
    .order('play_count', { ascending: false })
    .limit(50);

  const { data: originals } = await db
    .from('pinterest_originals')
    .select('*');

  const originalsMap = new Map((originals ?? []).map(o => [o.quiz_slug, o]));

  const result = (quizzes ?? []).map((q: Record<string, unknown>) => {
    const groups = q.groups as { name: string } | null;
    const existing = originalsMap.get(q.slug as string);
    return {
      quiz_slug: q.slug,
      quiz_title: q.title,
      quiz_type: q.quiz_type,
      group_tag: groups?.name ?? null,
      pin_image_url: existing?.pin_image_url ?? null,
      status: existing?.status ?? 'pending',
    };
  });

  return NextResponse.json(result);
}
