import { NextResponse } from 'next/server';

import { cronForSite, isCronAuthorized } from '@/lib/cron-auth';
import { requireAdmin } from '@/lib/admin/guard';
import { runRoleDecay } from '@/lib/verse/decay';

import type { NextRequest } from 'next/server';

// W4.9 - scheduled role decay. Auth mirrors the other crons: Bearer CRON_SECRET
// (Vercel sends it on cron invocations), or a global admin. Demotes long-inactive curators to contributor.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse | Response> {
  // ADMIN-1: Bearer CRON_SECRET, or an admin that requireAdmin lets through (verified, listed, aal2); anyone else gets the admin 404.
  if (!isCronAuthorized(req)) {
    const gate = await requireAdmin('api');
    if (!gate.ok) return gate.res;
  }
  const skipped = cronForSite(['kpop']);
  if (skipped) return skipped;
  const result = await runRoleDecay();
  return NextResponse.json({ ok: true, ...result });
}
