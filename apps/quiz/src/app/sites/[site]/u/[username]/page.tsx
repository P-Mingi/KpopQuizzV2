// Run O1 twin (rule 18) of apps/quiz/src/app/(site)/u/[username]/page.tsx, rows 17, H-4. On anime the member of this site is
// rendered by the shared passport (components/profile/ux-v1/passport) from the membership, read with the service role and the
// public columns (lib/passport-ui/world-data.ts); 404 without an activated, unbanned membership; always noindex. Any other
// site that carries this file (the hub, until H-4 is built) keeps the kpop page it has always rendered.
import KpopProfilePage, { generateMetadata as kpopMetadata } from '@/app/(site)/u/[username]/page';
import { UxPassport } from '@/components/profile/ux-v1/passport';
import { loadWorldProfile, worldProfileMetadata } from '@/lib/passport-ui/world-data';
import { SITE_ID } from '@/lib/site/registry';

import type { Metadata } from 'next';

// A member can be banned or hidden at any time, and the parent layout allows no param that was not generated at build
// (dynamicParams off: an ISR page of an unknown username answers NoFallbackError): the page is rendered per request.
export const dynamic = 'force-dynamic';

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  if (SITE_ID === 'anime') return worldProfileMetadata((await params).username);
  return kpopMetadata({ params });
}

export default async function ProfilePage(props: ProfilePageProps): Promise<React.ReactElement> {
  if (SITE_ID === 'anime') return <UxPassport {...(await loadWorldProfile((await props.params).username))} />;
  return KpopProfilePage(props);
}
