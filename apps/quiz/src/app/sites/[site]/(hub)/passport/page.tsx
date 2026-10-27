// Run O1, lot (d), row H-3 (rule 18): /passport of fanquiz.org renders nothing of its own. The passport of a fan is the page
// of the site they play on, so a signed in fan is sent to /me on their home site (the one used last, else the first
// joined, else kpop); a signed out visitor is sent to the root, where the sign-in lives (lib/site/hub/redirects.ts).
import { redirect } from 'next/navigation';

import { ownPageTarget } from '@/lib/site/hub/redirects';
import { createServerClient } from '@/lib/supabase/server';

import type { Metadata } from 'next';
import type { SupabaseClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function PassportRedirect(): Promise<never> {
  const supabase = (await createServerClient()) as unknown as SupabaseClient;
  redirect(await ownPageTarget(supabase, '/me', { NEXT_PUBLIC_NET_ORIGINS: process.env.NEXT_PUBLIC_NET_ORIGINS, VERCEL_ENV: process.env.VERCEL_ENV }));
}
