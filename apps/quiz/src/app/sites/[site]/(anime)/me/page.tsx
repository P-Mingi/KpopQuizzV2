// Run O1 twin (rule 18) of apps/quiz/src/app/(site)/me/page.tsx, row 16: the shared passport (components/profile/ux-v1/passport and
// passport-guest) fed with the membership of this site; the reads are in lib/passport-ui/world-data.ts.
import Link from 'next/link';

import { UxPassport } from '@/components/profile/ux-v1/passport';
import { UxPassportGuest } from '@/components/profile/ux-v1/passport-guest';
import { p1 } from '@/lib/passport-ui/copy';
import { loadWorldMe, wholePassportHref, worldMeMetadata } from '@/lib/passport-ui/world-data';

import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export function generateMetadata(): Metadata {
  return worldMeMetadata();
}

export default async function MyPassportPage(): Promise<React.ReactElement> {
  const me = await loadWorldMe();
  if (me.kind === 'guest') return <UxPassportGuest words={me.words} />;
  return (
    <UxPassport
      {...me.props}
      footer={me.multiSite ? <p className="ux-help"><Link className="ux-lnk" href={wholePassportHref()} prefetch={false}>{p1('me.wholePassport')}</Link></p> : undefined}
    />
  );
}
