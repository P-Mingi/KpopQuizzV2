// Run O1 twin (rule 18) of apps/quiz/src/app/(site)/u/[username]/page.tsx, rows 17, H-4. On anime the member of this site is
// rendered by the shared passport (components/profile/ux-v1/passport) from the membership, read with the service role and the
// public columns (lib/passport-ui/world-data.ts); 404 without an activated, unbanned membership; always noindex. On the hub
// (lot (d), H-4) it renders nothing of its own: the member is sent to their page on their home site, and a member with no
// visible membership is a 404 (lib/site/hub/redirects.ts). No other build serves this file.
import { notFound, redirect } from 'next/navigation';

import { UxPassport } from '@/components/profile/ux-v1/passport';
import { loadWorldProfile, worldProfileMetadata } from '@/lib/passport-ui/world-data';
import { memberPageTarget } from '@/lib/site/hub/redirects';
import { SITE_ID } from '@/lib/site/registry';
import { createServiceRoleClient } from '@/lib/supabase/server';

import type { Metadata } from 'next';
import type { SupabaseClient } from '@supabase/supabase-js';

// A member can be banned or hidden at any time: the page is rendered per request. The [site] layout allows no param that was
// not generated at build (dynamicParams off), which would answer every username with NoFallbackError: this page allows them.
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  if (SITE_ID === 'anime') return worldProfileMetadata((await params).username);
  return { robots: { index: false, follow: false } };
}

export default async function ProfilePage(props: ProfilePageProps): Promise<React.ReactElement> {
  const { username } = await props.params;
  if (SITE_ID === 'anime') return <UxPassport {...(await loadWorldProfile(username))} />;
  if (SITE_ID !== 'hub') notFound();
  const service = createServiceRoleClient() as unknown as SupabaseClient;
  const target = await memberPageTarget(service, username, { NEXT_PUBLIC_NET_ORIGINS: process.env.NEXT_PUBLIC_NET_ORIGINS, VERCEL_ENV: process.env.VERCEL_ENV });
  if (!target) notFound();
  redirect(target);
}
