import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient, createPublicReadClient } from '@/lib/supabase/server';
import { canCurateSpace } from '@/lib/verse/roles';

import type { NextRequest } from 'next/server';

// V-POLISH-2 B1 - fold choice at write time. The reading fold per section
// (auto / inline) is a reading preference, not a look change, so it saves
// live like era colors: no publish ceremony, curator-gated, one key deep in
// presentation.textFolds. Warn-not-block philosophy holds: nothing here can
// make content unreadable.
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  const groupSlug = String(body.group_slug ?? '');
  const section = String(body.section ?? '');
  const pref = String(body.pref ?? '');
  if (!groupSlug || !section || !['auto', 'inline'].includes(pref)) return NextResponse.json({ error: 'bad_params' }, { status: 400 });

  const { data: g } = await createPublicReadClient().from('groups').select('id').eq('slug', groupSlug).maybeSingle();
  const groupId = (g as { id: number } | null)?.id;
  if (!groupId) return NextResponse.json({ error: 'unknown_group' }, { status: 404 });

  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user || !await canCurateSpace(user.id, groupId)) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  const svc = createServiceRoleClient();
  const { data: row } = await svc.from('verse_spaces').select('presentation').eq('group_id', groupId).maybeSingle();
  const pres = ((row as { presentation?: Record<string, unknown> } | null)?.presentation ?? {}) as Record<string, unknown>;
  const folds = (pres.textFolds ?? {}) as Record<string, string>;
  folds[section] = pref;
  const { error } = await svc.from('verse_spaces')
    .upsert({ group_id: groupId, presentation: { ...pres, textFolds: folds }, updated_at: new Date().toISOString() }, { onConflict: 'group_id' });
  if (error) return NextResponse.json({ ok: false, errors: [error.message] }, { status: 500 });
  return NextResponse.json({ ok: true });
}
