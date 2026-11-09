import { NextResponse } from 'next/server';

import { REMINDERS_TABLE, unsubscribeValid } from '@/lib/daily-reminders';
import { createServiceRoleClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';

// Audit 01 P2-10: one-click unsubscribe (RFC 8058). The mail's List-Unsubscribe header points here with the account id and the token;
// a POST from the mail client and a GET from the link both stop the reminder at once, with no sign-in and no second step.
export const dynamic = 'force-dynamic';

async function stop(req: NextRequest): Promise<boolean> {
  const url = new URL(req.url);
  const u = url.searchParams.get('u') ?? '';
  const t = url.searchParams.get('t') ?? '';
  if (!/^[0-9a-f-]{36}$/i.test(u) || t.length < 20) return false;
  if (!unsubscribeValid(u, t, process.env['REMINDER_SECRET'] ?? process.env['CRON_SECRET'])) return false;
  const { data } = await createServiceRoleClient().from(REMINDERS_TABLE).delete().eq('user_id', u).select('user_id');
  return Array.isArray(data) && data.length === 1;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return NextResponse.json({ ok: await stop(req) });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ok = await stop(req);
  return NextResponse.redirect(new URL(`/settings?reminder=${ok ? 'off' : 'invalid'}`, new URL(req.url).origin), 303);
}
