import { NextResponse } from 'next/server';

import { isAdmin } from '@/lib/admin';
import { createServerClient } from '@/lib/supabase/server';
import { isUxV12 } from '@/lib/ux-v12';

import { editorialLive, supabaseStore } from './store';
import { buildComebackTopic, buildWeeklyRecap } from './templates';
import { readUpcomingComebacks, readWeeklyRecap } from './template-data';
import { createDraft } from './pipeline';

import type { EditorialStore } from './pipeline';
import type { TemplateDraft } from './templates';

// Shared gate of the /api/admin/editorial routes, in this order:
//   1. flag off            404 (the route does not exist in a v11 build)
//   2. not an admin        401 (the same gate as every /api/admin route)
//   3. SQL not applied     503 not_live, BEFORE any write
// Returns the store and the admin's id, or the response to send.

export type AdminGate = { ok: true; adminId: string; store: EditorialStore } | { ok: false; res: NextResponse };

export async function adminGate(): Promise<AdminGate> {
  if (!isUxV12()) return { ok: false, res: NextResponse.json({ error: 'not_found' }, { status: 404 }) };
  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user || !isAdmin(user.id)) return { ok: false, res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  try {
    if (!(await editorialLive())) return { ok: false, res: NextResponse.json({ error: 'not_live' }, { status: 503 }) };
  } catch {
    return { ok: false, res: NextResponse.json({ error: 'unavailable' }, { status: 503 }) };
  }
  return { ok: true, adminId: user.id, store: supabaseStore() };
}

export interface GenerateResult { created: number; existing: number; empty: string[] }

/** Build the template drafts from this week's real data and queue the new ones
 *  (one draft per template key: a second click adds nothing). */
export async function generateTemplateDrafts(store: EditorialStore, now: number): Promise<GenerateResult> {
  const accounts = await store.accounts();
  const [recap, comebacks] = await Promise.all([readWeeklyRecap(now), readUpcomingComebacks(now)]);
  const out: GenerateResult = { created: 0, existing: 0, empty: [] };
  const drafts: TemplateDraft[] = [];
  const weekly = buildWeeklyRecap(recap, accounts);
  if (weekly) drafts.push(weekly); else out.empty.push('weekly_recap');
  const topics = comebacks.map((c) => buildComebackTopic(c, accounts)).filter((t): t is TemplateDraft => t !== null);
  if (topics.length) drafts.push(...topics); else out.empty.push('comeback');
  for (const t of drafts) {
    const r = await createDraft(store, t.input, { adminId: null, templateKey: t.templateKey });
    if (r.ok) out.created++;
    else if (r.error === 'duplicate') out.existing++;
  }
  return out;
}
