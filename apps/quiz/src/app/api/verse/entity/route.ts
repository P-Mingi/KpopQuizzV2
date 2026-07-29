import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { SCENES } from '@/lib/verse/entity-types';
import { canCurateSpace } from '@/lib/verse/roles';
import { canCurateEntity } from '@/lib/verse/curate';

import type { SceneKind } from '@/lib/verse/entity-types';
import type { NextRequest } from 'next/server';

// W3K.4 / W4.3 - authoring for the new entity types (tours / shows / ost / awards).
// Editors = global admins + per-space curators of the entity's space. Create + edit as
// drafts; publish requires a title and a source (the doorway-page gate). Service-role writes.
export const dynamic = 'force-dynamic';

async function callerId(): Promise<string | null> {
  const c = await createServerClient();
  const { data: { user } } = await c.auth.getUser();
  return user?.id ?? null;
}

function coerce(scene: (typeof SCENES)[SceneKind], input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const title = String(input[scene.titleField] ?? '').trim();
  if (title) out[scene.titleField] = title.slice(0, 200);
  for (const f of scene.fields) {
    if (!(f.key in input)) continue;
    const raw = input[f.key];
    if (raw === '' || raw === null || raw === undefined) { out[f.key] = null; continue; }
    if (f.type === 'number') { const n = Number(raw); if (Number.isFinite(n)) out[f.key] = Math.trunc(n); }
    else if (f.type === 'date') { const s = String(raw).slice(0, 10); if (/^\d{4}-\d{2}-\d{2}$/.test(s)) out[f.key] = s; }
    else if (f.type === 'enum') { if (f.options?.includes(String(raw))) out[f.key] = String(raw); }
    else out[f.key] = String(raw).slice(0, 300);
  }
  if ('source_url' in input) out.source_url = input.source_url ? String(input.source_url).slice(0, 500) : null;
  if ('source_note' in input) out.source_note = input.source_note ? String(input.source_note).slice(0, 300) : null;
  return out;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const uid = await callerId();
  const kind = new URL(req.url).searchParams.get('kind') as SceneKind | null;
  const groupId = Number(new URL(req.url).searchParams.get('group_id'));
  const scene = kind ? SCENES[kind] : null;
  if (!scene || !groupId) return NextResponse.json({ error: 'bad_params' }, { status: 400 });
  if (!await canCurateSpace(uid, groupId)) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  const svc = createServiceRoleClient();
  const { data } = await svc.from(scene.table).select('*').eq('group_id', groupId).order('created_at', { ascending: false });
  return NextResponse.json({ rows: data ?? [] });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const uid = await callerId();
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  const scene = SCENES[body.kind as SceneKind];
  const groupId = Number(body.group_id);
  if (!scene || !groupId) return NextResponse.json({ error: 'bad_params' }, { status: 400 });
  if (!await canCurateSpace(uid, groupId)) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  const patch = coerce(scene, body);
  if (!patch[scene.titleField]) return NextResponse.json({ error: 'title_required' }, { status: 400 });
  const svc = createServiceRoleClient();
  const { data, error } = await svc.from(scene.table).insert({ ...patch, group_id: groupId, status: 'draft' }).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const uid = await callerId();
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  const scene = SCENES[body.kind as SceneKind];
  const id = Number(body.id);
  if (!scene || !id) return NextResponse.json({ error: 'bad_params' }, { status: 400 });
  if (!await canCurateEntity(uid, scene.entityType, String(id))) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  const svc = createServiceRoleClient();

  const patch = coerce(scene, body);

  // Publish gate: a row can only go public with a title and a source.
  if (body.status === 'published' || body.status === 'draft') {
    if (body.status === 'published') {
      const { data: cur } = await svc.from(scene.table).select('*').eq('id', id).maybeSingle();
      const merged = { ...(cur ?? {}), ...patch };
      if (!merged[scene.titleField] || !merged.source_url) {
        return NextResponse.json({ error: 'publish_needs_title_and_source' }, { status: 400 });
      }
    }
    patch.status = body.status;
  }
  patch.updated_at = new Date().toISOString();
  const { error } = await svc.from(scene.table).update(patch).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
