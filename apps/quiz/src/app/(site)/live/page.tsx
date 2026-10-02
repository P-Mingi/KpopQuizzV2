import { notFound } from 'next/navigation';

import { LiveStage } from '@/components/live/stage';
import { Icon } from '@/components/ux-v1/icon';
import { UxPage } from '@/components/ux-v1/page';
import { SectionHeader } from '@/components/ux-v1/section-header';
import { Steps3 } from '@/components/ux-v1/steps';
import { isUxV12 } from '@/lib/ux-v12';

import type { Metadata } from 'next';

// /live (SYSTEM.md 5.5; prototype view `livegame`): the host screen of a live
// blindtest. One screen hosts, everyone answers on their phone at /join.
// Flag off: the URL does not exist (the middleware sends it to `/`, and this page
// would 404). Flag on: a new URL, noindex, never in the sitemap.
//
// The page is static: the head and "How live works" render on the server, the
// room itself lives in the client island (components/live/stage.tsx) and talks to
// /api/live. Until docs/pending-migrations/v12-g4-live.sql is applied those
// routes answer 503 and the screen says the mode is not open yet.

export function generateMetadata(): Metadata {
  if (!isUxV12()) return {};
  return {
    title: 'Live blindtest',
    description: 'Host a live K-pop blindtest: one screen plays the clips, everyone answers on their phone. No account needed to join.',
    alternates: { canonical: '/live' },
    robots: { index: false, follow: false },
  };
}

const STEPS = [
  { title: 'Host on a big screen', body: 'TV, laptop or your stream. Pick a playlist, then show the code.' },
  { title: 'Everyone scans', body: 'Phones join at kpopquiz.org/join with the QR or the code. A nickname is enough.' },
  { title: 'Fastest right answer wins', body: 'Up to 1,000 points a round, a streak bonus, and a podium at the end.' },
] as const;

export default function LivePage(): React.ReactElement {
  if (!isUxV12()) notFound();
  return (
    <UxPage width="wide" className="ux-live-page">
      <div className="ux-live-hostbar">
        <div>
          <span className="ux-kicker"><Icon name="users" />Live blindtest</span>
          <h1 className="ux-h1">Play a live blindtest with friends</h1>
          <p className="ux-muted">One screen hosts, everyone answers on their phone. No account needed to join.</p>
        </div>
      </div>
      <LiveStage />
      <section className="ux-sec" aria-labelledby="ux-live-how">
        <SectionHeader icon="bulb" title="How live works" id="ux-live-how" />
        <Steps3 steps={STEPS} />
      </section>
    </UxPage>
  );
}
