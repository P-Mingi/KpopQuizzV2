import { NextResponse } from 'next/server';

import { isCronAuthorized } from '@/lib/cron-auth';
import { createServerClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { runRoleDecay } from '@/lib/verse/decay';

import type { NextRequest } from 'next/server';

// W4.9 - scheduled role decay. Auth mirrors the other crons: Bearer CRON_SECRET
// (Vercel sends it on cron invocations), or a global admin. Demotes long-inactive curators to contributor.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isCronAuthorized(req)) {
    const supa = await createServerClient();
    const { data: { user } } = await supa.auth.getUser();
    if (!user || !isAdmin(user.id)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await runRoleDecay();
  return NextResponse.json({ ok: true, ...result });
}
