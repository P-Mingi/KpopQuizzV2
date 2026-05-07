import { createServerClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { NextResponse } from 'next/server';

/** GET: list questions (own for users, all pending for admins) */
export async function GET(req: Request): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const filter = url.searchParams.get('filter') ?? 'all';
  const admin = isAdmin(user.id);

  // Admins can see pending questions for moderation
  if (admin && filter === 'pending') {
    const svc = createServiceRoleClient();
    const { data } = await svc
      .from('battle_questions')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    return NextResponse.json(data ?? []);
  }

  // Regular users see their own questions
  let query = supabase
    .from('battle_questions')
    .select('*')
    .eq('submitter_user_id', user.id)
    .order('created_at', { ascending: false });

  if (filter !== 'all') {
    query = query.eq('status', filter);
  }

  const { data } = await query;
  return NextResponse.json(data ?? []);
}

/** POST: create a new question */
export async function POST(req: Request): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { prompt, text_content, image_url, answer, variants, group_name, difficulty, status } = body;

  if (!prompt || !answer || !group_name || !difficulty) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (!text_content && !image_url) {
    return NextResponse.json({ error: 'At least one of text_content or image_url is required' }, { status: 400 });
  }

  const submitStatus = status === 'draft' ? 'draft' : 'pending';

  const { data, error } = await supabase
    .from('battle_questions')
    .insert({
      prompt,
      text_content: text_content || null,
      image_url: image_url || null,
      answer,
      variants: variants ?? [],
      group_name,
      difficulty,
      status: submitStatus,
      submitter_user_id: user.id,
    })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, status: submitStatus });
}
