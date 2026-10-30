import { jsonLdString } from '@/lib/seo/json-ld';
import Link from 'next/link';

import { Icon } from '@/components/ux-v1/icon';
import { UxPage } from '@/components/ux-v1/page';
import { SectionHeader } from '@/components/ux-v1/section-header';
import { STATIC_MODES } from '@/lib/blind-test-modes';
import { getThemeState } from '@/lib/growth/bt-data';
import { LANDING_COPY } from '@/lib/growth/bt-landing';
import { BT_STRINGS_EN } from '@/lib/growth/bt-strings';
import { isThemePage, themeCard, visibleThemes } from '@/lib/growth/bt-themes';
import { getGroupPopularity, getPlayableGroups, getSongCount, getTodayPlayers, hasDbEnv, keepLastGoodCopyOnFailure, popularSix, readBudgetMs, settle, utcDay } from '@/lib/ux-v1/p6/hub-data';
import { joinSiteUrl } from '@/lib/site/base-path';
import { GENRE, IS_KPOP } from '@/lib/site/genre';
import { SITE } from '@/lib/site/registry';
import { isUxV12 } from '@/lib/ux-v12';
import { jsonLdScript } from '@/lib/verse/jsonld';

import { BtHubLangRow, BtHubLiveBand, BtHubPlaylists } from './hub-v12';

import {
  BtBoardLoader,
  BtChallengeCardLoader,
  BtDailyCardLoader,
  BtGroupIndexLoader,
  BtHubControllerLoader,
  BtLiveCountLoader,
  BtRankedFootLoader,
  BtSetupLoader,
} from './loader';

import type { BtGroup } from '@/lib/ux-v1/p6/playlists';

// The v11 blindtest hub, day mode (DESIGN-SPEC 16.7, 17.5, 17.10, 17.11; prototype
// #blindtest). Server component: the page stays Static/ISR and everything a
// crawler reads is in the HTML. SEO lock (brief + 16.10): the H1, the intro, the
// FAQ (questions, answers, FAQPage JSON-LD), the WebApplication and BreadcrumbList
// JSON-LD, the metadata and every playlist link of today's page are unchanged;
// only the layout around them is the prototype's. The breadcrumb alone moved, with the
// flag-off page, to K-pop games > Blind test (SEO Mission 2, 2026-10-15).

export interface FaqItem { q: string; a: string }

interface HubProps {
  faq: readonly FaqItem[];
  faqJsonLd: Record<string, unknown>;
  webAppJsonLd: Record<string, unknown>;
}

// SEO Mission 2 (owner, 2026-10-15): the blind test is one of the K-pop games, so its
// breadcrumb is K-pop games > Blind test, visible above the hero and in this BreadcrumbList,
// the same names as the visible links. The flag-off page (app/(site)/blindtest/page.tsx)
// carries the same trail.
const BREADCRUMB_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  // Run O1: /kpop-games is a kpop page; another site keeps the trail it had (Home > Blind Test, its own home: joinSiteUrl gives
  // https://bunnyverse.org/anime without the trailing slash Next answers with a 308, and https://bunnyverse.org/ on the hub).
  itemListElement: IS_KPOP ? [
    { '@type': 'ListItem', position: 1, name: 'K-pop games', item: 'https://kpopquiz.org/kpop-games' },
    { '@type': 'ListItem', position: 2, name: 'Blind test', item: 'https://kpopquiz.org/blindtest' },
  ] : [
    { '@type': 'ListItem', position: 1, name: 'Home', item: joinSiteUrl(SITE.url, '/') },
    { '@type': 'ListItem', position: 2, name: 'Blind Test' },
  ],
};

