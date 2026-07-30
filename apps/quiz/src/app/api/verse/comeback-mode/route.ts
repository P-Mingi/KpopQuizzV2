import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { canCurateSpace } from '@/lib/verse/roles';
import { validatePresentation } from '@/lib/verse/presentation/validate';

import type { NextRequest } from 'next/server';

// V-SPACE-FLOW step 5 - COMEBACK MODE arming (mirrors the live-now toggle).
// POST arms a window (title + start + release, max 45 days, validated); DELETE
// disarms. Patches the LIVE presentation so the event skin shows immediately;
// render-side auto-expiry means a forgotten window stops showing after endsAt.
export const dynamic = 'force-dynamic';

async function guard(groupId: number): Promise<string | null> {
  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  return user && await canCurateSpace(user.id, groupId) ? user.id : null;
}

async function currentPresentation(groupId: number): Promise<Record<string, unknown>> {
  const svc = createServiceRoleClient();
  const { data } = await svc.from('verse_spaces').select('presentation').eq('group_id', groupId).maybeSingle();
  const p = (data as { presentation?: unknown } | null)?.presentation;
  const base = p && typeof p === 'object' ? { ...(p as Record<string, unknown>) } : {};
  base.version = 1;
  return base;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  const groupId = Number(body.group_id);
  if (!groupId) return NextResponse.json({ error: 'bad_params' }, { status: 400 });
  const uid = await guard(groupId);
  if (!uid) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  const next = await currentPresentation(groupId);
  next.comebackMode = {
    title: String(body.title ?? ''),
    startsAt: String(body.startsAt ?? new Date().toISOString()),
    endsAt: String(body.endsAt ?? ''),
    ...(body.pinKind ? { pinKind: String(body.pinKind) } : {}),
  };
  const result = validatePresentation(next);
  if (!result.ok) return NextResponse.json({ ok: false, errors: result.errors }, { status: 422 });

  const svc = createServiceRoleClient();
  const { error } = await svc.from('verse_spaces').upsert({ group_id: groupId, presentation: result.value, updated_at: new Date().toISOString() }, { onConflict: 'group_id' });
  if (error) return NextResponse.json({ ok: false, errors: [error.message] }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const groupId = Number(new URL(req.url).searchParams.get('group_id'));
  if (!groupId) return NextResponse.json({ error: 'bad_params' }, { status: 400 });
  const uid = await guard(groupId);
  if (!uid) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  const next = await currentPresentation(groupId);
  delete next.comebackMode;
  const result = validatePresentation(next);
  if (!result.ok) return NextResponse.json({ ok: false, errors: result.errors }, { status: 422 });
  const svc = createServiceRoleClient();
  const { error } = await svc.from('verse_spaces').upsert({ group_id: groupId, presentation: result.value, updated_at: new Date().toISOString() }, { onConflict: 'group_id' });
  if (error) return NextResponse.json({ ok: false, errors: [error.message] }, { status: 500 });
  return NextResponse.json({ ok: true });
}
