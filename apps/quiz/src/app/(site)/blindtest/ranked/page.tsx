import Link from 'next/link';
import { notFound } from 'next/navigation';

import { RankedCardLoader, RankedControllerLoader, RankedLadderLoader, RankedTiersLoader } from '@/components/ranked/ux-v1/loader';
import { HowRankedWorks, SeasonRewards } from '@/components/ranked/ux-v1/rules';
import { UxPage } from '@/components/ux-v1/page';
import { UX_V1 } from '@/lib/ux-v1';

import type { Metadata } from 'next';

// /blindtest/ranked (DESIGN-SPEC 17.6, 15.4; prototype #ranked). Flag OFF: this
// URL 404s exactly like today (it was an unknown /blindtest/[mode]). Flag ON: the
// ranked page, a new URL, so noindex and out of the sitemap until the owner
// decides. The page is static: the rules render on the server, and every live
// number (season, tier, runs, ladder) comes from the engine through
// /api/ranked/me and /api/ranked/ladder in the client islands. While the pending
// migration is not applied those answer 503 and the card says ranked is not live.

export async function generateMetadata(): Promise<Metadata> {
  if (!UX_V1) return {};
  return {
    title: 'Ranked blindtest',
    description: 'Ranked K-pop blindtest: ten server-drawn songs, the same rules for everyone, a season ladder with tiers from Bronze to Legend.',
    alternates: { canonical: '/blindtest/ranked' },
    robots: { index: false, follow: true },
  };
}

export default function RankedPage(): React.ReactElement {
  if (!UX_V1) notFound();
  return (
    // Full width, unpadded: the controller sets the 720 column for the page view and
    // lets P6's game (focus mode) and results use their own stage, like /blindtest.
    <UxPage width="full" padded={false} className="p7-page">
      <RankedControllerLoader>
        <nav className="ux-crumb p7-crumb" aria-label="Breadcrumb">
          <Link href="/blindtest">Blindtest</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Ranked</span>
        </nav>
        <RankedCardLoader />
        <section className="ux-sec p7-sec" aria-labelledby="p7-tiers-h">
          <h2 id="p7-tiers-h" className="ux-h2 p7-h2">Tiers</h2>
          <RankedTiersLoader />
          <p className="ux-help p7-help">Each tier has three divisions, III to I. You can move up during a season, never down.</p>
        </section>
        <RankedLadderLoader />
        <HowRankedWorks />
        <SeasonRewards />
      </RankedControllerLoader>
    </UxPage>
  );
}
