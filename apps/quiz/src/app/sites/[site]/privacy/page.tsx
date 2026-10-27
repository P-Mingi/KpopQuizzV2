// Run O1 twin (rule 18) of apps/quiz/src/app/(site)/privacy/page.tsx, rows 26, H-2: copied by scripts/o1/twins-codemod.mjs; kpop modules imported, not copied.
import { HubPrivacy } from '@/components/hub/hub-privacy';
import { ht } from '@/lib/site/hub/copy';
import { PRIVACY_PAGE, privacyUrl } from '@/lib/site/hub/network-page';
import { launchDateOrThrow, robotsFor } from '@/lib/site/indexing';

import type { Metadata } from 'next';

// Lot (d), H1: the hub and the anime build both serve the network policy (HubPrivacy, copy keys privacy.*); its canonical is the
// hub's page. While the network is closed (NET_INDEXING off) the page is a draft: banner, noindex, not in the sitemap. Once it
// is open it is indexable, and a build with NET_INDEXING on and no valid NET_LAUNCH_DATE fails here (launchDateOrThrow): Next calls
// generateMetadata while it builds the page.
export function generateMetadata(): Metadata {
  launchDateOrThrow();
  return {
    title: ht(PRIVACY_PAGE.metaTitle),
    description: ht(PRIVACY_PAGE.metaDescription),
    robots: robotsFor(true),
    alternates: { canonical: privacyUrl() },
  };
}

export default function PrivacyPage(): React.ReactElement {
  return <HubPrivacy />;
}
