// Run O1, lot (c), lane B6: the one anonymous cross-site link of the footer (link-allowlist.json "footer": kpop and anime to
// the hub home, followed, no query). Rendered by the shared footer only with NEXT_PUBLIC_NET_FOOTER on; the hub has none.
import { netCopy } from '@/lib/network/copy';
import { SITE_ID } from '@/lib/site/registry';

import { NetEditorialLink } from './net-editorial-link';

export function NetFooterLine(): React.ReactElement | null {
  if (SITE_ID === 'hub') return null;
  return (
    <div className="ux-ftop">
      <b>{netCopy('footer.line')}</b>
      <NetEditorialLink dst="hub" path="/">{netCopy('footer.linkLabel')}</NetEditorialLink>
    </div>
  );
}
