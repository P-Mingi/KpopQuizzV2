import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';

// Workstream T1.5: create a tracked MV (admin-only, service-role write).

export interface MvInput {
  video_id: string;
  title: string;
  artist: string;
  group_id: number | null;
  category: 'comeback' | 'evergreen';
  active: boolean;
}

const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

export function parseMv(body: unknown): { row: MvInput } | { error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const video_id = typeof b.video_id === 'string' ? b.video_id.trim() : '';
  const title = typeof b.title === 'string' ? b.title.trim() : '';
  const artist = typeof b.artist === 'string' ? b.artist.trim() : '';
  const group_id = b.group_id === null || b.group_id === undefined || b.group_id === '' ? null : Number(b.group_id);
  const category = b.category === 'comeback' ? 'comeback' : 'evergreen';
  const active = typeof b.active === 'boolean' ? b.active : true;

  if (!VIDEO_ID_RE.test(video_id)) return { error: 'video_id must be an 11-char YouTube id' };
  if (!title || title.length > 200) return { error: 'title is required (<= 200 chars)' };
  if (!artist || artist.length > 100) return { error: 'artist is required (<= 100 chars)' };
  if (group_id !== null && !Number.isInteger(group_id)) return { error: 'group_id must be an integer or empty' };

  return { row: { video_id, title, artist, group_id, category, active } };
}

export async function POST(request: Request): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.id)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = parseMv(body);
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const svc = createServiceRoleClient();
  const { data, error } = await svc.from('mv_tracking').insert(parsed.row).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, id: data.id });
}
