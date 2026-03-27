import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';

import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.title || !body.youtube_id || !body.year) {
    return NextResponse.json({ error: 'Title, YouTube ID, and year are required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('blind_test_songs')
    .insert({
      title: body.title,
      artist: body.artist || '',
      group_id: body.group_id || null,
      youtube_id: body.youtube_id,
      year: body.year,
      is_title_track: body.is_title_track ?? true,
      gender: body.gender || 'mixed',
      generation: body.generation || null,
      clip_intro: body.clip_intro ?? null,
      clip_chorus: body.clip_chorus ?? null,
      clip_verse: body.clip_verse ?? null,
      clip_bridge: body.clip_bridge ?? null,
      wrong_answers: body.wrong_answers || [],
      status: body.status || 'active',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
