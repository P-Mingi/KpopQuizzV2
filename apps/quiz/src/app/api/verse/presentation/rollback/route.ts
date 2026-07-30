import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { canCurateSpace } from '@/lib/verse/roles';
import { validatePresentation } from '@/lib/verse/presentation/validate';

import type { NextRequest } from 'next/server';

// W-CUSTOM step 10 - ROLLBACK: restore the space to the PREVIOUS published look. The
// latest revision is the current live state; rollback restores the one before it (or
// a specific revision_id), sets live + draft to it, and records the rollback as a new
// revision so history stays append-only. Curator+.
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  const groupId = Number(body.group_id);
  if (!groupId) return NextResponse.json({ error: 'bad_params' }, { status: 400 });

  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user || !await canCurateSpace(user.id, groupId)) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  const svc = createServiceRoleClient();
  const { data: revs } = await svc.from('verse_revisions')
    .select('id, content')
    .eq('entity_type', 'space_presentation').eq('entity_id', String(groupId)).eq('section_key', 'presentation')
    .order('created_at', { ascending: false }).limit(20);
  const list = (revs ?? []) as { id: number; content: unknown }[];

  const targetId = Number(body.revision_id);
  const target = targetId
    ? list.find((r) => r.id === targetId)
    : list[1]; // [0] is the current live snapshot; [1] is the previous look
  if (!target) return NextResponse.json({ error: 'No previous version to roll back to.' }, { status: 404 });

  const result = validatePresentation(target.content && typeof target.content === 'object' && Object.keys(target.content as object).length ? target.content : { version: 1 });
  const restored = result.ok ? result.value : { version: 1 };

  await svc.from('verse_revisions').insert({
    entity_type: 'space_presentation', entity_id: String(groupId), section_key: 'presentation',
    author: user.id, summary: `Rolled back to revision ${target.id}`, content: restored,
  });
  const { error } = await svc.from('verse_spaces')
    .upsert({ group_id: groupId, presentation: restored, presentation_draft: restored, updated_at: new Date().toISOString() }, { onConflict: 'group_id' });
  if (error) return NextResponse.json({ ok: false, errors: [error.message] }, { status: 500 });

  return NextResponse.json({ ok: true, restoredRevision: target.id });
}
