import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { sectionDef } from '@/lib/verse/content';
import { canEditEntity, resolveEntityGroupId } from '@/lib/verse/curate';
import { contentIsEmpty } from '@/lib/verse/render-content';
import { awardSpaceXp, questXpForSection } from '@/lib/verse/reputation';
import { notifyWatchers } from '@/lib/verse/watchlist';

import type { NextRequest } from 'next/server';

// W3.2 / W4.3 - save an editable rich-text section. Editors = global admins + the
// per-space curators of the entity's space. Append-only revision + current-content
// update, with base-revision conflict detection. All writes service-role.
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const serverClient = await createServerClient();
  const { data: { user } } = await serverClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  const entity_type = String(body.entity_type ?? '');
  const entity_id = String(body.entity_id ?? '');
  const section_key = String(body.section ?? '');
  if (!await canEditEntity(user.id, entity_type, entity_id)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }
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

  // Current row (for conflict detection + lock state + gap-close XP).
  const { data: existing } = await svc
    .from('verse_content')
    .select('id, current_revision_id, locked, content')
    .eq('entity_type', entity_type).eq('entity_id', entity_id).eq('section_key', section_key)
    .maybeSingle();
  const wasEmpty = !existing || contentIsEmpty((existing as { content: unknown }).content);

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

  // Quest / reputation: award the author per-space XP when this edit CLOSES a gap
  // (the section was empty and now has content). Re-edits of a filled section earn nothing.
  if (wasEmpty && !contentIsEmpty(content)) {
    const xp = questXpForSection(entity_type, section_key);
    const gid = xp > 0 ? await resolveEntityGroupId(entity_type, entity_id) : null;
    if (gid) await awardSpaceXp(user.id, gid, xp);
  }

  // W4.6: notify anyone watching this page (except the editor) that it changed.
  await notifyWatchers(entity_type, entity_id, user.id, summary ?? 'The page was edited.');

  return NextResponse.json({ ok: true, revision_id: rev.id, current_revision_id: rev.id });
}
