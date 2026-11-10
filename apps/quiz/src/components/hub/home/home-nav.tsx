// Run O1, lot H2a: the top bar of the new home. Hub chrome is ink and cream. Links to the sites are the registry origins (homeUrl).
// Home v3 (2026-10-29, Home.dc.html): the rabbit and the wordmark, then the tabs Home, The Burrow (with the number of today's games left),
// Quizzes, Community (owner, 2026-11-07: no Blind test tab, the blind test of the day stays in Today); on the right search and Sign in, or the level chip. The same tabs are the navigation of every other hub
// page (lib/ux-v1/a0/nav.ts, the hub entry). A tab whose target is not on the page is left out: The Burrow until its pages exist and the
// dailyGuess flag is on (lib/site/hub/daily-guess.ts), Quizzes without Hot right now.
// The EN/FR switch of the board is not drawn: the hub has no French page yet (the /fr pages come with the Burrow), and a switch to nowhere
// would be a dead door.
// Home v4 (2026-11-10, HOME-AUDIT.md P1-3, P1-7, P2-5): the tab is "Daily games" (the words live in the copy keys hp.nav.burrow and hp.foot.burrow only); its badge is
// the same count as the badge of every other hub page (the dle games left on this device), drawn once the browser knows it; the Community tab leads to
// the Community band and leaves with it; the level chip keeps "Lv N" and is named after the passport of the fan, a level per site.
// Review fixes: the level chip of a signed-in fan is the way to their passport page (/passport); the search button is named after the site
// whose search it opens (it follows the Hot filter), never "both sites".
import { BURROW_PATHS } from '@/lib/site/hub/daily-guess';
import { ht } from '@/lib/site/hub/copy';
import { homeUrl } from '@/lib/site/hub/home-types';

import { HomeNavBadge } from './home-day';
import { HomeSearch } from './home-filter';
import { PASSPORT_PATH, siteName } from './home-names';
import { HomeSignIn } from './home-signin';
import { HubWordmark, RabbitMark } from './home-ui';

import type { HomeViewer } from '@/lib/site/hub/home-types';

/** Which targets of the tabs are on the page. */
export interface HomeSections {
  readonly hot: boolean;
  readonly blindtest: boolean;
  /** The Community band is on the page (Home v4): its tab leaves the bar with it. */
  readonly community: boolean;
}

export function HomeNav({ viewer, sections, burrow }: { viewer: HomeViewer | null; sections: HomeSections; burrow: boolean }): React.ReactElement {
  const joined = viewer ? (['kpop', 'anime'] as const).filter((s) => viewer.sites[s]) : [];
  const levelsAria = joined.map((s) => ht('hp.nav.levelOf', { name: siteName(s), level: viewer!.sites[s]!.level })).join(', ');
  return (
    <header className="hub-h2-head">
      <nav aria-label={ht('hp.nav.main')} className="hub-h2-nav">
        <a href="/" className="hub-h2-brand">
          <RabbitMark size={40} className="hub-h2-brand-mk" />
          <HubWordmark className="hub-h2-brand-name" />
        </a>
        <div className="hub-h2-tabs">
          <a href="/" className="hub-h2-tab hub-h2-tab-on" aria-current="page">{ht('hp.nav.home')}</a>
          {burrow ? (
            <a href={BURROW_PATHS.burrow} className="hub-h2-tab">
              {ht('hp.nav.burrow')}
              <HomeNavBadge srLabel={ht('hp.nav.burrowLeft')} />
            </a>
          ) : null}
          {sections.hot ? <a href="#hot" className="hub-h2-tab">{ht('hp.nav.quizzes')}</a> : null}
          {sections.community ? <a href="#community" className="hub-h2-tab">{ht('hp.nav.community')}</a> : null}
        </div>
        <div className="hub-h2-actions">
          <HomeSearch
            hrefs={{ kpop: homeUrl({ site: 'kpop', path: '/search' }), anime: homeUrl({ site: 'anime', path: '/search' }) }}
            labels={{ kpop: ht('hp.nav.search', { name: siteName('kpop') }), anime: ht('hp.nav.search', { name: siteName('anime') }) }}
          />
          {viewer ? (
            <a href={PASSPORT_PATH} aria-label={levelsAria ? ht('hp.nav.levelAria', { levels: levelsAria }) : undefined} className="hub-h2-me">
              <span aria-hidden="true" className="hub-h2-me-av">{viewer.username.charAt(0).toUpperCase()}</span>{ht('hp.nav.level', { level: viewer.level })}
            </a>
          ) : (
            <HomeSignIn label={ht('hp.nav.signIn')} sheetTitle={ht('home.signInSheetTitle')} sheetSub={ht('home.signInSheetSub')} className="hub-h2-solid hub-h2-btn" />
          )}
        </div>
      </nav>
    </header>
  );
}
