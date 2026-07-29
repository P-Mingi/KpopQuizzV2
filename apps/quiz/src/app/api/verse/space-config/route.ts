import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { canCurateSpace } from '@/lib/verse/roles';
import { STAGES } from '@/lib/verse/stage';

import type { NextRequest } from 'next/server';

// W4.3 - curator space settings (masthead): welcome line, charter, and SNS links.
// Curator-gated. Upserts verse_spaces (a row may not exist yet). Writes service-role.
export const dynamic = 'force-dynamic';

function cleanLinks(raw: unknown): { label: string; url: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 8).map((x) => {
    const o = x as { label?: unknown; url?: unknown };
    const url = String(o.url ?? '').trim();
    const label = String(o.label ?? '').trim().slice(0, 40);
    return /^https?:\/\//i.test(url) && label ? { label, url: url.slice(0, 300) } : null;
  }).filter((x): x is { label: string; url: string } => x !== null);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  const groupId = Number(body.group_id);
  if (!groupId) return NextResponse.json({ error: 'bad_params' }, { status: 400 });

  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user || !await canCurateSpace(user.id, groupId)) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  const patch: Record<string, unknown> = { group_id: groupId, updated_at: new Date().toISOString() };
  if ('welcome_line' in body) patch.welcome_line = body.welcome_line ? String(body.welcome_line).slice(0, 300) : null;
  if ('charter_text' in body) patch.charter_text = body.charter_text ? String(body.charter_text).slice(0, 4000) : null;
  if ('sns_links' in body) patch.sns_links = cleanLinks(body.sns_links);
  // W4.11: the collaboration stage flip is a policy switch - global admins (owner) only.
  if ('stage' in body) {
    if (!isAdmin(user.id)) return NextResponse.json({ error: 'stage_requires_admin' }, { status: 403 });
    const stage = String(body.stage);
    if (!STAGES.includes(stage as (typeof STAGES)[number])) return NextResponse.json({ error: 'bad_stage' }, { status: 400 });
    patch.stage = stage;
  }

  const svc = createServiceRoleClient();
  const { error } = await svc.from('verse_spaces').upsert(patch, { onConflict: 'group_id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
