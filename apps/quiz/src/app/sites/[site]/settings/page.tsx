// Run O1 twin (rule 18) of apps/quiz/src/app/(site)/settings/page.tsx, rows 18, H-5. On anime the page is UxSettings
// (components/profile/ux-v1/settings, the shared settings screen with the world prop of this site): the series and oshi sections, the account rows (the
// network passport, sign out here, sign out everywhere), the presentation of this site saved on the membership. On the hub (lot (d), H-5)
// it renders nothing of its own: a signed in fan is sent to /settings on their home site, a signed out visitor to the root
// (lib/site/hub/redirects.ts). No other build serves this file.
import { notFound, redirect } from 'next/navigation';

import { UxSettings } from '@/components/profile/ux-v1/settings';
import { settingsWorld } from '@/lib/passport-ui/settings-world';
import { ownPageTarget } from '@/lib/site/hub/redirects';
import { SITE } from '@/lib/site/registry';
import { createServerClient } from '@/lib/supabase/server';

import type { Metadata } from 'next';
import type { SupabaseClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export function generateMetadata(): Metadata {
  return { title: `Settings | ${SITE.brand.name}`, robots: { index: false, follow: true } };
}

export default async function SettingsPage(): Promise<React.ReactElement> {
  if (SITE.id === 'anime') {
    const world = settingsWorld(SITE.id);
    if (world) return <UxSettings world={world} />;
    notFound();
  }
  if (SITE.id !== 'hub') notFound();
  const supabase = (await createServerClient()) as unknown as SupabaseClient;
  redirect(await ownPageTarget(supabase, '/settings', { NEXT_PUBLIC_NET_ORIGINS: process.env.NEXT_PUBLIC_NET_ORIGINS, VERCEL_ENV: process.env.VERCEL_ENV }));
}