export async function BlindtestHubV11({ faq, faqJsonLd, webAppJsonLd }: HubProps): Promise<React.ReactElement> {
  // Every read settles to a fail-soft value outside the caches (a failed read is
  // never cached, C3-009); then a production ISR regeneration with a failed read
  // keeps the last good copy instead of caching the fail-soft one.
  const db = hasDbEnv();
  const none = async <T,>(v: T): Promise<T> => v;
  const budget = readBudgetMs();
  // V12 (flag only): which themed playlists are playable, and their real song counts.
  // Flag off: no read, and nothing below changes.
  const v12 = isUxV12();
  const [playlists, songs, popularity, today, themes] = await Promise.all([
    settle(db ? () => getPlayableGroups() : () => none<BtGroup[]>([]), [] as BtGroup[], budget),
    settle(db ? () => getSongCount() : () => none(0), 0, budget),
    settle(db ? () => getGroupPopularity() : () => none({ blindtest: {}, quiz: {} }), { blindtest: {}, quiz: {} }, budget),
    settle(db ? () => getTodayPlayers(utcDay()) : () => none(0), 0, budget),
    v12 && IS_KPOP ? getThemeState() : null,
  ]);
  const failed = [
    ...(playlists.ok ? [] : ['playlists']),
    ...(songs.ok ? [] : ['songs']),
    ...(popularity.ok ? [] : ['popularity']),
    ...(today.ok ? [] : ['today']),
  ];
  keepLastGoodCopyOnFailure(failed);
  const groups: BtGroup[] = playlists.value;
  const popular = popularSix(groups, popularity.value);
  // The theme links: with V12 on a themed mode under 10 playable songs is hidden
  // (no dead door); every v11 mode keeps its link in both flag states.
  // The static and themed playlists are kpop's (STATIC_MODES, bt-themes): another site offers its own, none for now.
  const modes = !IS_KPOP ? [] : themes ? STATIC_MODES.filter((m) => !isThemePage(m.id) || themes.playable.has(m.id)) : STATIC_MODES;
  const themeCards = themes
    ? visibleThemes(themes.playable).map((t) => themeCard(t, 'en', themes.counts, { num: BT_STRINGS_EN.num, songsCount: LANDING_COPY.en.songsCount }))
    : [];
  const themePicks = themes ? themeCards.filter((c) => isThemePage(c.href.slice('/blindtest/'.length))).map((c) => ({ playlist: c.href.slice('/blindtest/'.length), label: c.name })) : undefined;

  // V12 additions share the slot of the v11 section next to them (a fragment that exists
  // only with the flag on), so the v11-only tree keeps the exact shape it had: React derives
  // useId (the playlist popover's id) from the position and the NUMBER of siblings, and an
  // extra empty child would change that id in the v11-only HTML.
  const ways = (
    <section className="ux-sec" aria-labelledby="p6-ways-h">
      <SectionHeader id="p6-ways-h" title="Ways to play" icon="music" />
      <div className="p6-mgrid">
        <BtDailyCardLoader />
        {SITE.features.ranked ? (
          <Link className="p6-mcard" href="/blindtest/ranked">
            <Icon name="trophy" size="lg" />
            <h3>Ranked</h3>
            <p>A fixed pool, speed and combos count. Your five best runs make your season score.</p>
            <BtRankedFootLoader />
          </Link>
        ) : null}
        <BtChallengeCardLoader />
      </div>
    </section>
  );
  const faqSection = (
    <section className="ux-sec p6-faq" aria-labelledby="p6-faq-h">
      <h2 id="p6-faq-h" className="ux-h2">Frequently asked questions</h2>
      {faq.map(({ q, a }) => (
        <details className="p6-acc" key={q}>
          <summary>{q}<Icon name="chev" /></summary>
          <p className="p6-ab">{a}</p>
        </details>
      ))}
    </section>
  );

  return (
    <UxPage width="full" padded={false} className="p6">
      {jsonLdScript(BREADCRUMB_JSONLD)}
      <BtHubControllerLoader groups={groups} songs={songs.value} {...(themePicks ? { themes: themePicks } : {})}>
        {IS_KPOP ? (
          <nav className="ux-crumb kg-crumb" aria-label="Breadcrumb">
            <Link href="/kpop-games">K-pop games</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Blind test</span>
          </nav>
        ) : null}
        <section className="p6-hero" id="bt-start" aria-labelledby="p6-h1">
          <div className="p6-bars" aria-hidden="true">
            {Array.from({ length: 10 }, (_, i) => <i key={i} />)}
          </div>
          <BtLiveCountLoader initial={today.value} />
          <h1 id="p6-h1" className="p6-display">Name that<br /><span>{`${GENRE} ${SITE.vocabulary.song}`}</span></h1>
          <p className="p6-lead">10 songs. 10 seconds each. Guess the song or the artist from a clip.</p>
          <BtSetupLoader />
        </section>

        {v12 ? <><BtHubPlaylists cards={themeCards} />{ways}{SITE.features.live ? <BtHubLiveBand /> : null}</> : ways}

        <section className="ux-sec p6-two">
          <div>
            <SectionHeader id="p6-board-h" title="Today's board" icon="trophy" sub="Resets at midnight UTC" />
            <BtBoardLoader />
          </div>
          <div>
            <SectionHeader id="p6-how-h" title="How it works" icon="bulb" />
            <ol className="ux-rows p6-how">
              <li className="p6-qrow"><span className="p6-n">1</span><div><p>Pick a playlist</p><p className="p6-qs">{IS_KPOP ? 'All K-pop, a group, or a generation.' : `All ${GENRE} or one ${SITE.vocabulary.topic}.`}</p></div></li>
              <li className="p6-qrow"><span className="p6-n">2</span><div><p>Listen to a ten-second clip</p><p className="p6-qs">Usually the chorus.</p></div></li>
              <li className="p6-qrow"><span className="p6-n">3</span><div><p>Pick the song or the artist</p><p className="p6-qs">100 points for a right answer, up to 100 more for speed, and combos multiply your points.</p></div></li>
            </ol>
          </div>
        </section>

        {groups.length > 0 ? (
          <section className="ux-sec p6-btg" aria-labelledby="p6-btg-h">
            <BtGroupIndexLoader popular={popular} />
            {modes.length > 0 ? (
              <p className="p6-themes">
                <b>Theme playlists</b>
                {modes.map((m) => <Link key={m.id} href={`/blindtest/${m.id}`}>{m.title}</Link>)}
              </p>
            ) : null}
          </section>
        ) : (
          // Min-gate: no group list (a DB blip on this render) = no empty index; the
          // theme playlists (a code constant) keep their links.
          modes.length > 0 ? (
            <p className="ux-sec p6-themes">
              <b>Theme playlists</b>
              {modes.map((m) => <Link key={m.id} href={`/blindtest/${m.id}`}>{m.title}</Link>)}
            </p>
          ) : null
        )}

        {v12 ? <>{faqSection}{SITE.features.localizedLandings ? <BtHubLangRow /> : null}</> : faqSection}
      </BtHubControllerLoader>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(webAppJsonLd) }} />
    </UxPage>
  );
}
