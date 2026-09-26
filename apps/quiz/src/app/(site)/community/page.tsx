import { notFound } from 'next/navigation';

import { EditorProvider } from '@/components/community/ux-v1/editor';
import { Composer, CommunityFeed } from '@/components/community/ux-v1/feed';
import { DebatePanel } from '@/components/community/ux-v1/debate-panel';
import { BadgePanel, HappeningPanel, MobileRail } from '@/components/community/ux-v1/rail';
import { P8ViewerProvider } from '@/components/community/ux-v1/viewer';
import { WarStrip } from '@/components/community/ux-v1/war-strip';
import { UxPage } from '@/components/ux-v1/page';
import { safeFetch } from '@/lib/error-handling';
import { UX_V1 } from '@/lib/ux-v1';
import { getP8Features, NO_FEATURES } from '@/lib/ux-v1/p8/features';
import { feedSources, getP8Groups, mergeFeed } from '@/lib/ux-v1/p8/feed';
import { utcDate } from '@/lib/ux-v1/p8/format';
import { getBadgeWatch, getHappening, getPulse, getTodayDebate, getWarEntries } from '@/lib/ux-v1/p8/rail';

import type { FeedPost } from '@/lib/ux-v1/p8/types';
import type { Metadata } from 'next';

// /community (DESIGN-SPEC 12.1 / 13 / 16.7 / 17.7; prototype view #community).
// Flag OFF: the middleware does not know this route and 301s it to / exactly like
// today (lib/route-allowlist UX_V1_ROUTES); notFound() here is only a backstop.
// Flag ON: a NEW public URL, so noindex (follow) and out of the sitemap until the
// owner decides (its posts duplicate /verse content). All data is real and read
// only (lib/ux-v1/p8); each source fails closed on its own (safeFetch).

export async function generateMetadata(): Promise<Metadata> {
  if (!UX_V1) return {};
  return {
    title: 'Community',
    description: 'Threads, blogs, debates and score challenges from every K-pop fandom, the daily debate and what fans are playing right now on kpopquiz.org.',
    alternates: { canonical: '/community' },
    robots: { index: false, follow: true },
  };
}

/** Every read of the page (server time taken here, once per request). */
async function loadCommunity() {
  const now = Date.now();
  const features = await safeFetch(getP8Features(), NO_FEATURES, '[p8] features');
  const src = feedSources(features, now);
  const [threads, blogs, debates, fanDebates, challenges, groups, today, happening, pulse, badges, war] = await Promise.all([
    // The posts are the page: give a slow database 8s before falling back (the
    // timed-out read still fills its cache for the next visit).
    safeFetch<FeedPost[] | null>(src.threads, null, '[p8] threads', 8000),
    safeFetch<FeedPost[] | null>(src.blogs, null, '[p8] blogs', 8000),
    safeFetch<FeedPost[] | null>(src.debates, null, '[p8] debates', 8000),
    safeFetch<FeedPost[] | null>(src.fanDebates, null, '[p8] fan debates', 8000),
    safeFetch<FeedPost[] | null>(src.challenges, null, '[p8] challenges', 8000),
    safeFetch(getP8Groups(), [], '[p8] groups'),
    safeFetch(getTodayDebate(utcDate(now)), null, '[p8] today debate'),
    safeFetch(getHappening(5, now), [], '[p8] happening'),
    safeFetch(getPulse(utcDate(now), features), { posts: 0, votesToday: 0, newQuizzesWeek: 0 }, '[p8] pulse'),
    safeFetch(getBadgeWatch(3, utcDate(now)), [], '[p8] badges'),
    safeFetch(getWarEntries(), [], '[p8] war'),
  ]);
  const posts = mergeFeed([threads ?? [], blogs ?? [], debates ?? [], fanDebates ?? [], challenges ?? []], now);
  // Every always-on source failed (DB blip): say so, never "no posts yet".
  const loadFailed = threads === null && blogs === null && debates === null;
  const editorGroups = groups.map((g) => ({ id: g.id, name: g.name, slug: g.slug }));
  return { features, posts, loadFailed, editorGroups, today, happening, pulse, badges, war };
}

export default async function CommunityPage(): Promise<React.ReactElement> {
  if (!UX_V1) notFound();
  const { features, posts, loadFailed, editorGroups, today, happening, pulse, badges, war } = await loadCommunity();

  const mtop = (
    <>
      {war.length ? <div className="p8-mtop" style={{ marginTop: 8 }}><WarStrip entries={war} /></div> : null}
      {today ? <div className="p8-mtop" style={{ marginTop: 24 }}><DebatePanel debate={today} variant="mobile" /></div> : null}
    </>
  );

  return (
    <UxPage width="wide" className="p8-page">
      <P8ViewerProvider>
        <EditorProvider groups={editorGroups} features={features}>
          <div className="p8-cgrid">
            <div className="p8-main">
              <header className="ux-ph">
                <h1>Community</h1>
                <p>Threads, blogs, debates and score challenges from every fandom.</p>
              </header>
              <Composer />
              <CommunityFeed posts={posts} loadFailed={loadFailed} mtop={mtop} mrail={<MobileRail rows={happening} pulse={pulse} badges={badges} />} />
            </div>
            <aside className="p8-rail" aria-label="Community activity">
              {today ? <DebatePanel debate={today} /> : null}
              <HappeningPanel rows={happening} pulse={pulse} />
              <BadgePanel rows={badges} />
            </aside>
          </div>
        </EditorProvider>
      </P8ViewerProvider>
    </UxPage>
  );
}
