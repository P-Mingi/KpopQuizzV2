import { NextResponse } from 'next/server';

import { createPublicReadClient, createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { sectionDef } from '@/lib/verse/content';

import type { NextRequest } from 'next/server';

// W3.6 - section revision history (public: verse_revisions is public-read) and
// restore/undo (admin). Revisions carry a full snapshot, so restore is a safe
// new revision with an old snapshot - no risky mid-history merge.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);
  const entity_type = url.searchParams.get('entity_type') ?? '';
  const entity_id = url.searchParams.get('entity_id') ?? '';
  const section_key = url.searchParams.get('section') ?? '';
  const db = createPublicReadClient();
  const { data } = await db.from('verse_revisions')
    .select('id, author, summary, minor, content, base_revision_id, created_at')
    .eq('entity_type', entity_type).eq('entity_id', entity_id).eq('section_key', section_key)
    .order('created_at', { ascending: false }).limit(100);
  return NextResponse.json({ revisions: data ?? [] });
}

// POST { entity_type, entity_id, section, revision_id } -> restore that snapshot
// as a new current revision (full rollback / undo-to-point). Admin (v1 reviewer).
export async function POST(req: NextRequest): Promise<NextResponse> {
  const serverClient = await createServerClient();
  const { data: { user } } = await serverClient.auth.getUser();
  if (!user || !isAdmin(user.id)) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  const entity_type = String(body.entity_type ?? '');
  const entity_id = String(body.entity_id ?? '');
  const section_key = String(body.section ?? '');
  const revisionId = Number(body.revision_id);
  if (!sectionDef(entity_type, section_key) || !revisionId) return NextResponse.json({ error: 'bad_request' }, { status: 400 });

  const svc = createServiceRoleClient();
  const { data: target } = await svc.from('verse_revisions').select('id, content')
    .eq('id', revisionId).eq('entity_type', entity_type).eq('entity_id', entity_id).eq('section_key', section_key).maybeSingle();
  if (!target) return NextResponse.json({ error: 'revision_not_found' }, { status: 404 });

  const { data: cur } = await svc.from('verse_content').select('id, current_revision_id')
    .eq('entity_type', entity_type).eq('entity_id', entity_id).eq('section_key', section_key).maybeSingle();
  if (!cur) return NextResponse.json({ error: 'no_content' }, { status: 404 });

  const { data: rev, error } = await svc.from('verse_revisions').insert({
    content_id: cur.id, entity_type, entity_id, section_key, author: user.id,
    summary: `Restored revision #${revisionId}`, minor: false, content: target.content, base_revision_id: cur.current_revision_id,
  }).select('id').single();
  if (error || !rev) return NextResponse.json({ error: error?.message ?? 'restore_failed' }, { status: 500 });

  await svc.from('verse_content').update({ content: target.content, current_revision_id: rev.id, updated_at: new Date().toISOString() }).eq('id', cur.id);
  return NextResponse.json({ ok: true, revision_id: rev.id });
}
