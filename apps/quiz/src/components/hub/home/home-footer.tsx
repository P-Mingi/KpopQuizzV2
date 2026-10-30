// Run O1, lot H2a: the footer of the new home: the wordmark with the rabbit and what the hub is, Privacy, the legal notice, the one mailbox.
// Home v3 (2026-10-29, Home.dc.html): no link to kpopquiz.org (SEO rule 16: sister sites link to each other only in context, never in a
// footer). The column of the hub lists the Burrow (once it is open) and OtakuQuiz, which lives on bunnyverse.org; the board's "Our sites",
// "Editorial policy" and "About" are not drawn while the hub has no such page (a footer link to nowhere would be a dead door).
import { BURROW_PATHS } from '@/lib/site/hub/daily-guess';
import { ht, HUB_EMAIL } from '@/lib/site/hub/copy';
import { homeUrl } from '@/lib/site/hub/home-types';

import { hubName, siteName } from './home-names';
import { HubWordmark, RabbitMark } from './home-ui';

export function HomeFooter({ burrow }: { burrow: boolean }): React.ReactElement {
  return (
    <footer className="hub-h2-foot">
      <div className="hub-h2-foot-in">
        <div className="hub-h2-foot-brand">
          <span className="hub-h2-foot-name"><RabbitMark size={28} className="hub-h2-foot-mk" /><HubWordmark className="hub-h2-foot-word" /></span>
          <span className="hub-h2-foot-tag">{ht('hp.foot.tag')}</span>
        </div>
        <div className="hub-h2-foot-cols">
          <div className="hub-h2-foot-col">
            <span className="hub-h2-foot-h">{hubName()}</span>
            {burrow ? <a href={BURROW_PATHS.burrow} className="hub-h2-foot-a">{ht('hp.foot.burrow')}</a> : null}
            <a href={homeUrl({ site: 'anime', path: '/' })} className="hub-h2-foot-a">{siteName('anime')}</a>
          </div>
          <div className="hub-h2-foot-col">
            <span className="hub-h2-foot-h">{ht('hp.foot.about')}</span>
            <a href="/privacy" className="hub-h2-foot-a">{ht('hp.foot.privacy')}</a>
            <a href="/legal" className="hub-h2-foot-a">{ht('hp.foot.legal')}</a>
            <span className="hub-h2-foot-mail">{HUB_EMAIL}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
