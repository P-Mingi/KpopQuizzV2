import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { canCurateSpace } from '@/lib/verse/roles';
import { validatePresentation } from '@/lib/verse/presentation/validate';

import type { NextRequest } from 'next/server';

// W-CUSTOM step 7 - the LIVE NOW curator toggle (the chosen fallback; a quota-cheap
// YouTube live check is not feasible - search.list costs 100 units/call). POST sets
// presentation.liveNow with a hard 12h max expiry; DELETE clears it. Patches the
// LIVE presentation so "we are live" shows on the public page immediately. Auto-
// expiry at render means a forgotten toggle stops showing after expiresAt.
export const dynamic = 'force-dynamic';
const MAX_MINUTES = 12 * 60;

async function guard(groupId: number): Promise<string | null> {
  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  return user && await canCurateSpace(user.id, groupId) ? user.id : null;
}

async function currentLive(groupId: number): Promise<Record<string, unknown>> {
  const svc = createServiceRoleClient();
  const { data } = await svc.from('verse_spaces').select('presentation').eq('group_id', groupId).maybeSingle();
  const p = (data as { presentation?: unknown } | null)?.presentation;
  const base = p && typeof p === 'object' ? { ...(p as Record<string, unknown>) } : {};
  base.version = 1; // an unconfigured space stores {} - LIVE NOW must not require a full config
  return base;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  const groupId = Number(body.group_id);
  const url = String(body.url ?? '');
  if (!groupId || !url) return NextResponse.json({ error: 'bad_params' }, { status: 400 });
  const uid = await guard(groupId);
  if (!uid) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  const minutes = Math.min(Math.max(Number(body.minutes ?? MAX_MINUTES), 5), MAX_MINUTES);
  const next = await currentLive(groupId);
  next.liveNow = { url, expiresAt: new Date(Date.now() + minutes * 60_000).toISOString(), ...(body.label ? { label: String(body.label) } : {}) };

  const result = validatePresentation(next);
  if (!result.ok) return NextResponse.json({ ok: false, errors: result.errors }, { status: 422 });

  const svc = createServiceRoleClient();
  const { error } = await svc.from('verse_spaces').upsert({ group_id: groupId, presentation: result.value, updated_at: new Date().toISOString() }, { onConflict: 'group_id' });
  if (error) return NextResponse.json({ ok: false, errors: [error.message] }, { status: 500 });
  return NextResponse.json({ ok: true, expiresAt: (result.value!.liveNow as { expiresAt: string }).expiresAt });
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const groupId = Number(new URL(req.url).searchParams.get('group_id'));
  if (!groupId) return NextResponse.json({ error: 'bad_params' }, { status: 400 });
  const uid = await guard(groupId);
  if (!uid) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  const next = await currentLive(groupId);
  delete next.liveNow;
  const result = validatePresentation(next);
  const svc = createServiceRoleClient();
  await svc.from('verse_spaces').upsert({ group_id: groupId, presentation: result.ok ? result.value : { version: 1 }, updated_at: new Date().toISOString() }, { onConflict: 'group_id' });
  return NextResponse.json({ ok: true });
}
