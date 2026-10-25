// Run O1, lot H2a: the new FanQuiz home (docs/o1/design/fanquiz-hub/), block by block, in the order of the Plan: top bar, hero with the two
// doors and Surprise me, Today, 60 seconds, Hot right now, For you or Start easy, Crossover, Top fans and the passport, footer.
// Each block takes its data from one loader of lib/site/hub/home-*.ts; the page is the composition and the structured data.
import { jsonLdString } from '@/lib/seo/json-ld';
import { ht } from '@/lib/site/hub/copy';
import { hotItemListJsonLd } from '@/lib/site/hub/home-jsonld';
import { homeUrl, hotList } from '@/lib/site/hub/home-types';
import { websiteJsonLdFor } from '@/lib/site/jsonld';

import { HomeCommunity } from './home-community';
import { HomeCrossover } from './home-crossover';
import { dmSans } from './home-font';
import { HomeFooter } from './home-footer';
import { HomeForYou } from './home-foryou';
import { HomeHero, surprisePool } from './home-hero';
import { HomeHot } from './home-hot';
import { HomeNav } from './home-nav';
import { siteName } from './home-names';
import { HomeQuick } from './home-quick';
import { HomeToday } from './home-today';

import type { HotCard } from './home-hot';
import type {
  HomeCrossover as HomeCrossoverData, HomeDoor, HomeFan, HomeForYou as HomeForYouData, HomeHot as HomeHotData, HomeQuick as HomeQuickData,
  HomeQuiz, HomeToday as HomeTodayData, HomeViewer,
} from '@/lib/site/hub/home-types';

export interface HomeData {
  readonly viewer: HomeViewer | null;
  readonly doors: readonly HomeDoor[];
  readonly today: HomeTodayData;
  readonly quick: HomeQuickData;
  readonly hot: HomeHotData;
  readonly forYou: HomeForYouData;
  readonly crossover: HomeCrossoverData;
  readonly fans: readonly HomeFan[];
}

function card(q: HomeQuiz): HotCard {
  return {
    site: q.site,
    tile: q.tile,
    title: q.title,
    href: homeUrl(q),
    line: ht('hp.hot.label', { name: siteName(q.site), group: q.group }),
    meta: q.format ? `${q.level} · ${q.format}` : q.level,
    phoneMeta: q.level,
    plays: q.plays,
    isNew: q.isNew,
  };
}

export function HomePage({ data }: { data: HomeData }): React.ReactElement {
  const { hot, viewer } = data;
  const all = hotList(hot, 'all');
  const lists = { all: all.map(card), kpop: hotList(hot, 'kpop').map(card), anime: hotList(hot, 'anime').map(card) };
  const description = ht('hp.meta.description');
  return (
    <div className={`hub-h2-home ${dmSans.variable}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(websiteJsonLdFor(description)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(hotItemListJsonLd(ht('hp.hot.title'), all)) }} />
      <HomeNav viewer={viewer} />
      <main id="main" tabIndex={-1} className="hub-h2-main">
        <HomeHero doors={data.doors} pool={surprisePool([...hot.kpop, ...hot.anime])} />
        <HomeToday today={data.today} viewer={viewer} />
        <HomeQuick quick={data.quick} />
        <section id="hot" aria-labelledby="hot-h" className="hub-h2-sec">
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
              kpopShort: ht('hp.hot.kpopShort'),
              animeShort: ht('hp.hot.animeShort'),
              newLabel: ht('hp.hot.new'),
            }}
          />
        </section>
        <HomeForYou data={data.forYou} viewer={viewer} />
        <HomeCrossover data={data.crossover} />
        <HomeCommunity fans={data.fans} viewer={viewer} />
      </main>
      <HomeFooter />
    </div>
  );
}
