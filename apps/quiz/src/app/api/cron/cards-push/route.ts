// Bunnyverse Cards, lot 4: GET /api/cron/cards-push, the reminder "Your packs are ready". Protected like the other cron routes (CRON_SECRET,
// fail closed; hub only). Off (NET_CARDS_PUSH) it answers 404. Outside the quiet hours (22:00 to 08:00 Paris) it does nothing. Otherwise
// cards_push_pick (108-push.sql) takes and marks the due subscriptions (a full stack that was not told yet, nobody twice a Paris day, locked
// rows so two runs never send twice), and each one gets one payload-less Web Push. A Team account is never notified: its subscription is
// removed. 404 or 410 from the push service removes the subscription for good; any other failure counts (5 in a row stop a row).
import { NextResponse } from 'next/server';

import { json } from '@/lib/cards/api';
import { cardsPushOpen } from '@/lib/cards/push-flags';
import { pushQuiet } from '@/lib/cards/push-quiet';
import { pushEndpointOk, sendPush, vapidFromEnv } from '@/lib/cards/web-push';
import { isCronAuthorized, cronForSite } from '@/lib/cron-auth';
import { isEditorialUser } from '@/lib/editorial/accounts';
import { createServiceRoleClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** A run takes at most this many subscriptions, and stops taking new ones after this long (the push service is called one by one, in small groups). */
export const BATCH = 100;
export const BUDGET_MS = 45_000;
const GROUP = 10;

interface Picked {
  id: string;
  user_id: string;
  endpoint: string;
}

export async function GET(req: NextRequest): Promise<Response> {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const skipped = cronForSite(['hub']);
  if (skipped) return skipped;
  if (!cardsPushOpen()) return json({ error: 'not_found' }, 404);
  const now = Date.now();
  if (pushQuiet(now)) return json({ ok: true, skipped: 'quiet_hours' });
  const keys = vapidFromEnv();
  if (!keys) return json({ ok: true, skipped: 'no_keys' });

  const db = createServiceRoleClient();
  const { data, error } = await db.rpc('cards_push_pick', { p_now: new Date(now).toISOString(), p_limit: BATCH });
  if (error) return json({ error: 'read_failed' }, 500);
  const picked = (data ?? []) as Picked[];

  let sent = 0;
  let gone = 0;
  let failed = 0;
  let team = 0;
  let late = 0;
  const teamUsers = new Map<string, boolean>();
  for (let i = 0; i < picked.length; i += GROUP) {
    const group = picked.slice(i, i + GROUP);
    if (Date.now() - now > BUDGET_MS) {
      late += group.length; // marked by the pick but not sent: one reminder lost beats a second run sending twice
      continue;
    }
    await Promise.all(group.map(async (row) => {
      let isTeam = teamUsers.get(row.user_id);
      if (isTeam === undefined) {
        isTeam = await isEditorialUser(row.user_id);
        teamUsers.set(row.user_id, isTeam);
      }
      if (isTeam || !pushEndpointOk(row.endpoint)) {
        await db.rpc('cards_push_drop', { p_endpoint: row.endpoint });
        team += 1;
        return;
      }
      const outcome = await sendPush(keys, row.endpoint);
      if (outcome === 'sent') {
        sent += 1;
        await db.rpc('cards_push_result', { p_id: row.id, p_ok: true });
      } else if (outcome === 'gone') {
        gone += 1;
        await db.rpc('cards_push_drop', { p_endpoint: row.endpoint });
      } else {
        failed += 1;
        await db.rpc('cards_push_result', { p_id: row.id, p_ok: false });
      }
    }));
  }
  return json({ ok: true, picked: picked.length, sent, gone, failed, dropped: team, late });
}
