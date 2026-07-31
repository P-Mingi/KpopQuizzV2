import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { currentSpaceRole, roleAtLeast } from '@/lib/verse/roles';
import { isAdmin } from '@/lib/admin';
import { validatePageMeta } from '@/lib/verse/pages/validate';
import { KPOP_PAGE_REGISTRY } from '@/lib/verse/pages/kpop-kinds';
import { aliasOpsOnCreate } from '@/lib/verse/pages/data';
import { resolveWantedTo } from '@/lib/verse/pages/links';

import type { NextRequest } from 'next/server';

// V-PAGES step 5 - CREATE (contributor+): a draft page. Executes the
// requirement-1 create planner: the new live slug claims the URL, any alias at
// it dies in the same operation. Wanted rows resolve to the new page id
// immediately (red links across the space turn live the moment it publishes).
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  const groupId = Number(body.group_id);
  if (!groupId) return NextResponse.json({ error: 'bad_params' }, { status: 400 });

  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in to create pages' }, { status: 401 });
  const { role } = await currentSpaceRole(groupId);
  if (!isAdmin(user.id) && !roleAtLeast(role, 'contributor')) {
    return NextResponse.json({ error: 'Contributor role required. Join the space and contribute to unlock page creation.' }, { status: 403 });
  }

  const svc = createServiceRoleClient();
  const { data: spaceRow } = await svc.from('verse_spaces').select('presentation').eq('group_id', groupId).maybeSingle();
  const enabledKinds = ((spaceRow as { presentation?: { enabledKinds?: string[] } } | null)?.presentation?.enabledKinds) ?? null;

  const checked = validatePageMeta(KPOP_PAGE_REGISTRY, {
    kind: String(body.kind ?? ''), slug: String(body.slug ?? ''), title: String(body.title ?? ''), status: 'draft',
  }, { forCreate: true, enabledKinds });
  if (!checked.ok || !checked.value) return NextResponse.json({ ok: false, errors: checked.errors }, { status: 422 });
  const meta = checked.value;

  const { data: page, error } = await svc.from('verse_pages').insert({
    group_id: groupId, kind: meta.kind, slug: meta.slug, title: meta.title,
    status: 'draft', infobox: {}, created_by: user.id,
  }).select('id, slug').single();
  if (error) {
    const friendly = error.code === '23505' ? 'A page already lives at that slug.' : error.message;
    return NextResponse.json({ ok: false, errors: [friendly] }, { status: 409 });
  }
  const created = page as { id: number; slug: string };

  // Requirement 1, executed verbatim from the unit-proven planner.
  for (const op of aliasOpsOnCreate(meta.slug)) {
    if (op.op === 'delete-alias-at') await svc.from('verse_page_aliases').delete().eq('group_id', groupId).eq('old_slug', op.slug);
  }
  await resolveWantedTo(svc, groupId, meta.slug, created.id);

  return NextResponse.json({ ok: true, id: created.id, slug: created.slug });
}
