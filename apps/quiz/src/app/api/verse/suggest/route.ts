import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { sectionDef } from '@/lib/verse/content';

import type { NextRequest } from 'next/server';

// W3.7 - a visitor/member suggests an edit to a section. Goes to the review queue
// (verse_edit_suggestions, status pending); nothing is applied until a reviewer
// approves. author is nullable (anonymous suggestions allowed).
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  const entity_type = String(body.entity_type ?? '');
  const entity_id = String(body.entity_id ?? '');
  const section_key = String(body.section ?? '');
  const content = body.content;
  const summary = body.summary ? String(body.summary).slice(0, 300) : null;
  const minor = body.minor === true;

  if (!sectionDef(entity_type, section_key)) return NextResponse.json({ error: 'unknown_section' }, { status: 400 });
  if (!content || typeof content !== 'object') return NextResponse.json({ error: 'content_required' }, { status: 400 });

  const serverClient = await createServerClient();
  const { data: { user } } = await serverClient.auth.getUser();

  const svc = createServiceRoleClient();
  const { data: cur } = await svc.from('verse_content').select('current_revision_id')
    .eq('entity_type', entity_type).eq('entity_id', entity_id).eq('section_key', section_key).maybeSingle();

  const { error } = await svc.from('verse_edit_suggestions').insert({
    entity_type, entity_id, section_key, author: user?.id ?? null,
    content, summary, minor, base_revision_id: cur?.current_revision_id ?? null, status: 'pending',
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
