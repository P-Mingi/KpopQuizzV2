import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { canCurateSpace } from '@/lib/verse/roles';
import { validatePresentation } from '@/lib/verse/presentation/validate';

import type { NextRequest } from 'next/server';

// W-CUSTOM step 4 - the presentation SAVE endpoint (draft). Curator+ only. Every
// save runs the full validator server-side: the SEO INVARIANT (seoCritical blocks
// cannot be removed or hidden), unknown block types, the WCAG-AA readability
// guardrail, and the sticker/tab caps are all rejected here with human-readable
// errors, BEFORE anything is written. This is the direct-rejection gate: a raw API
// call trying to drop a core block is refused even without the studio UI. Publish
// (draft -> live + revision) is a separate action (step 10).
export const dynamic = 'force-dynamic';

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

  // The config to validate is body.presentation (the full draft object).
  const result = validatePresentation(body.presentation ?? { version: 1 });
  if (!result.ok) {
    // Human-readable rejection - the studio surfaces these verbatim.
    return NextResponse.json({ ok: false, errors: result.errors }, { status: 422 });
  }

  const svc = createServiceRoleClient();
  // Upsert: a space may not have a verse_spaces row yet (other columns take their
  // defaults on insert, keep their values on conflict).
  const { error } = await svc.from('verse_spaces')
    .upsert({ group_id: groupId, presentation_draft: result.value, updated_at: new Date().toISOString() }, { onConflict: 'group_id' });
  if (error) return NextResponse.json({ ok: false, errors: [error.message] }, { status: 500 });

  return NextResponse.json({ ok: true });
}
