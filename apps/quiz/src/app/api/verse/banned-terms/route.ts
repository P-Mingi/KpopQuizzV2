import { NextResponse } from 'next/server';

import { verseWriteGate } from '@/lib/verse/api-gate';
import { requireAdmin } from '@/lib/admin/guard';
import { createServiceRoleClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';

// W4.8 - manage the banned-terms list. Global-admin only (the list is site-wide). GET list,
// POST add, DELETE remove. ADMIN-1: requireAdmin('api'); anyone else gets the admin 404.
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const gate = await requireAdmin('api');
  if (!gate.ok) return gate.res;
  const svc = createServiceRoleClient();
  const { data } = await svc.from('verse_banned_terms').select('id, term, action, note, created_at').order('created_at', { ascending: false });
  return NextResponse.json({ terms: data ?? [] });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const gated = await verseWriteGate(req);
  if (gated) return gated;
  const gate = await requireAdmin('api');
  if (!gate.ok) return gate.res;
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
  const gated = await verseWriteGate(req);
  if (gated) return gated;
  const gate = await requireAdmin('api');
  if (!gate.ok) return gate.res;
  const id = Number(new URL(req.url).searchParams.get('id'));
  if (!id) return NextResponse.json({ error: 'bad_params' }, { status: 400 });
  const svc = createServiceRoleClient();
  await svc.from('verse_banned_terms').delete().eq('id', id);
  return NextResponse.json({ ok: true });
}
