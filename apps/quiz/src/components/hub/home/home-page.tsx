// Run O1, lot H2a: the new Bunnyverse home (docs/o1/design/fanquiz-hub/), block by block. Each block takes its data from one loader of
// lib/site/hub/home-*.ts; the page is the composition and the structured data.
// Lot H2c: a block whose data is missing (null or empty) is left out and the page around it adapts, as the design's sc-if does; the
// links of the top bar to a missing block go with it.
// Home v4 (2026-11-10, HOME-AUDIT.md section 4, validated prototype home-v4-prototype/): one column of full-width bands, each with one job, in
// the order of the audit: the hero (H1, definition, line, buttons, and the "Your day" or account card), Today's games (the one contained panel),
// Pick your side, Popular this week beside the Quick question, When K-pop meets anime, Community, then What is Bunnyverse? (the SEO block, in the
// server HTML, text and table untouched) and the footer (no link to kpopquiz.org, SEO rule 16). DOM order is the reading order, and the mobile
// order. A band whose data is missing leaves the page and the others keep their place (safeBlock loaders).
// The structured data is unchanged: the WebSite and the ItemList, which keeps its own name (hp.hot.listName, "Hot right now") though the visible
// heading is now "Popular this week".
import { jsonLdString } from '@/lib/seo/json-ld';
import { ht } from '@/lib/site/hub/copy';
import { hotItemListJsonLd } from '@/lib/site/hub/home-jsonld';
import { homeUrl } from '@/lib/site/hub/home-types';
import { websiteJsonLdFor } from '@/lib/site/jsonld';

import { HomeCommunity, communitySub } from './home-community';
import { HomeCrossover } from './home-crossover';
import { HomeDayProvider } from './home-day';
import { HomeFilterProvider } from './home-filter';
import { dmMono, dmSans } from './home-font';
import { HomeFooter } from './home-footer';
import { HomeHero, surprisePool } from './home-hero';
import { HomeHot } from './home-hot';
import { HomeNav } from './home-nav';
import { HomeSites } from './home-sites';
import { siteName } from './home-names';
import { HomeQuick } from './home-quick';
import { HomeSeo } from './home-seo';
import { HomeToday } from './home-today';
import { DAY_GAMES } from './home-day-logic';

import type { HotCard } from './home-hot';
import type { LiveIcons } from '@/lib/photos/icons-read';
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
  /** The icon slots of the daily rows and games (lib/photos/icons-read.ts), each live or its defaults. */
  readonly icons: LiveIcons;
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
    // The quiz's own cover, else the photo of its group or series (owner decision 2026-10-30), else null for the initials.
    cover: q.cover ?? q.photo ?? null,
  };
}

export function HomePage({ data }: { data: HomeData }): React.ReactElement {
  const { hot, viewer, today, quick, crossover, assets, icons, burrow } = data;
  const description = ht('hp.meta.description');
  const lists = hot
    ? { all: hot.all.map(card), kpop: hot.kpop.map(card), anime: hot.anime.map(card), easy: hot.easy.map(card) }
    : null;
  const hasFans = data.fans.kpop.length > 0 || data.fans.anime.length > 0;
  const community = communitySub(!!today?.debate, hasFans) !== null;
  const games = burrow ? DAY_GAMES : [];
  const todayShown = !!today || burrow;
  const splitOne = !(hot && lists) || !quick ? ' hub-h2-split-one' : '';
  return (
    <div className={`hub-h2-home ${dmSans.variable} ${dmMono.variable}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(websiteJsonLdFor(description)) }} />
      {hot ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(hotItemListJsonLd(ht('hp.hot.listName'), hot.all)) }} /> : null}
      <HomeFilterProvider>
        <HomeDayProvider games={games}>
          <HomeNav viewer={viewer} sections={{ hot: !!hot, blindtest: !!today?.blindtest, community }} burrow={burrow} />
          <main id="main" tabIndex={-1} className="hub-h2-main">
            <HomeHero
              viewer={viewer}
              pool={surprisePool(data.surprise)}
              playedIds={data.surprise.playedIds}
              today={today}
              done={data.done}
              games={games}
              todayShown={todayShown}
            />
            {todayShown ? <HomeToday today={today} viewer={viewer} done={data.done} assets={assets} icons={icons} burrow={burrow} /> : null}
            {data.doors.length > 0 ? <HomeSites doors={data.doors} assets={assets} /> : null}
            {(hot && lists) || quick ? (
              <section id={hot ? 'hot' : undefined} aria-labelledby={hot ? 'hot-h' : 'quick-h'} className="hub-h2-band hub-h2-wrap">
                <div className={`hub-h2-split${splitOne}`}>
                  {hot && lists ? (
                    <HomeHot
                      lists={lists}
                      allLinks={[
                        { site: 'kpop', href: homeUrl({ site: 'kpop', path: hot.allPaths.kpop }), label: ht('hp.hot.allKpop', { name: siteName('kpop') }) },
                        { site: 'anime', href: homeUrl({ site: 'anime', path: hot.allPaths.anime }), label: ht('hp.hot.allAnime', { name: siteName('anime') }) },
                      ]}
                      labels={{
                        title: ht('hp.hot.title'),
                        sub: ht('hp.hot.sub', { kpopName: siteName('kpop'), animeName: siteName('anime') }),
                        filter: ht('hp.hot.filter'),
                        all: ht('hp.hot.all'),
                        kpop: siteName('kpop'),
                        anime: siteName('anime'),
                        newLabel: ht('hp.hot.new'),
                      }}
                    />
                  ) : null}
                  {quick ? <HomeQuick quick={quick} level={hot ? 'h3' : 'h2'} /> : null}
                </div>
              </section>
            ) : null}
            {crossover ? <HomeCrossover data={crossover} assets={assets} /> : null}
            <HomeCommunity fans={data.fans} viewer={viewer} debate={today?.debate ?? null} assets={assets} icons={icons} />
            <HomeSeo today={today} burrow={burrow} />
          </main>
          <HomeFooter burrow={burrow} />
        </HomeDayProvider>
      </HomeFilterProvider>
    </div>
  );
}
