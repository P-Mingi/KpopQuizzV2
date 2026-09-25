import { ActivityTicker } from '@/components/home/activity-ticker';
import { UxPage } from '@/components/ux-v1/page';
import { UxQuizCard, UxQuizGrid } from '@/components/ux-v1/quiz-card';
import { SectionHeader } from '@/components/ux-v1/section-header';
import { safeFetch } from '@/lib/error-handling';
import { getHomeBand, getHomeCommunity, getHomeGroups, getHomeLists, getHomeQotd } from '@/lib/ux-v1/p1/home-data';

import { CommunityRows } from './community-rows';
import { GroupsRail } from './groups-rail';
import { BlindtestBand, ContinuePlaying, HomeHeader } from './islands';
import { QotdRow } from './qotd-row';
import { BestRows, NewRows } from './quiz-rows';

/**
 * UX v11.2 home (P1), rendered by app/(site)/page.tsx when NEXT_PUBLIC_UX_V1 is on.
 * Order (17.11 + 16.7): live ticker, centred header, quiz of the day, continue,
 * groups, trending, all time best | new, blindtest of the day band, community.
 * Server component, static/ISR: every read is public and cached, user state lives
 * in client islands (header greeting, continue, band played state). Each read is
 * fail-soft (safeFetch): a failing read hides its section (min-gate), never the page.
 */
export async function UxHome({ head }: { head?: React.ReactNode }): Promise<React.ReactElement> {
  const now = new Date();
  const [qotd, groups, community, band] = await Promise.all([
    safeFetch(getHomeQotd(now), null, '[ux-home] qotd'),
    safeFetch(getHomeGroups(), { groups: [], visibleGroups: 0 }, '[ux-home] groups'),
    safeFetch(getHomeCommunity(now), [], '[ux-home] community'),
    safeFetch(getHomeBand(now), { date: now.toISOString().slice(0, 10), fans: 0 }, '[ux-home] band'),
  ]);
  const lists = await safeFetch(
    getHomeLists(qotd ? [qotd.id] : [], now.getTime()),
    { trending: [], best: [], fresh: [] },
    '[ux-home] lists',
  );

  return (
    <UxPage width="wide" className="p1-home">
      {head}
      {/* Live ticker: the live component, imported as is (its two endpoints). The
          slot keeps its height so the page does not jump when it fills in. */}
      <div className="p1-ticker"><ActivityTicker /></div>

      <HomeHeader />

      {qotd ? <QotdRow qotd={qotd} /> : null}

      <ContinuePlaying />

      {groups.groups.length > 0 ? (
        <section className="ux-sec ux-sec-lg" aria-labelledby="p1-groups-h">
          <SectionHeader
            id="p1-groups-h"
            icon="users"
            title="Groups"
            action={groups.visibleGroups > 0 ? { href: '/groups', label: `All ${groups.visibleGroups} groups` } : { href: '/groups', label: 'All groups' }}
          />
          <GroupsRail groups={groups.groups} />
        </section>
      ) : null}

      {lists.trending.length > 0 ? (
        <section className="ux-sec ux-sec-lg" aria-labelledby="p1-trend-h">
          <SectionHeader id="p1-trend-h" icon="flame" title="Trending this week" action={{ href: '/quizzes/popular-this-week', label: 'See all' }} />
          <UxQuizGrid>
            {lists.trending.map((q) => <UxQuizCard key={q.id} quiz={q} />)}
          </UxQuizGrid>
        </section>
      ) : null}

      {lists.best.length > 0 || lists.fresh.length > 0 ? (
        <section className="ux-sec ux-sec-lg p1-two" aria-label="All time best and new quizzes">
          {lists.best.length > 0 ? (
            <div>
              <SectionHeader id="p1-best-h" icon="trophy" title="All time best" action={{ href: '/quizzes?sort=most_played', label: 'Most played' }} />
              <BestRows quizzes={lists.best} />
            </div>
          ) : null}
          {lists.fresh.length > 0 ? (
            <div>
              <SectionHeader id="p1-new-h" icon="star" title="New quizzes" action={{ href: '/quizzes?sort=newest', label: 'See all new' }} />
              <NewRows quizzes={lists.fresh} now={now} />
            </div>
          ) : null}
        </section>
      ) : null}

      <BlindtestBand fans={band.fans} date={band.date} />

      {community.length > 0 ? (
        <section className="ux-sec ux-sec-lg" aria-labelledby="p1-comm-h">
          <SectionHeader id="p1-comm-h" icon="msg" title="From the community" action={{ href: '/community', label: 'Open community' }} />
          <CommunityRows rows={community} />
        </section>
      ) : null}
    </UxPage>
  );
}
