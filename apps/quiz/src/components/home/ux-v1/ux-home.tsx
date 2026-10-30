import Link from 'next/link';

import { ActivityTicker } from '@/components/home/activity-ticker';
import { UxPage } from '@/components/ux-v1/page';
import { UxQuizCard, UxQuizGrid } from '@/components/ux-v1/quiz-card';
import { SectionHeader } from '@/components/ux-v1/section-header';
import { GENERATIONS_HUB_PATH } from '@/lib/generations/generations';
import { SERIES_ART } from '@/lib/ux-v1/a0/group-photos';
import { getHomeBand, getHomeCommunity, getHomeGroups, getHomeLists, getHomeQotd } from '@/lib/ux-v1/p1/home-data';
import { IS_KPOP, titleCase } from '@/lib/site/genre';
import { SITE } from '@/lib/site/registry';
import { RenderHealth, settleRender } from '@/lib/ux-v1/p1/render-health';

import { CommunityRows } from './community-rows';
import { GroupsRail } from './groups-rail';
import { BlindtestBand, ContinuePlaying, HomeHeader } from './islands';
import { QotdRow } from './qotd-row';
import { BestRows, NewRows } from './quiz-rows';

// The index of the site's topics: the groups of kpop, the series of anime (the registry vocabulary names them).
const TOPICS_HREF = IS_KPOP ? '/groups' : '/series';

/**
 * UX v11.2 home (P1), rendered by app/(site)/page.tsx when NEXT_PUBLIC_UX_V1 is on.
 * Order (17.11 + 16.7): live ticker, centred header, quiz of the day, continue,
 * groups, trending, all time best | new, blindtest of the day band, community.
 * Server component, static/ISR: every read is public and cached, user state lives
 * in client islands (header greeting, continue, band played state). Each read is
 * fail-soft (safeFetch): a failing read hides its section (min-gate), never the page,
 * and such a render is never kept in the page cache (render-health.ts, C3-003).
 */
export async function UxHome({ head, afterHeader }: {
  head?: React.ReactNode;
  /** A block right under the header, before the quiz of the day: the OtakuQuiz home passes its Surprise me there (TWINS row 1, A8);
   *  kpopquiz.org passes nothing and renders what it rendered. */
  afterHeader?: React.ReactNode;
}): Promise<React.ReactElement> {
  const now = new Date();
  const health = new RenderHealth();
  const [qotd, groups, community, band] = await Promise.all([
    health.read('qotd', getHomeQotd(now), null),
    health.read('groups', getHomeGroups(), { groups: [], visibleGroups: 0 }),
    health.read('community', getHomeCommunity(now), { rows: [], verse: null }),
    health.read('band', getHomeBand(now), { date: now.toISOString().slice(0, 10), fans: 0 }),
  ]);
  const lists = await health.read('lists', getHomeLists(qotd ? [qotd.id] : []), { trending: [], best: [], fresh: [] });
  // A render that lost a read is not cached: at runtime it throws (the cached page
  // stays), at build it is kept for 30 s only.
  await settleRender(health);
  const qotdRow = qotd ? <QotdRow qotd={qotd} /> : null;

  return (
    <UxPage width="wide" className="p1-home">
      {head}
      {/* Live ticker: the live component, imported as is (its two endpoints). The
          slot keeps its height so the page does not jump when it fills in. */}
      <div className="p1-ticker"><ActivityTicker /></div>

      <HomeHeader />

      {/* The quiz of the day. With an afterHeader block, the two share this one place of the tree (a fragment), so the
          page data of kpopquiz.org, which passes none, keeps its bytes. */}
      {afterHeader ? <>{afterHeader}{qotdRow}</> : qotdRow}

      {/* Every run saved on this device shows here (C2-004), even when its quiz is
          also in a list below: it is the fan's own run, with its resume link. */}
      <ContinuePlaying />

      {groups.groups.length > 0 ? (
        <section className="ux-sec ux-sec-lg" aria-labelledby="p1-groups-h">
          <SectionHeader
            id="p1-groups-h"
            icon="users"
            title={titleCase(SITE.vocabulary.topicPlural)}
            action={groups.visibleGroups > 0 ? { href: TOPICS_HREF, label: `All ${groups.visibleGroups} ${SITE.vocabulary.topicPlural}` } : { href: TOPICS_HREF, label: `All ${SITE.vocabulary.topicPlural}` }}
          />
          <GroupsRail groups={groups.groups} />
          {/* SEO Mission 2, part C: the generations hub, linked with its cluster anchor (Run O1: a kpop page, so kpop only). */}
          {IS_KPOP ? (
            <p className="p1-note" style={{ marginTop: 12 }}>
              <Link href={GENERATIONS_HUB_PATH}>K-pop generations</Link>: which era each group belongs to, with sources.
            </p>
          ) : null}
        </section>
      ) : null}

      {lists.trending.length > 0 ? (
        <section className="ux-sec ux-sec-lg" aria-labelledby="p1-trend-h">
          <SectionHeader id="p1-trend-h" icon="flame" title="Trending this week" action={{ href: '/quizzes/popular-this-week', label: 'See all' }} />
          {/* Six cards as the live home (four in view at 1440 as the prototype, the
              rest in the same scrolling row, like the groups rail). v12: eight, in two
              rows of four (styles/ux-v12/home.css). On the anime build (the SERIES_ART slot is
              filled there only) anime-o2-trend gives the series art the 4:3 cover of the kpop
              card (the O2 sheet of the anime site, owner 2026-10-29); kpop renders what it did. */}
          <div className={SERIES_ART.dress ? 'p1-trend anime-o2-trend' : 'p1-trend'}>
            <UxQuizGrid>
              {lists.trending.map((q) => <UxQuizCard key={q.id} quiz={q} />)}
            </UxQuizGrid>
          </div>
        </section>
      ) : null}

      {lists.best.length > 0 || lists.fresh.length > 0 ? (
        <section className="ux-sec ux-sec-lg p1-two" aria-label="All time best and new quizzes">
          {lists.best.length > 0 ? (
            <div>
              <SectionHeader id="p1-best-h" icon="trophy" title="All time best" action={{ href: '/most-liked', label: 'Most liked' }} />
              <BestRows quizzes={lists.best} />
            </div>
          ) : null}
          {lists.fresh.length > 0 ? (
            <div>
              <SectionHeader id="p1-new-h" icon="star" title="New quizzes" action={{ href: '/new', label: 'See all new' }} />
              <NewRows quizzes={lists.fresh} now={now} />
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Run C1: the daily blindtest band (songs, /blindtest/leaderboard) is a kpop feature; anime has no daily blindtest. */}
      {SITE.features.dailyBlindTest ? <BlindtestBand fans={band.fans} date={band.date} /> : null}

      {/* Always rendered: besides the rows it carries the live home's Discord links. */}
      <section className="ux-sec ux-sec-lg" aria-labelledby="p1-comm-h">
        <SectionHeader id="p1-comm-h" icon="msg" title="From the community" action={{ href: '/community', label: 'Open community' }} />
        <CommunityRows rows={community.rows} verse={community.verse} />
      </section>
    </UxPage>
  );
}
