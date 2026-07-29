import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { canCurateSpace } from '@/lib/verse/roles';
import { getPhotocards } from '@/lib/verse/photocards';
import { isConfiguredImageHost } from '@/lib/image-hosts';

import type { NextRequest } from 'next/server';

// W5.2 - photocard catalog. GET is public (published cards). POST/PATCH are curator entry;
// images are strict-legal (approved hosts only), otherwise stored null.
export const dynamic = 'force-dynamic';

const CARD_TYPES = ['album', 'pob', 'fansign', 'fanmeeting', 'event', 'trading', 'season_greetings', 'md', 'other'];

function fields(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if ('name' in body) out.name = String(body.name ?? '').trim().slice(0, 160);
  if ('card_type' in body) out.card_type = CARD_TYPES.includes(String(body.card_type)) ? String(body.card_type) : null;
  for (const k of ['era', 'version', 'rarity']) if (k in body) out[k] = body[k] ? String(body[k]).slice(0, 80) : null;
  for (const k of ['idol_id', 'album_id']) if (k in body) { const n = Number(body[k]); out[k] = Number.isFinite(n) && n > 0 ? n : null; }
  if ('source_url' in body) out.source_url = body.source_url ? String(body.source_url).slice(0, 500) : null;
  if ('source_note' in body) out.source_note = body.source_note ? String(body.source_note).slice(0, 300) : null;
  // Strict-legal: keep image_url only if it is an approved host, else drop to null.
  if ('image_url' in body) { const u = String(body.image_url ?? ''); out.image_url = u && isConfiguredImageHost(u) ? u : null; }
  return out;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const groupId = Number(new URL(req.url).searchParams.get('group_id'));
  if (!groupId) return NextResponse.json({ error: 'bad_params' }, { status: 400 });
  return NextResponse.json({ cards: await getPhotocards(groupId) });
}

async function curator(groupId: number): Promise<string | null> {
  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  return user && await canCurateSpace(user.id, groupId) ? user.id : null;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  const groupId = Number(body.group_id);
  if (!groupId) return NextResponse.json({ error: 'bad_params' }, { status: 400 });
  const uid = await curator(groupId);
  if (!uid) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  const patch = fields(body);
  if (!patch.name) return NextResponse.json({ error: 'name_required' }, { status: 400 });
  const svc = createServiceRoleClient();
  const { data, error } = await svc.from('photocards').insert({ ...patch, group_id: groupId, status: body.publish ? 'published' : 'draft', created_by: uid }).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  const id = Number(body.id);
  if (!id) return NextResponse.json({ error: 'bad_params' }, { status: 400 });
  const svc = createServiceRoleClient();
  const { data: cur } = await svc.from('photocards').select('group_id').eq('id', id).maybeSingle();
  const gid = (cur as { group_id: number } | null)?.group_id;
  if (!gid || !await curator(gid)) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  const patch = fields(body);
  if (body.status === 'published' || body.status === 'draft') patch.status = body.status;
  patch.updated_at = new Date().toISOString();
  const { error } = await svc.from('photocards').update(patch).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
