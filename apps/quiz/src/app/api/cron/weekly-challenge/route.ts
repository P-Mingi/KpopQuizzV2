import { NextResponse } from 'next/server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { fetchAllRows } from '@/lib/db/fetch-all';
import { pickWeeklyChallenge, hasHadWeekly, weeklyCopy, WEEKLY_CAMPAIGN } from '@/lib/battle/weekly-challenge';

import type { NextRequest } from 'next/server';

// W2b C3 - the weekly challenge job.
//
// Offers ONE real, already-played run per week to signed-in players who have played
// a battle before (so it lands on someone who knows what it is). Same cron auth as
// the other jobs.
//
// IDEMPOTENT BY CONSTRUCTION: rule 4 (one per user per week) is checked per user
// against the notifications already delivered, so running the job twice in the same
// week delivers once. There is no separate ledger to drift.
//
// TYPE NOTE, flagged in the REPORT: this rides the `battle_beaten` notification type
// because that is what migration 154 added and this mission forbids DDL. The type name
// is now overloaded (it also means "someone beat your run"). The user never sees the
// type, only the copy, which is accurate. A dedicated `battle_challenge` type is the
// clean fix and needs a migration the owner runs.
export const dynamic = 'force-dynamic';

// Bounded per run: this is a delivery job, not a broadcast. Keeping it small also
// keeps the notification table honest if something is misconfigured.
const MAX_DELIVERIES = 50;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  const isVercelCron = req.headers.get('x-vercel-cron') === '1';
  const authHeader = req.headers.get('authorization');
  const isManualAuth = !!(cronSecret && authHeader === `Bearer ${cronSecret}`);
  if (!isVercelCron && !isManualAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dryRun = req.nextUrl.searchParams.get('dry') === '1';
  const db = createServiceRoleClient();

  // Signed-in players who have actually battled. Anonymous players cannot be
  // reached at all: creator_notifications.user_id is NOT NULL against auth.users.
  const rows = await fetchAllRows<{ user_id: string | null }>(() =>
    db.from('battle_results').select('user_id').not('user_id', 'is', null),
  );
  const candidates = [...new Set(rows.map((r) => r.user_id).filter((v): v is string => !!v))];

  let delivered = 0;
  let skippedThisWeek = 0;
  let noRun = 0;
  const samples: Array<{ user: string; title: string; body: string; battleId: string }> = [];

  for (const userId of candidates) {
    if (delivered >= MAX_DELIVERIES) break;

    if (await hasHadWeekly(db, userId)) {
      skippedThisWeek += 1; // rule 4
      continue;
    }

    const pick = await pickWeeklyChallenge(db, userId);
    if (!pick) {
      noRun += 1; // nobody is messaged rather than messaged about nothing
      continue;
    }

    const copy = weeklyCopy(pick);
    if (samples.length < 5) samples.push({ user: userId, ...copy, battleId: pick.battleId });
    if (dryRun) continue;

    const { error } = await db.from('creator_notifications').insert({
      user_id: userId,
      type: 'battle_beaten',
      title: copy.title,
      body: copy.body,
      link_url: `/battle?b=${pick.battleId}&utm_source=weekly&utm_medium=notification&utm_campaign=${WEEKLY_CAMPAIGN}`,
    });
    if (error) {
      console.error('weekly-challenge insert failed:', error.message);
      continue;
    }
    delivered += 1;
  }

  return NextResponse.json({
    dryRun,
    eligibleSignedInPlayers: candidates.length,
    delivered,
    skippedAlreadyHadOneThisWeek: skippedThisWeek,
    skippedNoOpenRunAvailable: noRun,
    samples,
  });
}
