import Link from 'next/link';

import { Icon } from '@/components/ux-v1/icon';
import { UxPage } from '@/components/ux-v1/page';
import { SectionHeader } from '@/components/ux-v1/section-header';
import { getAdvertisablePlaylists } from '@/lib/blind-test-playlists';
import { STATIC_MODES } from '@/lib/blind-test-modes';
import { getBlindtestStats } from '@/lib/db/queries/blindtest';
import { safeFetch } from '@/lib/error-handling';
import { getGroupPopularity, getTodayPlayers, popularSix } from '@/lib/ux-v1/p6/hub-data';
import { jsonLdScript } from '@/lib/verse/jsonld';

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
// only the layout around them is the prototype's.

export interface FaqItem { q: string; a: string }

interface HubProps {
  faq: readonly FaqItem[];
  faqJsonLd: Record<string, unknown>;
  webAppJsonLd: Record<string, unknown>;
}

// Same BreadcrumbList JSON-LD as today's <Breadcrumbs> (Home > Blind Test).
const BREADCRUMB_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://kpopquiz.org/' },
    { '@type': 'ListItem', position: 2, name: 'Blind Test' },
  ],
};

async function songsInPool(): Promise<number> {
  try {
    return (await getBlindtestStats()).songs;
  } catch {
    return 0;
  }
}

export async function BlindtestHubV11({ faq, faqJsonLd, webAppJsonLd }: HubProps): Promise<React.ReactElement> {
  const [playlists, songs, popularity, today] = await Promise.all([
    safeFetch(getAdvertisablePlaylists(), { staticModes: [], groups: [] }, '[blindtest v11] getAdvertisablePlaylists'),
    songsInPool(),
    safeFetch(getGroupPopularity(), { blindtest: {}, quiz: {} }, '[blindtest v11] getGroupPopularity'),
    safeFetch(getTodayPlayers(), 0, '[blindtest v11] getTodayPlayers'),
  ]);
  const groups: BtGroup[] = playlists.groups.map((g) => ({ slug: g.slug, name: g.name, songs: g.songs }));
  const popular = popularSix(groups, popularity);

  return (
    <UxPage width="full" padded={false} className="p6">
      {jsonLdScript(BREADCRUMB_JSONLD)}
      <BtHubControllerLoader groups={groups} songs={songs}>
        <section className="p6-hero" id="bt-start" aria-labelledby="p6-h1">
          <div className="p6-bars" aria-hidden="true">
            {Array.from({ length: 10 }, (_, i) => <i key={i} />)}
          </div>
          <BtLiveCountLoader initial={today} />
          <h1 id="p6-h1" className="p6-display">Name that<br /><span>K-pop song</span></h1>
          <p className="p6-lead">10 songs. 10 seconds each. Guess the song or the artist from a clip.</p>
          <BtSetupLoader />
        </section>

        <section className="ux-sec" aria-labelledby="p6-ways-h">
          <SectionHeader id="p6-ways-h" title="Ways to play" icon="music" />
          <div className="p6-mgrid">
            <BtDailyCardLoader />
            <Link className="p6-mcard" href="/blindtest/ranked">
              <Icon name="trophy" size="lg" />
              <h3>Ranked</h3>
              <p>A fixed pool, speed and combos count. Your five best runs make your season score.</p>
              <BtRankedFootLoader />
            </Link>
            <BtChallengeCardLoader />
          </div>
        </section>

        <section className="ux-sec p6-two">
          <div>
            <SectionHeader id="p6-board-h" title="Today's board" icon="trophy" sub="Resets at midnight UTC" />
            <BtBoardLoader />
          </div>
          <div>
            <SectionHeader id="p6-how-h" title="How it works" icon="bulb" />
            <ol className="ux-rows p6-how">
              <li className="p6-qrow"><span className="p6-n">1</span><div><p>Pick a playlist</p><p className="p6-qs">All K-pop, a group, or a generation.</p></div></li>
              <li className="p6-qrow"><span className="p6-n">2</span><div><p>Listen to a ten-second clip</p><p className="p6-qs">Usually the chorus.</p></div></li>
              <li className="p6-qrow"><span className="p6-n">3</span><div><p>Pick the song or the artist</p><p className="p6-qs">100 points for a right answer, up to 100 more for speed, and combos multiply your points.</p></div></li>
            </ol>
          </div>
        </section>

        {groups.length > 0 ? (
          <section className="ux-sec p6-btg" aria-labelledby="p6-btg-h">
            <BtGroupIndexLoader popular={popular} />
            <p className="p6-themes">
              <b>Theme playlists</b>
              {STATIC_MODES.map((m) => <Link key={m.id} href={`/blindtest/${m.id}`}>{m.title}</Link>)}
            </p>
          </section>
        ) : (
          // Min-gate: no group list (a DB blip on this render) = no empty index; the
          // theme playlists (a code constant) keep their links.
          <p className="ux-sec p6-themes">
            <b>Theme playlists</b>
            {STATIC_MODES.map((m) => <Link key={m.id} href={`/blindtest/${m.id}`}>{m.title}</Link>)}
          </p>
        )}

        <section className="ux-sec p6-faq" aria-labelledby="p6-faq-h">
          <h2 id="p6-faq-h" className="ux-h2">Frequently asked questions</h2>
          {faq.map(({ q, a }) => (
            <details className="p6-acc" key={q}>
              <summary>{q}<Icon name="chev" /></summary>
              <p className="p6-ab">{a}</p>
            </details>
          ))}
        </section>
      </BtHubControllerLoader>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }} />
    </UxPage>
  );
}
