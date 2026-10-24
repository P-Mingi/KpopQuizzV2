import { ht } from '@/lib/site/hub/copy';
import { PRIVACY_NOTICE, PRIVACY_NOTICE_LINK, privacyUrl } from '@/lib/site/hub/network-page';

// Run O1, lot (d), lane H1: the short passport notice of the sign-in sheet of a world site (anime, hub). It is the copy of the policy
// itself (privacy.* keys of copy/hub/h1.ts), three lines then a link to the full text on the hub (NETWORK.url + /privacy). Plain
// text: no "OK" is asked. Only the world sheet imports it, so a kpop build never loads it.
export function PassportNotice(): React.ReactElement {
  return (
    <p className="ux-help" data-passport-notice="">
      {PRIVACY_NOTICE.map((k) => ht(k)).join(' ')}{' '}
      <a href={privacyUrl()} target="_blank" rel="noopener noreferrer">{ht(PRIVACY_NOTICE_LINK)}</a>
    </p>
  );
}
