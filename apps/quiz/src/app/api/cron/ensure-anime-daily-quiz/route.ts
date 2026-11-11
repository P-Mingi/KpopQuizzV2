import { cronForSite, isCronAuthorized } from '@/lib/cron-auth';
import { bankRefillAlert } from '@/lib/quiz-bank-scheduling';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { forSite } from '@/lib/site/scope';
import { rotateQotd, supabaseQotdStore } from '@/lib/ux-v1/p1/qotd-rotation';
import { NextResponse } from 'next/server';

import type { NextRequest } from 'next/server';

/**
 * STOPGAP until PR #213 (o1/crons, vercel.ts) is merged and otakuquiz's own crons are seen running. Then delete this route, its
 * -eve twin, their two entries in vercel.json and .github/workflows/anime-daily-quiz.yml (docs/launch/o1/RUNBOOK.md says the same).
 *
 * Why it exists: Vercel never calls the crons of the otakuquiz project (its deployment URL is routed to the hub by the
 * Microfrontends group) and the GitHub workflow that replaces them starts 6 to 10 hours late, so a run can land past noon UTC and
 * miss today. The hub's own crons run on time, so the hub publishes the ANIME quiz of the day itself.
 *
 * Auth: Bearer CRON_SECRET first (401 otherwise). vercel.json is shared by the three projects, so every build gets this cron:
 * cronForSite(['hub']) answers the 200 skip on the kpop and anime builds and touches nothing.
 *
 * On the hub build it runs the SAME idempotent logic as the anime route's rotation branch (existing pick, else the bank row of the
 * date, else a pulled bank row, else a catalog pick), on the anime store: rotateQotd(supabaseQotdStore(db, 'anime'), date). It does
 * so whatever the hub's QOTD_ROTATION_FIX says: the anime project runs with the switch on (its answers carry "method"), and the hub
 * must not drop to the legacy RPC-only path for another site's quiz. No HTTP call to the anime route, no new secret or variable.
 *
 * Dates (UTC): always TODAY first; after 12:00 UTC also TOMORROW (the "eve" behaviour of publishTarget), so a late run never skips
 * today. A date that stays empty (method none) or throws answers 500 so the cron shows as failed.
 *
 * The anime caches are not busted from here (separate Vercel project): its pages show the new quiz after their cache TTL.
 */
export const dynamic = 'force-dynamic';

const ANIME = 'anime' as const;

type Db = ReturnType<typeof createServiceRoleClient>;

interface DateResult {
  date: string;
  ok: boolean;
  method?: string;
  quiz_id?: string | null;
  reason?: string | undefined;
  error?: string;
}

/** The dates to ensure at `now`: today, plus tomorrow from 12:00 UTC. */
export function animeTargets(now: Date): string[] {
  const today = now.toISOString().split('T')[0]!;
  if (now.getUTCHours() < 12) return [today];
  return [today, new Date(now.getTime() + 86_400_000).toISOString().split('T')[0]!];
}

async function animeBankStatus(db: Db): Promise<{ bank_open?: number; refill_alert?: string }> {
  try {
    const { count, error } = await forSite(db.from('quiz_bank').select('id', { count: 'exact', head: true }), ANIME).in('status', ['verified', 'scheduled']);
    if (error || typeof count !== 'number') return {};
    const alert = bankRefillAlert(count, ANIME);
    if (alert) console.warn(`[ensure-anime-daily-quiz] ${alert}`);
    return alert ? { bank_open: count, refill_alert: alert } : { bank_open: count };
  } catch {
    return {};
  }
}

export async function GET(req: NextRequest): Promise<NextResponse | Response> {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const skip = cronForSite(['hub']);
  if (skip) return skip;

  const db = createServiceRoleClient();
  const store = supabaseQotdStore(db, ANIME);
  const results: DateResult[] = [];
  for (const date of animeTargets(new Date())) {
    try {
      const r = await rotateQotd(store, date);
      console.log(`[ensure-anime-daily-quiz] ${date}: ${r.method}${r.quizId ? ` ${r.quizId}` : ''}`);
      results.push(r.method === 'none'
        ? { date, ok: false, method: r.method, reason: r.reason }
        : { date, ok: true, method: r.method, quiz_id: r.quizId });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[ensure-anime-daily-quiz]', date, message);
      results.push({ date, ok: false, error: message });
    }
  }

  const ok = results.every((r) => r.ok);
  return NextResponse.json({ ok, site: ANIME, dates: results, ...(await animeBankStatus(db)) }, { status: ok ? 200 : 500 });
}
