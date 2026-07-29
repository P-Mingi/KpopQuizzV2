import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';

import type { NextRequest } from 'next/server';

// W4.8 - manage the banned-terms list. Global-admin only (the list is site-wide). GET list,
// POST add, DELETE remove.
export const dynamic = 'force-dynamic';

async function requireAdmin(): Promise<boolean> {
  const c = await createServerClient();
  const { data: { user } } = await c.auth.getUser();
  return !!user && isAdmin(user.id);
}

export async function GET(): Promise<NextResponse> {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  const svc = createServiceRoleClient();
  const { data } = await svc.from('verse_banned_terms').select('id, term, action, note, created_at').order('created_at', { ascending: false });
  return NextResponse.json({ terms: data ?? [] });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  const term = String(body.term ?? '').trim().toLowerCase();
  const action = body.action === 'block' ? 'block' : 'flag';
  if (term.length < 2) return NextResponse.json({ error: 'too_short' }, { status: 400 });
  const svc = createServiceRoleClient();
  const { error } = await svc.from('verse_banned_terms').upsert({ term, action, note: body.note ? String(body.note).slice(0, 200) : null }, { onConflict: 'term' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  const id = Number(new URL(req.url).searchParams.get('id'));
  if (!id) return NextResponse.json({ error: 'bad_params' }, { status: 400 });
  const svc = createServiceRoleClient();
  await svc.from('verse_banned_terms').delete().eq('id', id);
  return NextResponse.json({ ok: true });
}
