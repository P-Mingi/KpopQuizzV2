import { NextResponse } from 'next/server';

import { adminNotFound, requireAdmin } from '@/lib/admin/guard';
import { createServiceRoleClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const gate = await requireAdmin('api');
  if (!gate.ok) return gate.res;
  // ADMIN-1: written with the service role, only after requireAdmin (the open write policies of blind_test_songs are closing).
  const db = createServiceRoleClient();

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.title || !body.youtube_id || !body.year) {
    return NextResponse.json({ error: 'Title, YouTube ID, and year are required' }, { status: 400 });
  }

  const { data, error } = await db
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

// ADMIN-1: a method this route does not implement is the admin 404 too (Next would answer 405 and name the real ones).
export const GET = adminNotFound;
export const PUT = adminNotFound;
export const PATCH = adminNotFound;
export const DELETE = adminNotFound;
export const HEAD = adminNotFound;
export const OPTIONS = adminNotFound;
