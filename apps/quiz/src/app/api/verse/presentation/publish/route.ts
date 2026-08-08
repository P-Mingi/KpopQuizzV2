import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { canCurateSpace } from '@/lib/verse/roles';
import { validatePresentation } from '@/lib/verse/presentation/validate';
import { upsertPortalPage } from '@/lib/verse/tree/portal';

import type { NextRequest } from 'next/server';

// W-CUSTOM step 10 - PUBLISH: copy presentation_draft -> live, and write a
// verse_revisions row (entity_type space_presentation) so the customization has
// history + rollback like every other edit. Validated again at the gate. Curator+.
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
  const { data: row } = await svc.from('verse_spaces').select('presentation, presentation_draft').eq('group_id', groupId).maybeSingle();
  const draft = (row as { presentation_draft?: unknown } | null)?.presentation_draft ?? { version: 1 };
  const result = validatePresentation(draft && typeof draft === 'object' && Object.keys(draft as object).length ? draft : { version: 1 });
  if (!result.ok) return NextResponse.json({ ok: false, errors: result.errors }, { status: 422 });

  // V-POLISH rollback root-cause fix: rollback restores list[1] (the previous
  // look), which only exists from the SECOND publish onward. A space whose look
  // predates the studio has no revision trail, so the FIRST publish must snapshot
  // the OUTGOING live presentation as the baseline; without it, rollback 404s on
  // exactly the publish a curator most wants to undo (their first).
  const { count: revCount } = await svc.from('verse_revisions')
    .select('*', { count: 'exact', head: true })
    .eq('entity_type', 'space_presentation').eq('entity_id', String(groupId)).eq('section_key', 'presentation');
  if (!revCount) {
    const outgoing = (row as { presentation?: unknown } | null)?.presentation;
    const base = validatePresentation(outgoing && typeof outgoing === 'object' && Object.keys(outgoing as object).length ? outgoing : { version: 1 });
    await svc.from('verse_revisions').insert({
      entity_type: 'space_presentation', entity_id: String(groupId), section_key: 'presentation',
      author: user.id, summary: 'Pre-studio look (baseline)', content: base.ok ? base.value : { version: 1 },
    });
  }

  // History first (snapshot of what is going live), then flip live = draft.
  await svc.from('verse_revisions').insert({
    entity_type: 'space_presentation', entity_id: String(groupId), section_key: 'presentation',
    author: user.id, summary: 'Published presentation', content: result.value ?? { version: 1 },
  });
  const { error } = await svc.from('verse_spaces')
    .upsert({ group_id: groupId, presentation: result.value, updated_at: new Date().toISOString() }, { onConflict: 'group_id' });
  if (error) return NextResponse.json({ ok: false, errors: [error.message] }, { status: 500 });

  // V-FOUNDATION F1 C11: the re-pointed write target. Mirror the published presentation
  // into the space's PORTAL page (pages.blocks) - the canonical store the space home now
  // renders from. verse_spaces.presentation is kept above for rollback history + the
  // chrome/meta source; the portal page is the pages-system home of record.
  try { await upsertPortalPage(svc, groupId, result.value ?? { version: 1 }, user.id); }
  catch (e) { console.error('[publish] portal mirror failed (non-fatal):', e); }

  return NextResponse.json({ ok: true });
}
