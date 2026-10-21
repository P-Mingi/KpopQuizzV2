'use client';

// Run O1, lot (c), lane B6: "Your sites" in the account menu (NEXT_PUBLIC_NET_MENU). Rendered inside the open account popover
// through the `accountExtra` slot of UxNavActions, so /api/n/me is asked only when a signed-in member opens the menu. It lists
// the viewer's memberships on the other sites with their levels, each a NetLink, then the passport. An account with no other
// membership (a kpop-only account), a viewer who chose "hide", or a failed read sees nothing: the menu stays what it was.
import { Icon } from '@/components/ux-v1/icon';
import { netCopy } from '@/lib/network/copy';
import { useNetMe } from '@/lib/network/me-client';
import { SITE_ID, siteConfig } from '@/lib/site/registry';

import { NetLink } from './net-link';

export function NetSitesMenu(): React.ReactElement | null {
  const me = useNetMe();
  if (!me || me.yourSitesMenu === 'hide') return null;
  const others = me.sites.filter((s) => s.id !== SITE_ID && s.id !== 'hub');
  if (others.length === 0) return null;
  return (
    <>
      <div className="ux-msep" />
      <div className="ux-pop-h"><b>{netCopy('menu.heading')}</b></div>
      {others.map((s) => (
        <NetLink key={s.id} own dst={s.id} path="/" linkId="menu" className="ux-mi">
          {siteConfig(s.id).brand.name}
          <small>{netCopy('menu.level', { level: s.level })}</small>
        </NetLink>
      ))}
      <NetLink own dst="hub" path="/passport" linkId="menu" className="ux-mi">
        {netCopy('menu.passport')}<Icon name="right" size="sm" style={{ marginLeft: 'auto' }} />
      </NetLink>
    </>
  );
}
