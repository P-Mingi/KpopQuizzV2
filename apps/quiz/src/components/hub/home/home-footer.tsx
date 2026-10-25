// Run O1, lot H2a: the footer of the new home: the wordmark with the rabbit and what the hub is, the two sites, Privacy, the legal
// notice, the one mailbox. On the phone board it is one row of links.
import { ht, HUB_EMAIL } from '@/lib/site/hub/copy';
import { homeUrl, HOME_SITES } from '@/lib/site/hub/home-types';

import { hubName, siteName } from './home-names';
import { RabbitMark } from './home-ui';

export function HomeFooter(): React.ReactElement {
  return (
    <footer className="hub-h2-foot">
      <div className="hub-h2-foot-in">
        <div className="hub-h2-foot-brand">
          <span className="hub-h2-foot-name"><RabbitMark size={28} className="hub-h2-foot-mk" />{hubName()}</span>
          <span className="hub-h2-foot-tag">{ht('hp.foot.tag')}</span>
        </div>
        <div className="hub-h2-foot-cols">
          <div className="hub-h2-foot-col">
            <span className="hub-h2-foot-h">{ht('hp.foot.sites')}</span>
            {HOME_SITES.map((site) => <a key={site} href={homeUrl({ site, path: '/' })} className="hub-h2-foot-a hub-h2-lnk">{siteName(site)}</a>)}
          </div>
          <div className="hub-h2-foot-col">
            <span className="hub-h2-foot-h">{ht('hp.foot.about')}</span>
            <a href="/privacy" className="hub-h2-foot-a hub-h2-lnk">{ht('hp.foot.privacy')}</a>
            <a href="/legal" className="hub-h2-foot-a hub-h2-lnk">{ht('hp.foot.legal')}</a>
            <span className="hub-h2-foot-mail">{HUB_EMAIL}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
