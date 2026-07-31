import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { validatePageMeta } from '@/lib/verse/pages/validate';
import { KPOP_PAGE_REGISTRY } from '@/lib/verse/pages/kpop-kinds';

import type { NextRequest } from 'next/server';

// V-PAGES step 5 - SUBMIT FOR REVIEW (the author): draft -> review. The
// leave-draft gates fire here: ranked pages need their methodology, facts with
// values need sources.
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  const pageId = Number(body.page_id);
  if (!pageId) return NextResponse.json({ error: 'bad_params' }, { status: 400 });

  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in' }, { status: 401 });

  const svc = createServiceRoleClient();
  const { data: pageRow } = await svc.from('verse_pages').select('id, group_id, kind, slug, title, status, infobox, created_by').eq('id', pageId).maybeSingle();
  if (!pageRow) return NextResponse.json({ error: 'No such page' }, { status: 404 });
  const page = pageRow as { id: number; kind: string; slug: string; title: string; status: string; infobox: Record<string, unknown>; created_by: string };
  if (page.created_by !== user.id && !isAdmin(user.id)) return NextResponse.json({ error: 'Not your page' }, { status: 403 });
  if (page.status !== 'draft') return NextResponse.json({ error: 'Only drafts can be submitted' }, { status: 409 });

  const checked = validatePageMeta(KPOP_PAGE_REGISTRY, {
    kind: page.kind, slug: page.slug, title: page.title, status: 'review', infobox: page.infobox,
  });
  if (!checked.ok) return NextResponse.json({ ok: false, errors: checked.errors }, { status: 422 });

  await svc.from('verse_pages').update({ status: 'review', updated_at: new Date().toISOString() }).eq('id', page.id);
  // status in the response so the editor's pill updates instantly (found by the
  // step-1 journey: submit succeeded silently and the UI still said draft).
  return NextResponse.json({ ok: true, status: 'review' });
}
