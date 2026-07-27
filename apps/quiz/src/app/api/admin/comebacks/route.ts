import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';

// Workstream T1.5: create a comeback calendar entry (admin-only, service-role).

export interface ComebackInput {
  group_id: number | null;
  artist: string;
  title: string;
  release_date: string; // YYYY-MM-DD
  kind: 'single' | 'ep' | 'album' | 'mv';
  active: boolean;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const KINDS = ['single', 'ep', 'album', 'mv'] as const;

export function parseComeback(body: unknown): { row: ComebackInput } | { error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const artist = typeof b.artist === 'string' ? b.artist.trim() : '';
  const title = typeof b.title === 'string' ? b.title.trim() : '';
  const release_date = typeof b.release_date === 'string' ? b.release_date.trim() : '';
  const group_id = b.group_id === null || b.group_id === undefined || b.group_id === '' ? null : Number(b.group_id);
  const kind = (KINDS as readonly string[]).includes(b.kind as string) ? (b.kind as ComebackInput['kind']) : 'single';
  const active = typeof b.active === 'boolean' ? b.active : true;

  if (!artist || artist.length > 100) return { error: 'artist is required (<= 100 chars)' };
  if (!title || title.length > 200) return { error: 'title is required (<= 200 chars)' };
  if (!DATE_RE.test(release_date)) return { error: 'release_date must be YYYY-MM-DD' };
  if (group_id !== null && !Number.isInteger(group_id)) return { error: 'group_id must be an integer or empty' };

  return { row: { group_id, artist, title, release_date, kind, active } };
}

export async function POST(request: Request): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.id)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = parseComeback(body);
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const svc = createServiceRoleClient();
  const { data, error } = await svc.from('comebacks').insert(parsed.row).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, id: data.id });
}
