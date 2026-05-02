import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = createServiceRoleClient();
  const { quiz_slug } = await req.json();

  // Get quiz data
  const { data: quiz } = await db
    .from('quizzes')
    .select('id, slug, title, quiz_type, play_count, groups(name, slug, display_color, logo_url)')
    .eq('slug', quiz_slug)
    .single();

  if (!quiz) {
    return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
  }

  const groupsArr = quiz.groups as unknown as Array<{ name: string; slug: string; display_color: string; logo_url: string | null }> | null;
  const groups = groupsArr?.[0] ?? null;

  // Generate the OG image URL as the pin image
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kpopquiz.org';
  const pinImageUrl = `${siteUrl}/api/og/${quiz.slug}`;

  // Upsert into pinterest_originals
  const { error } = await db
    .from('pinterest_originals')
    .upsert({
      quiz_id: quiz.id,
      quiz_slug: quiz.slug,
      quiz_title: quiz.title as string,
      quiz_type: quiz.quiz_type as string,
      group_tag: groups?.name ?? null,
      pin_image_url: pinImageUrl,
      status: 'generated',
    }, { onConflict: 'quiz_slug' });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, pin_image_url: pinImageUrl });
}
