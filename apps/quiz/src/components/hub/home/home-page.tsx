// Run O1, lot H2a: the new Bunnyverse home (docs/o1/design/fanquiz-hub/), block by block. Each block takes its data from one loader of
// lib/site/hub/home-*.ts; the page is the composition and the structured data.
// Lot H2c: a block whose data is missing (null or empty) is left out and the grid around it adapts, as the design's sc-if does; the
// links of the top bar to a missing block go with it.
// Home v3 (2026-10-29, docs/strategy/o1/dle/prototype/Home.dc.html, validated): two columns, images first. Each row has a left column of
// about 65% (what fans come for) and a right one of about 35% (what changes every day, as rows); one column under 980 px, where the right
// column follows the left one. Row 1: the title, Surprise me and the two sites | Today. Row 2: Hot right now | 60 seconds and Did you know.
// Row 3: When K-pop meets anime | Top fans per site and the passport. Then the SEO block in server HTML and the footer (no link to
// kpopquiz.org, SEO rule 16). DOM order is the reading order: left column, then right column, row by row.
import { jsonLdString } from '@/lib/seo/json-ld';
import { ht } from '@/lib/site/hub/copy';
import { hotItemListJsonLd } from '@/lib/site/hub/home-jsonld';
import { homeUrl } from '@/lib/site/hub/home-types';
import { websiteJsonLdFor } from '@/lib/site/jsonld';

import { HomeCommunity } from './home-community';
import { HomeCrossover } from './home-crossover';
import { HomeFilterProvider } from './home-filter';
import { dmMono, dmSans } from './home-font';
import { HomeFooter } from './home-footer';
import { HomeHero, surprisePool } from './home-hero';
import { HomeHot } from './home-hot';
import { HomeNav } from './home-nav';
import { siteName } from './home-names';
import { HomeQuick } from './home-quick';
import { HomeSeo } from './home-seo';
import { HomeToday, todayLeft } from './home-today';

import type { HotCard } from './home-hot';
import type { HomeAssets } from '@/lib/site/hub/home-assets';
import type {
  HomeCrossover as HomeCrossoverData, HomeDone, HomeDoor, HomeFans, HomeHot as HomeHotData, HomeQuick as HomeQuickData, HomeQuiz, HomeSurprise,
  HomeToday as HomeTodayData, HomeViewer,
} from '@/lib/site/hub/home-types';

export interface HomeData {
  readonly viewer: HomeViewer | null;
  readonly doors: readonly HomeDoor[];
  readonly surprise: HomeSurprise;
  readonly today: HomeTodayData | null;
  readonly done: HomeDone;
  readonly quick: HomeQuickData | null;
  readonly hot: HomeHotData | null;
  readonly crossover: HomeCrossoverData | null;
  readonly fans: HomeFans;
  readonly assets: HomeAssets;
  /** The Burrow (Kpopdle and Otakudle) is open: the dailyGuess flag is on and the hub has its pages (lib/site/hub/daily-guess.ts). */
  readonly burrow: boolean;
}

function card(q: HomeQuiz): HotCard {
  return {
    site: q.site,
    tile: q.tile,
    title: q.title,
    href: homeUrl(q),
    line: ht('hp.hot.line', { name: siteName(q.site), group: q.group, meta: q.format ? `${q.level} · ${q.format}` : q.level }),
    plays: q.plays,
    isNew: q.isNew,
    cover: q.cover,
  };
}

/** A row of the grid: two columns, or one when a side is missing (the other then takes the whole width). */
function Row({ first, left, right }: { first?: boolean; left: React.ReactNode; right: React.ReactNode }): React.ReactElement | null {
  if (!left && !right) return null;
  const one = !left || !right ? ' hub-h2-cols-one' : '';
  return <div className={`hub-h2-cols${first ? ' hub-h2-row1' : ' hub-h2-row'}${one}`}>{left}{right}</div>;
}

export function HomePage({ data }: { data: HomeData }): React.ReactElement {
  const { hot, viewer, today, quick, crossover, assets, burrow } = data;
  const description = ht('hp.meta.description');
  const lists = hot
    ? { all: hot.all.map(card), kpop: hot.kpop.map(card), anime: hot.anime.map(card), easy: hot.easy.map(card) }
    : null;
  const hasFans = data.fans.kpop.length > 0 || data.fans.anime.length > 0;
  return (
    <div className={`hub-h2-home ${dmSans.variable} ${dmMono.variable}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(websiteJsonLdFor(description)) }} />
      {hot ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(hotItemListJsonLd(ht('hp.hot.title'), hot.all)) }} /> : null}
      <HomeFilterProvider>
        <HomeNav
          viewer={viewer}
          sections={{ hot: !!hot, blindtest: !!today?.blindtest }}
          burrowLeft={burrow ? todayLeft(today, data.done, burrow) : null}
        />
        <main id="main" tabIndex={-1} className="hub-h2-main">
          <Row
            first
            left={<HomeHero doors={data.doors} pool={surprisePool(data.surprise)} playedIds={data.surprise.playedIds} assets={assets} />}
            right={today ? <HomeToday today={today} viewer={viewer} done={data.done} assets={assets} burrow={burrow} /> : null}
          />
          <Row
            left={hot && lists ? (
              <HomeHot
                lists={lists}
                allLinks={[
                  { site: 'kpop', href: homeUrl({ site: 'kpop', path: hot.allPaths.kpop }), label: ht('hp.hot.allKpop', { name: siteName('kpop') }) },
                  { site: 'anime', href: homeUrl({ site: 'anime', path: hot.allPaths.anime }), label: ht('hp.hot.allAnime', { name: siteName('anime') }) },
                ]}
                labels={{
                  title: ht('hp.hot.title'),
                  sub: ht('hp.hot.sub'),
                  filter: ht('hp.hot.filter'),
                  all: ht('hp.hot.all'),
                  kpop: siteName('kpop'),
                  anime: siteName('anime'),
                  easy: ht('hp.hot.easy'),
                  newLabel: ht('hp.hot.new'),
                }}
              />
            ) : null}
            right={quick ? <HomeQuick quick={quick} /> : null}
          />
          <Row
            left={crossover ? <HomeCrossover data={crossover} assets={assets} /> : null}
            right={<HomeCommunity fans={data.fans} viewer={viewer} hasFans={hasFans} />}
          />
          <HomeSeo today={today} burrow={burrow} />
        </main>
        <HomeFooter burrow={burrow} />
      </HomeFilterProvider>
    </div>
  );
}
