import { NextResponse } from 'next/server';

import { hashToken, REMINDERS_TABLE, remindersEnabled } from '@/lib/daily-reminders';
import { createServiceRoleClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';

// Audit 01 P2-10: the link of the confirmation mail (double opt-in). It confirms only when the token matches the stored hash; it
// then redirects to the settings. No tracking: the link is ours and carries only the account id and the one-time token.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);
  const done = (ok: boolean): NextResponse => NextResponse.redirect(new URL(`/settings?reminder=${ok ? 'on' : 'invalid'}`, url.origin), 303);
  if (!remindersEnabled()) return done(false);
  const u = url.searchParams.get('u') ?? '';
  const t = url.searchParams.get('t') ?? '';
  if (!/^[0-9a-f-]{36}$/i.test(u) || t.length < 20) return done(false);
  const { data } = await createServiceRoleClient().from(REMINDERS_TABLE)
    .update({ confirmed_at: new Date().toISOString(), confirm_hash: null })
    .eq('user_id', u).eq('confirm_hash', hashToken(t)).is('confirmed_at', null).select('user_id');
  return done(Array.isArray(data) && data.length === 1);
}
