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
import { isoWeek, weekRange } from '@/lib/site/hub/home-week';
import { websiteJsonLdFor } from '@/lib/site/jsonld';

import { HomeCommunity, communitySub } from './home-community';
import { HomeCards } from './home-cards';
import { HomeCrossover } from './home-crossover';
import { HomeDayProvider } from './home-day';
import { bigShoulders, dmMono, dmSans } from './home-font';
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
import { PageStickers } from '../page-stickers';

import type { HotCard, HotPanel } from './home-hot';
import type { LiveIcons } from '@/lib/photos/icons-read';
import type { HomeAssets } from '@/lib/site/hub/home-assets';
import type { PageSticker } from '@/lib/photos/stickers';
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
  /** The owner's stickers of the home (admin Photos, Stickers, page home); none when absent. */
  readonly stickers?: readonly PageSticker[];
  /** Bunnyverse bridges: the KpopCards band and tab. Set only with NET_CARDS and NET_CARDS_BRIDGES on (lib/cards-bridge/flags.ts); absent, the home is today's. */
  readonly cards?: boolean;
  /** The moment the page is built at (the week of the eyebrow of Popular this week); tests set it, the page reads the clock. */
  readonly now?: Date;
}

function card(q: HomeQuiz): HotCard {
  return {
    site: q.site,
    tile: q.tile,
    title: q.title,
    href: homeUrl(q),
    subject: q.group,
    level: q.level,
    format: q.format ?? null,
    // The plays of the week, the count the ranking is made of (lot HUB-HOT-B); null when the data does not carry it.
    weekPlays: q.weekPlays ?? null,
    isNew: q.isNew,
    cover: q.cover,
    // The picture of the group or series, the one its own pages show (owner decision 2026-10-30, lib/site/hub/home-hot.ts).
    groupImage: q.photo ?? null,
  };
}

export function HomePage({ data }: { data: HomeData }): React.ReactElement {
  const { hot, viewer, today, quick, crossover, assets, icons, burrow, stickers = [] } = data;
  const description = ht('hp.meta.description');
  const now = data.now ?? new Date();
  const panels: HotPanel[] | null = hot
    ? (['kpop', 'anime'] as const).map((site) => ({
        site,
        name: siteName(site),
        items: (hot.top?.[site] ?? []).map(card),
        seeAllHref: homeUrl({ site, path: hot.allPaths[site] }),
        seeAllLabel: ht(site === 'kpop' ? 'hp.hot.allKpop' : 'hp.hot.allAnime', { name: siteName(site) }),
      }))
    : null;
  const hasFans = data.fans.kpop.length > 0 || data.fans.anime.length > 0;
  const community = communitySub(!!today?.debate, hasFans) !== null;
  const games = burrow ? DAY_GAMES : [];
  const todayShown = !!today || burrow;
  const splitOne = !(hot && panels) || !quick ? ' hub-h2-split-one' : '';
  return (
    <div className={`hub-h2-home ${dmSans.variable} ${dmMono.variable} ${bigShoulders.variable}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(websiteJsonLdFor(description)) }} />
      {hot ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(hotItemListJsonLd(ht('hp.hot.listName'), hot.all)) }} /> : null}
        <HomeDayProvider games={games}>
          <HomeNav viewer={viewer} sections={{ hot: !!hot, blindtest: !!today?.blindtest, community }} burrow={burrow} {...(data.cards ? { cards: true } : {})} />
          <main id="main" tabIndex={-1} className="hub-h2-main">
            <PageStickers stickers={stickers} />
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
            {data.cards ? <HomeCards /> : null}
            {data.doors.length > 0 ? <HomeSites doors={data.doors} assets={assets} /> : null}
            {(hot && panels) || quick ? (
              <section id={hot ? 'hot' : undefined} aria-labelledby={hot ? 'hot-h' : 'quick-h'} className="hub-h2-band hub-h2-wrap">
                <div className={`hub-h2-split${splitOne}`}>
                  {hot && panels ? (
                    <HomeHot
                      panels={panels}
                      labels={{
                        title: ht('hp.hot.title'),
                        sub: ht('hp.hot.sub'),
                        eyebrow: ht('hp.hot.eyebrow', { week: isoWeek(now), range: weekRange(now) }),
                        seeAll: ht('hp.hot.seeAll'),
                        rank: ht('hp.hot.rank'),
                        newLabel: ht('hp.hot.new'),
                        empty: ht('hp.hot.empty'),
                        weekPlays: ht('hp.hot.weekPlays', { n: '{n}' }),
                        weekShort: ht('hp.hot.weekShort', { n: '{n}' }),
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
    </div>
  );
}
