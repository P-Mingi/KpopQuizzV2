import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { canCurateSpace, getSpaceRole, roleAtLeast } from '@/lib/verse/roles';
import { getPhotocards } from '@/lib/verse/photocards';
import { isConfiguredImageHost } from '@/lib/image-hosts';

import type { NextRequest } from 'next/server';

// W5.2 / V-CARDS-MAX step 6 - photocard catalog. GET is public (published cards);
// GET ?scope=review returns the curator's draft queue. Contributors SUBMIT drafts;
// curators publish. Publishing is source-gated (fact-without-source rejected), the
// same covenant as every other catalog write. Images stay strict-legal.
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
  const url = new URL(req.url);
  const groupId = Number(url.searchParams.get('group_id'));
  if (!groupId) return NextResponse.json({ error: 'bad_params' }, { status: 400 });

  // Curator review queue: the pending (draft) submissions, newest first.
  if (url.searchParams.get('scope') === 'review') {
    const supa = await createServerClient();
    const { data: { user } } = await supa.auth.getUser();
    if (!user || !await canCurateSpace(user.id, groupId)) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    const { data } = await createServiceRoleClient().from('photocards')
      .select('id, name, card_type, era, version, source_url, source_note, created_by, created_at')
      .eq('group_id', groupId).eq('status', 'draft').order('created_at', { ascending: false });
    return NextResponse.json({ drafts: data ?? [] });
  }
  return NextResponse.json({ cards: await getPhotocards(groupId) });
}

/** The caller's effective role in a space (visitor if signed out). */
async function roleOf(groupId: number): Promise<{ uid: string | null; role: string }> {
  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return { uid: null, role: 'visitor' };
  return { uid: user.id, role: await getSpaceRole(user.id, groupId) };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  const groupId = Number(body.group_id);
  if (!groupId) return NextResponse.json({ error: 'bad_params' }, { status: 400 });
  const { uid, role } = await roleOf(groupId);
  // Contributors and up may SUBMIT (as drafts); only curators may PUBLISH.
  if (!uid || !roleAtLeast(role as never, 'contributor')) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  const patch = fields(body);
  if (!patch.name) return NextResponse.json({ error: 'name_required' }, { status: 400 });

  const wantPublish = body.publish === true;
  if (wantPublish) {
    if (!roleAtLeast(role as never, 'curator')) return NextResponse.json({ error: 'publish_needs_curator' }, { status: 403 });
    if (!patch.source_url) return NextResponse.json({ error: 'source_required' }, { status: 400 });
  }
  const svc = createServiceRoleClient();
  const { data, error } = await svc.from('photocards').insert({ ...patch, group_id: groupId, status: wantPublish ? 'published' : 'draft', created_by: uid }).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id, status: wantPublish ? 'published' : 'draft' });
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  const id = Number(body.id);
  if (!id) return NextResponse.json({ error: 'bad_params' }, { status: 400 });
  const svc = createServiceRoleClient();
  const { data: cur } = await svc.from('photocards').select('group_id, source_url').eq('id', id).maybeSingle();
  const row = cur as { group_id: number; source_url: string | null } | null;
  if (!row || !await canCurateSpace((await roleOf(row.group_id)).uid ?? '', row.group_id)) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  const patch = fields(body);
  if (body.status === 'published' || body.status === 'draft') patch.status = body.status;
  // Publishing is source-gated: the resulting record must carry a source.
  if (patch.status === 'published') {
    const src = ('source_url' in patch ? patch.source_url : row.source_url) as string | null;
    if (!src) return NextResponse.json({ error: 'source_required' }, { status: 400 });
  }
  patch.updated_at = new Date().toISOString();
  const { error } = await svc.from('photocards').update(patch).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const id = Number(new URL(req.url).searchParams.get('id'));
  if (!id) return NextResponse.json({ error: 'bad_params' }, { status: 400 });
  const svc = createServiceRoleClient();
  const { data: cur } = await svc.from('photocards').select('group_id').eq('id', id).maybeSingle();
  const gid = (cur as { group_id: number } | null)?.group_id;
  if (!gid || !await canCurateSpace((await roleOf(gid)).uid ?? '', gid)) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  const { error } = await svc.from('photocards').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
