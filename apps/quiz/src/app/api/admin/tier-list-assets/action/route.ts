import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Admin approve/reject for a custom tier-list asset (migration 146
// tier_list_assets.status). Same admin rails as /api/admin/verse/action: isAdmin
// gate, service-role status flip. Approving lets a public list use the asset (and
// the share card embed it); rejecting keeps it out of any public list.
export async function POST(req: NextRequest): Promise<NextResponse> {
  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user || !isAdmin(user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 401 });

  let body: { type?: string; asset_id?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Bad request.' }, { status: 400 }); }
  const status = body.type === 'approve' ? 'approved' : body.type === 'reject' ? 'rejected' : null;
  if (!status || typeof body.asset_id !== 'string') return NextResponse.json({ error: 'Bad request.' }, { status: 400 });

  const svc = createServiceRoleClient();
  const { error } = await svc.from('tier_list_assets').update({ status }).eq('id', body.asset_id);
  if (error) return NextResponse.json({ error: 'Could not update.' }, { status: 500 });
  return NextResponse.json({ ok: true, status });
}
