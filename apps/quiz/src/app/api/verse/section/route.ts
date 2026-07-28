import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { sectionDef } from '@/lib/verse/content';

import type { NextRequest } from 'next/server';

// W3.2 - save an editable rich-text section. Admin-gated (v1 editors = owner +
// admins; curator roles arrive in W4). Append-only revision + current-content
// update, with base-revision conflict detection. All writes service-role.
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const serverClient = await createServerClient();
  const { data: { user } } = await serverClient.auth.getUser();
  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  const entity_type = String(body.entity_type ?? '');
  const entity_id = String(body.entity_id ?? '');
  const section_key = String(body.section ?? '');
  const content = body.content;
  const summary = body.summary ? String(body.summary).slice(0, 300) : null;
  const minor = body.minor === true;
  const base = body.base_revision_id == null ? null : Number(body.base_revision_id);

  if (!sectionDef(entity_type, section_key)) {
    return NextResponse.json({ error: 'unknown_section' }, { status: 400 });
  }
  if (!content || typeof content !== 'object') {
    return NextResponse.json({ error: 'content_required' }, { status: 400 });
  }

  const svc = createServiceRoleClient();

  // Current row (for conflict detection + lock state).
  const { data: existing } = await svc
    .from('verse_content')
    .select('id, current_revision_id, locked')
    .eq('entity_type', entity_type).eq('entity_id', entity_id).eq('section_key', section_key)
    .maybeSingle();

  // Conflict: the edit was based on a revision that is no longer current.
  const currentRev = existing?.current_revision_id ?? null;
  if ((existing ? currentRev : null) !== base) {
    const { data: fresh } = await svc.from('verse_content').select('content, current_revision_id')
      .eq('entity_type', entity_type).eq('entity_id', entity_id).eq('section_key', section_key).maybeSingle();
    return NextResponse.json({ error: 'conflict', current: fresh?.content ?? null, current_revision_id: fresh?.current_revision_id ?? null }, { status: 409 });
  }

  // Ensure a content row exists (first edit creates it).
  let contentId = existing?.id ?? null;
  if (!contentId) {
    const { data: created, error: cErr } = await svc.from('verse_content')
      .insert({ entity_type, entity_id, section_key, content }).select('id').single();
    if (cErr || !created) return NextResponse.json({ error: cErr?.message ?? 'create_failed' }, { status: 500 });
    contentId = created.id;
  }

  // Append the revision.
  const { data: rev, error: rErr } = await svc.from('verse_revisions').insert({
    content_id: contentId, entity_type, entity_id, section_key,
    author: user.id, summary, minor, content, base_revision_id: base,
  }).select('id').single();
  if (rErr || !rev) return NextResponse.json({ error: rErr?.message ?? 'revision_failed' }, { status: 500 });

  // Point current content at the new revision.
  await svc.from('verse_content')
    .update({ content, current_revision_id: rev.id, updated_at: new Date().toISOString() })
    .eq('id', contentId);

  // Clear this author's draft for the section.
  await svc.from('verse_drafts').delete()
    .eq('author', user.id).eq('entity_type', entity_type).eq('entity_id', entity_id).eq('section_key', section_key);

  return NextResponse.json({ ok: true, revision_id: rev.id, current_revision_id: rev.id });
}
