import { NextResponse } from 'next/server';

import { isCronAuthorized, cronForSite } from '@/lib/cron-auth';
import { isDue, REMINDERS_TABLE, remindersEnabled, reminderMail, sendMail, tableMissing, unsubscribeToken } from '@/lib/daily-reminders';
import { siteUrl } from '@/lib/auth/site-base';
import { SITE } from '@/lib/site/registry';
import { createServiceRoleClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';

// Audit 01 P2-10: hourly. Sends at most one reminder per confirmed account per day, at the chosen hour, never once the daily is
// played (profiles.last_daily_date is today). Flag DAILY_REMINDERS=1 (off by default). 90 a run: the sender allows 100 an hour.
export const dynamic = 'force-dynamic';
const BATCH = 90;

export async function GET(req: NextRequest): Promise<Response> {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const skipped = cronForSite(['kpop']);
  if (skipped) return skipped;
  if (!remindersEnabled()) return NextResponse.json({ ok: true, skipped: 'flag_off' });

  const db = createServiceRoleClient();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const { data, error } = await db.from(REMINDERS_TABLE).select('user_id, hour_utc, confirmed_at, last_sent_on')
    .not('confirmed_at', 'is', null).eq('hour_utc', now.getUTCHours()).or(`last_sent_on.is.null,last_sent_on.neq.${today}`).limit(BATCH);
  if (tableMissing(error)) return NextResponse.json({ ok: true, skipped: 'no_table' });
  if (error) return NextResponse.json({ error: 'read_failed' }, { status: 500 });

  let sent = 0;
  let played = 0;
  for (const row of (data ?? []) as { user_id: string; hour_utc: number; confirmed_at: string | null; last_sent_on: string | null }[]) {
    const { data: prof } = await db.from('profiles').select('last_daily_date').eq('id', row.user_id).maybeSingle();
    const playedToday = (prof as { last_daily_date: string | null } | null)?.last_daily_date === today;
    if (!isDue(row, now, playedToday)) { if (playedToday) played += 1; continue; }
    const { data: u } = await db.auth.admin.getUserById(row.user_id);
    const email = u?.user?.email;
    if (!email) continue;
    // the unsubscribe token is an HMAC of the account id (lib/daily-reminders.ts): every mail ever sent keeps a working link
    const unsub = unsubscribeToken(row.user_id, process.env['REMINDER_SECRET']);
    if (!unsub) continue;
    const origin = siteUrl(SITE.id, process.env as never, '');
    const mail = reminderMail(SITE.brand.name, origin, `${origin}/api/reminders/unsubscribe?u=${row.user_id}&t=${unsub}`);
    // marked sent BEFORE the send: a crash can lose one reminder, never send two in a day
    await db.from(REMINDERS_TABLE).update({ last_sent_on: today }).eq('user_id', row.user_id);
    if (await sendMail(email, mail, SITE.brand.name, SITE.domain, process.env, fetch)) sent += 1;
  }
  return NextResponse.json({ ok: true, hour: now.getUTCHours(), due: (data ?? []).length, sent, skipped_played: played });
}
