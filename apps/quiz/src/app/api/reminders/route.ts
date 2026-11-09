import { NextResponse } from 'next/server';

import { confirmMail, hashToken, maySubscribe, newToken, parseHour, REMINDERS_TABLE, remindersEnabled, sendMail, tableMissing } from '@/lib/daily-reminders';
import { siteUrl } from '@/lib/auth/site-base';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { SITE } from '@/lib/site/registry';

import type { NextRequest } from 'next/server';

// Audit 01 P2-10. GET: the account's reminder state (available false when the flag is off or the L27 table is not there, and for a
// guest). POST { hour, age15: true }: store the hour and send the confirmation mail (double opt-in). DELETE: stop it.
// Signed-in accounts only; "15 or older" must be ticked (the privacy policy: not directed at children under 15).
export const dynamic = 'force-dynamic';

const OFF = { available: false } as const;

export async function GET(): Promise<NextResponse> {
  if (!remindersEnabled()) return NextResponse.json(OFF);
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(OFF);
  const { data, error } = await createServiceRoleClient().from(REMINDERS_TABLE).select('hour_utc, confirmed_at').eq('user_id', user.id).maybeSingle();
  if (tableMissing(error)) return NextResponse.json(OFF);
  const row = data as { hour_utc: number; confirmed_at: string | null } | null;
  return NextResponse.json({ available: true, hour: row?.hour_utc ?? null, confirmed: Boolean(row?.confirmed_at), pending: Boolean(row && !row.confirmed_at) });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!remindersEnabled()) return NextResponse.json(OFF, { status: 404 });
  let body: { hour?: unknown; age15?: unknown };
  try { body = (await req.json()) as typeof body; } catch { body = {}; }
  const hour = parseHour(body.hour);
  if (hour === null) return NextResponse.json({ error: 'hour (0 to 23) required' }, { status: 400 });
  if (!maySubscribe(body)) return NextResponse.json({ error: 'age_15_required' }, { status: 403 });
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });

  const confirm = newToken();
  const { error } = await createServiceRoleClient().from(REMINDERS_TABLE).upsert(
    { user_id: user.id, hour_utc: hour, confirm_hash: hashToken(confirm), confirmed_at: null },
    { onConflict: 'user_id' },
  );
  if (tableMissing(error)) return NextResponse.json(OFF, { status: 404 });
  if (error) return NextResponse.json({ error: 'save_failed' }, { status: 500 });

  const origin = siteUrl(SITE.id, process.env as never, '');
  const sent = await sendMail(user.email, confirmMail(SITE.brand.name, `${origin}/api/reminders/confirm?u=${user.id}&t=${confirm}`), SITE.brand.name, SITE.domain, process.env, fetch);
  return NextResponse.json({ ok: true, pending: true, mail_sent: sent });
}

export async function DELETE(): Promise<NextResponse> {
  if (!remindersEnabled()) return NextResponse.json(OFF, { status: 404 });
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });
  await createServiceRoleClient().from(REMINDERS_TABLE).delete().eq('user_id', user.id);
  return NextResponse.json({ ok: true });
}
