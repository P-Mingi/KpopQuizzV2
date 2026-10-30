import { NextResponse } from 'next/server';

import { isCronAuthorized } from '@/lib/cron-auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin/guard';
import { runVerseRefresh } from '@/lib/verse/refresh';
import { verseAlert } from '@/lib/verse/alert';

import type { NextRequest } from 'next/server';

// Workstream W1.5: weekly Verse delta refresh. Re-fetches group fields from
// Wikidata (allowlist only) and detects new MusicBrainz albums. Curator overrides
// are NEVER overwritten; ingested/override conflicts are counted and alerted, not
// applied. Rate-limited (MusicBrainz 1 req/sec), so it needs a long budget.
// Fail-soft: per-group errors are collected and alerted; the route returns 200 so
// Vercel does not retry-storm. Auth mirrors the other crons.
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(req: NextRequest): Promise<NextResponse> {
  // ADMIN-1: Bearer CRON_SECRET, or an admin that requireAdmin lets through (verified, listed, aal2); anyone else gets the admin 404.
  if (!isCronAuthorized(req)) {
    const gate = await requireAdmin('api');
    if (!gate.ok) return gate.res;
  }

  const svc = createServiceRoleClient();

  try {
    const stats = await runVerseRefresh(svc);
    if (stats.errors.length > 0) {
      await verseAlert('refresh', `${stats.errors.length} group(s) failed: ${stats.errors.slice(0, 5).join(' | ')}`);
    }
    if (stats.conflicts > 0) {
      await verseAlert('refresh', `${stats.conflicts} override/ingestion conflict(s) need review in /admin/verse`);
    }
    return NextResponse.json({ ok: true, ...stats });
  } catch (err) {
    await verseAlert('refresh', `refresh crashed: ${(err as Error).message}`);
    return NextResponse.json({ ok: false, skipped: 'refresh_failed' });
  }
}
