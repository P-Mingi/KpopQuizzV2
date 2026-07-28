import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { sectionDef } from '@/lib/verse/content';

import type { NextRequest } from 'next/server';

// W3.8 - lock / unlock a section (reviewer-tier; v1 = admins). A locked section
// blocks suggestions and shows a reader indicator; reviewers can still edit and
// unlock. The lock carries who / when / why (locked_by, locked_at, lock_reason).
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const serverClient = await createServerClient();
  const { data: { user } } = await serverClient.auth.getUser();
  if (!user || !isAdmin(user.id)) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  const entity_type = String(body.entity_type ?? '');
  const entity_id = String(body.entity_id ?? '');
  const section_key = String(body.section ?? '');
  const locked = body.locked === true;
  const reason = body.reason ? String(body.reason).slice(0, 200) : null;
  if (!sectionDef(entity_type, section_key)) return NextResponse.json({ error: 'unknown_section' }, { status: 400 });

  const svc = createServiceRoleClient();
  const patch = locked
    ? { locked: true, locked_by: user.id, locked_at: new Date().toISOString(), lock_reason: reason }
    : { locked: false, locked_by: null, locked_at: null, lock_reason: null };

  const { data: existing } = await svc.from('verse_content').select('id')
    .eq('entity_type', entity_type).eq('entity_id', entity_id).eq('section_key', section_key).maybeSingle();
  if (existing) {
    await svc.from('verse_content').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', existing.id);
  } else {
    // Pre-lock a section that has no content yet.
    await svc.from('verse_content').insert({ entity_type, entity_id, section_key, content: {}, ...patch });
  }
  return NextResponse.json({ ok: true, locked });
}
