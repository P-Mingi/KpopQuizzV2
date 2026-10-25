// Run O1, lot H2a: the top bar of the new home (Main.dc.html: logo, Today, Hot now, Top fans, the two site pills, search, Sign in or the
// level chip; Mobile.dc.html: logo, search, Sign in). Hub chrome is ink and cream: no pink here. Links to the sites are the registry
// origins (homeUrl).
import { ht } from '@/lib/site/hub/copy';
import { homeUrl, HOME_SITES } from '@/lib/site/hub/home-types';

import { HomeSignIn } from './home-signin';
import { hubName, siteName } from './home-names';
import { SearchIcon } from './home-icons';
import { RabbitMark } from './home-ui';
import { siteClass } from './site-class';

import type { HomeViewer } from '@/lib/site/hub/home-types';

export function HomeNav({ viewer }: { viewer: HomeViewer | null }): React.ReactElement {
  return (
    <header className="hub-h2-head">
      <nav aria-label={ht('hp.nav.main')} className="hub-h2-nav">
        <a href="/" className="hub-h2-brand">
          <RabbitMark size={36} className="hub-h2-brand-mk" />
          <span className="hub-h2-brand-name">{hubName()}</span>
        </a>
        <div className="hub-h2-links">
          <a href="#today" className="hub-h2-pill hub-h2-btn">{ht('hp.nav.today')}</a>
          <a href="#hot" className="hub-h2-pill hub-h2-btn">{ht('hp.nav.hot')}</a>
          <a href="#top" className="hub-h2-pill hub-h2-btn">{ht('hp.nav.top')}</a>
          <span aria-hidden="true" className="hub-h2-sep" />
          {HOME_SITES.map((site) => (
            <a key={site} href={homeUrl({ site, path: '/' })} className={`hub-h2-sitepill hub-h2-btn ${siteClass(site)}`}>
              <span aria-hidden="true" className="hub-h2-dot9" />{siteName(site)}
            </a>
          ))}
        </div>
        <div className="hub-h2-actions">
          <button type="button" aria-label={ht('hp.nav.search')} className="hub-h2-iconbtn hub-h2-btn"><SearchIcon /></button>
          {viewer ? (
            <a href="#passport" className="hub-h2-me">
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
