// Run O1, lot (d), row H-3, reworked 2026-11-09: /passport of bunnyverse.org is the common passport of the network: the XP and the level
// of every site the fan joined, and the total (lib/site/hub/passport-page.ts). A signed out visitor is sent to the root, where the sign-in
// lives; a fan with no stamp yet is sent to /me on their home site as before (lib/site/hub/redirects.ts).
import { redirect } from 'next/navigation';

import { HubPassport } from '@/components/hub/hub-passport';
import { readCommonPassport } from '@/lib/site/hub/passport-page';
import { ownPageTarget } from '@/lib/site/hub/redirects';
import { createServerClient } from '@/lib/supabase/server';

import type { Metadata } from 'next';
import type { SupabaseClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Your passport', robots: { index: false, follow: false } };

export default async function PassportPage(): Promise<React.ReactElement> {
  const supabase = (await createServerClient()) as unknown as SupabaseClient;
  const passport = await readCommonPassport(supabase);
  if (passport) return <HubPassport passport={passport} />;
  redirect(await ownPageTarget(supabase, '/me', { NEXT_PUBLIC_NET_ORIGINS: process.env.NEXT_PUBLIC_NET_ORIGINS, VERCEL_ENV: process.env.VERCEL_ENV }));
}
