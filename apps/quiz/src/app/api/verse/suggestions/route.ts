import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { canCurateEntity } from '@/lib/verse/curate';

import type { NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';

// W3.7 / W4.3 - reviewer queue. Reviewers = global admins (all spaces) + per-space
// curators (only their spaces' suggestions). List pending with current content for
// diffing; approve (revision attributed to the suggester), reject, or batch-approve minors.
export const dynamic = 'force-dynamic';

interface Suggestion { id: number; entity_type: string; entity_id: string; section_key: string; author: string | null; content: unknown; summary: string | null; minor: boolean; base_revision_id: number | null; }

async function requireUser() {
  const serverClient = await createServerClient();
  const { data: { user } } = await serverClient.auth.getUser();
  return user;
}

export async function GET(): Promise<NextResponse> {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  const svc = createServiceRoleClient();
  const { data: sugg } = await svc.from('verse_edit_suggestions')
    .select('id, entity_type, entity_id, section_key, author, content, summary, minor, base_revision_id, created_at')
    .eq('status', 'pending').order('created_at', { ascending: true }).limit(200);
  const all = (sugg ?? []) as (Suggestion & { created_at: string })[];
  // Only suggestions the caller may curate (global admin -> all; curator -> their spaces).
  const flags = await Promise.all(all.map((r) => canCurateEntity(user.id, r.entity_type, r.entity_id)));
  const rows = all.filter((_, i) => flags[i]);
  // Attach current section content for the diff.
  const keys = [...new Set(rows.map((r) => `${r.entity_type}|${r.entity_id}|${r.section_key}`))];
  const currentByKey = new Map<string, unknown>();
  for (const k of keys) {
    const [et, ei, sk] = k.split('|');
    const { data } = await svc.from('verse_content').select('content').eq('entity_type', et).eq('entity_id', ei).eq('section_key', sk).maybeSingle();
    currentByKey.set(k, data?.content ?? { type: 'doc', content: [] });
  }
  return NextResponse.json({ suggestions: rows.map((r) => ({ ...r, current: currentByKey.get(`${r.entity_type}|${r.entity_id}|${r.section_key}`) ?? null })) });
}

async function applySuggestion(svc: SupabaseClient, s: Suggestion): Promise<void> {
  // Ensure content row, append a revision attributed to the suggester, update current.
  const { data: existing } = await svc.from('verse_content').select('id, current_revision_id')
    .eq('entity_type', s.entity_type).eq('entity_id', s.entity_id).eq('section_key', s.section_key).maybeSingle();
  let contentId = existing?.id ?? null;
  if (!contentId) {
    const { data: c } = await svc.from('verse_content').insert({ entity_type: s.entity_type, entity_id: s.entity_id, section_key: s.section_key, content: s.content }).select('id').single();
    contentId = c?.id ?? null;
  }
  const { data: rev } = await svc.from('verse_revisions').insert({
    content_id: contentId, entity_type: s.entity_type, entity_id: s.entity_id, section_key: s.section_key,
    author: s.author ?? 'anonymous', summary: s.summary ?? 'Approved suggestion', minor: s.minor,
    content: s.content, base_revision_id: s.base_revision_id,
  }).select('id').single();
  await svc.from('verse_content').update({ content: s.content, current_revision_id: rev?.id ?? null, updated_at: new Date().toISOString() }).eq('id', contentId);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  const action = String(body.action ?? '');
  const svc = createServiceRoleClient();
  const now = new Date().toISOString();

  if (action === 'approve' || action === 'reject') {
    const id = Number(body.id);
    const { data: s } = await svc.from('verse_edit_suggestions').select('*').eq('id', id).eq('status', 'pending').maybeSingle();
    if (!s) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    if (!await canCurateEntity(user.id, (s as Suggestion).entity_type, (s as Suggestion).entity_id)) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    if (action === 'approve') {
      await applySuggestion(svc, s as Suggestion);
      await svc.from('verse_edit_suggestions').update({ status: 'approved', reviewer: user.id, reviewed_at: now }).eq('id', id);
    } else {
      await svc.from('verse_edit_suggestions').update({ status: 'rejected', reviewer: user.id, review_reason: body.reason ? String(body.reason).slice(0, 300) : null, reviewed_at: now }).eq('id', id);
    }
    return NextResponse.json({ ok: true });
  }

  if (action === 'approve_minors') {
    const { data: minors } = await svc.from('verse_edit_suggestions').select('*').eq('status', 'pending').eq('minor', true).limit(200);
    let approved = 0;
    for (const s of (minors ?? []) as Suggestion[]) {
      if (!await canCurateEntity(user.id, s.entity_type, s.entity_id)) continue; // only the caller's spaces
      await applySuggestion(svc, s);
      await svc.from('verse_edit_suggestions').update({ status: 'approved', reviewer: user.id, reviewed_at: now }).eq('id', s.id);
      approved++;
    }
    return NextResponse.json({ ok: true, approved });
  }

  return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
}
