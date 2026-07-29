import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { runRoleDecay } from '@/lib/verse/decay';

import type { NextRequest } from 'next/server';

// W4.9 - scheduled role decay. Auth mirrors the other crons: x-vercel-cron, or
// Bearer CRON_SECRET, or a global admin. Demotes long-inactive curators to contributor.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  const isVercelCron = req.headers.get('x-vercel-cron') === '1';
  const isManualAuth = !!(cronSecret && req.headers.get('authorization') === `Bearer ${cronSecret}`);
  if (!isVercelCron && !isManualAuth) {
    const supa = await createServerClient();
    const { data: { user } } = await supa.auth.getUser();
    if (!user || !isAdmin(user.id)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await runRoleDecay();
  return NextResponse.json({ ok: true, ...result });
}
