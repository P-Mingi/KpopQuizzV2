import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { canCurateSpace } from '@/lib/verse/roles';
import { underRateCap } from '@/lib/verse/moderation';
import { idolSlug } from '@/lib/verse/slug';

import type { NextRequest } from 'next/server';

// V-BUILDER-3 step 4 (members editor, governance contract L-068): the curator-facing
// roster rail for the members block. The roster is the core `idols` table, so every
// write here is governed:
//   CREATE  -> insert idol { origin:'curator', created_by, needs_review:true,
//              review_reason:'curator-created', active:false }. Page exists but 404s
//              (getIdol filters active) until an admin approves. Never fabricated data.
//   ATTACH  -> re-attach THIS group's curator-detached idol (detached_at NOT NULL):
//              active=true, detached_at=NULL. No cross-group attach. Legacy inactive
//              idols (detached_at NULL) are never touched.
//   DETACH  -> active=false, detached_at=now(). Row + page data survive (real-data law).
// Order + per-member overrides live in the presentation draft, NOT here.
export const dynamic = 'force-dynamic';

const CREATE_WINDOW_SEC = 24 * 3600;
const CREATE_MAX_PER_DAY = 50;

async function callerId(): Promise<string | null> {
  const c = await createServerClient();
  const { data: { user } } = await c.auth.getUser();
  return user?.id ?? null;
}

// GET ?group_id=N -> { roster: active members, detached: this group's curator-detached
// idols (re-attach candidates) }. Curator-gated (the builder is not public).
export async function GET(req: NextRequest): Promise<NextResponse> {
  const groupId = Number(new URL(req.url).searchParams.get('group_id') ?? 0);
  if (!groupId) return NextResponse.json({ error: 'A space is required.' }, { status: 400 });
  const uid = await callerId();
  if (!uid || !await canCurateSpace(uid, groupId)) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  const svc = createServiceRoleClient();
  const [{ data: active }, { data: detached }, { data: pending }] = await Promise.all([
    svc.from('idols').select('id, name, name_hangul, photo_url, ord').eq('group_id', groupId).eq('active', true).order('ord'),
    svc.from('idols').select('id, name, name_hangul, photo_url').eq('group_id', groupId).eq('active', false).not('detached_at', 'is', null).order('name'),
    svc.from('idols').select('id, name, name_hangul, photo_url').eq('group_id', groupId).eq('active', false).eq('origin', 'curator').eq('needs_review', true).is('detached_at', null).order('name'),
  ]);
  const shape = (r: Record<string, unknown>) => ({ id: Number(r.id), name: String(r.name), nameHangul: (r.name_hangul as string | null) ?? null, photoUrl: (r.photo_url as string | null) ?? null, slug: idolSlug(String(r.name)) });
  return NextResponse.json({
    roster: ((active ?? []) as Record<string, unknown>[]).map(shape),
    detached: ((detached ?? []) as Record<string, unknown>[]).map(shape),
    pending: ((pending ?? []) as Record<string, unknown>[]).map(shape),
  });
}

// POST { group_id, action:'create'|'attach'|'detach', ... } - immediate, governed writes.
export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Bad request.' }, { status: 400 }); }
  const groupId = Number(body.group_id ?? 0);
  const action = String(body.action ?? '');
  if (!groupId) return NextResponse.json({ error: 'A space is required.' }, { status: 400 });

  const uid = await callerId();
  if (!uid || !await canCurateSpace(uid, groupId)) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  const svc = createServiceRoleClient();

  if (action === 'create') {
    const name = String(body.name ?? '').trim().slice(0, 60);
    if (name.length < 1) return NextResponse.json({ error: 'A name is required.' }, { status: 400 });
    if (!await underRateCap('idols', 'created_by', uid, CREATE_WINDOW_SEC, CREATE_MAX_PER_DAY)) {
      return NextResponse.json({ error: 'Daily new-member limit reached. Try again tomorrow.' }, { status: 429 });
    }
    const slug = idolSlug(name);
    // No silent duplicates: an ACTIVE member with the same slug is already on the roster;
    // a DETACHED one should be re-attached, not re-created.
    const { data: existing } = await svc.from('idols').select('id, name, active, detached_at').eq('group_id', groupId);
    for (const e of ((existing ?? []) as Array<{ id: number; name: string; active: boolean; detached_at: string | null }>)) {
      if (idolSlug(e.name) !== slug) continue;
      if (e.active) return NextResponse.json({ error: `${name} is already a member of this space.`, id: e.id }, { status: 409 });
      if (e.detached_at) return NextResponse.json({ error: `${name} was detached earlier. Re-attach it instead of creating a duplicate.`, id: e.id, canReattach: true }, { status: 409 });
    }
    const { data: maxRow } = await svc.from('idols').select('ord').eq('group_id', groupId).order('ord', { ascending: false }).limit(1).maybeSingle();
    const nextOrd = (((maxRow as { ord: number | null } | null)?.ord) ?? 0) + 1;
    const { data: ins, error } = await svc.from('idols').insert({
      group_id: groupId, name, origin: 'curator', created_by: uid,
      needs_review: true, review_reason: 'curator-created', active: false, ord: nextOrd,
    }).select('id, name').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const row = ins as { id: number; name: string };
    return NextResponse.json({ ok: true, id: row.id, name: row.name, slug, pending: true });
  }

  if (action === 'attach') {
    const idolId = Number(body.idol_id ?? 0);
    if (!idolId) return NextResponse.json({ error: 'Which member?' }, { status: 400 });
    // Only THIS group's own curator-detached idol may be re-attached.
    const { data: idol } = await svc.from('idols').select('id, group_id, detached_at').eq('id', idolId).maybeSingle();
    const i = idol as { id: number; group_id: number; detached_at: string | null } | null;
    if (!i || i.group_id !== groupId || !i.detached_at) {
      return NextResponse.json({ error: 'That member cannot be re-attached here.' }, { status: 409 });
    }
    const { error } = await svc.from('idols').update({ active: true, detached_at: null }).eq('id', idolId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, id: idolId });
  }

  if (action === 'detach') {
    const idolId = Number(body.idol_id ?? 0);
    if (!idolId) return NextResponse.json({ error: 'Which member?' }, { status: 400 });
    const { data: idol } = await svc.from('idols').select('id, group_id, active').eq('id', idolId).maybeSingle();
    const i = idol as { id: number; group_id: number; active: boolean } | null;
    if (!i || i.group_id !== groupId || !i.active) {
      return NextResponse.json({ error: 'That member is not on this roster.' }, { status: 409 });
    }
    const { error } = await svc.from('idols').update({ active: false, detached_at: new Date().toISOString() }).eq('id', idolId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, id: idolId });
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}
