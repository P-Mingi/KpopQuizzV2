import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { sectionDef } from '@/lib/verse/content';
import { canCurateEntity } from '@/lib/verse/curate';

import type { NextRequest } from 'next/server';

// W3.2 / W4.3 - per-author autosave draft. Private (service-role, keyed by author).
// GET the caller's draft, PUT to upsert it, DELETE to discard. PUT is gated to editors
// (global admins + per-space curators) of the entity's space.
export const dynamic = 'force-dynamic';

async function requireEditor() {
  const serverClient = await createServerClient();
  const { data: { user } } = await serverClient.auth.getUser();
  return user ?? null;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const user = await requireEditor();
  if (!user) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  const url = new URL(req.url);
  const entity_type = url.searchParams.get('entity_type') ?? '';
  const entity_id = url.searchParams.get('entity_id') ?? '';
  const section_key = url.searchParams.get('section') ?? '';
  const svc = createServiceRoleClient();
  const { data } = await svc.from('verse_drafts')
    .select('content, base_revision_id, updated_at')
    .eq('author', user.id).eq('entity_type', entity_type).eq('entity_id', entity_id).eq('section_key', section_key)
    .maybeSingle();
  return NextResponse.json({ draft: data ?? null });
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  const user = await requireEditor();
  if (!user) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  const entity_type = String(body.entity_type ?? '');
  const entity_id = String(body.entity_id ?? '');
  const section_key = String(body.section ?? '');
  if (!sectionDef(entity_type, section_key)) return NextResponse.json({ error: 'unknown_section' }, { status: 400 });
  if (!body.content || typeof body.content !== 'object') return NextResponse.json({ error: 'content_required' }, { status: 400 });
  if (!await canCurateEntity(user.id, entity_type, entity_id)) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  const svc = createServiceRoleClient();
  const { error } = await svc.from('verse_drafts').upsert({
    author: user.id, entity_type, entity_id, section_key,
    content: body.content, base_revision_id: body.base_revision_id == null ? null : Number(body.base_revision_id),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'author,entity_type,entity_id,section_key' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const user = await requireEditor();
  if (!user) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  const url = new URL(req.url);
  const svc = createServiceRoleClient();
  await svc.from('verse_drafts').delete()
    .eq('author', user.id)
    .eq('entity_type', url.searchParams.get('entity_type') ?? '')
    .eq('entity_id', url.searchParams.get('entity_id') ?? '')
    .eq('section_key', url.searchParams.get('section') ?? '');
  return NextResponse.json({ ok: true });
}
