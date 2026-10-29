'use client';

// Run O1, lot (c), lane B6: NetLink (types.ts NetLinkProps). A plain <a>, never next/link, so nothing is prefetched across sites.
//  - editorial: editorialHref, followed, no query (only where link-allowlist.md lists it);
//  - otherwise a signed-in UI link: nothing in the server HTML; after /api/n/me answered and canShow passed it renders
//    bridgeHref with rel="nofollow". With NEXT_PUBLIC_NET_BEACON on it sends one `shown` beacon when it enters the viewport
//    and a `click` beacon on click.
// `own` (not in the contract props) marks a link to a site the viewer is a member of in their own menu: it needs the answer
// of /api/n/me but is not a suggestion, so eligibility and the frequency caps do not apply and it does not count as one.
import { useEffect, useRef, useState } from 'react';

import { sendNetBeacon } from '@/lib/network/beacon-client';
import { canShow } from '@/lib/network/eligibility';
import { bridgeHref } from '@/lib/network/links';
import { useNetMe } from '@/lib/network/me-client';
import { readCaps, recordShown } from '@/lib/network/storage';

import { NetEditorialLink } from './net-editorial-link';

import type { NetLinkProps } from '@/lib/network/types';

// Bunnyverse: this build's base path, inlined by Next at build time ('' on kpop and hub, so the code is today's; '/anime' on the anime build).
const BASE_PATH = process.env.__NEXT_ROUTER_BASEPATH || '';

export interface NetLinkOwnProps extends NetLinkProps {
  readonly own?: boolean;
}

function NetBridgeLink({ dst, path, linkId, className, own, children }: NetLinkOwnProps): React.ReactElement | null {
  const me = useNetMe();
  const ref = useRef<HTMLAnchorElement | null>(null);
  const counted = useRef(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!me) return;
    setVisible(own === true || canShow(me, dst, linkId, readCaps()));
  }, [me, dst, linkId, own]);

  useEffect(() => {
    const el = ref.current;
    if (!visible || !el || counted.current) return;
    const count = (): void => {
      if (counted.current) return;
      counted.current = true;
      if (own !== true) recordShown();
      sendNetBeacon({ dst, bridge: linkId, step: 'shown' });
    };
    if (typeof IntersectionObserver === 'undefined') {
      count();
      return;
    }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { io.disconnect(); count(); }
    });
    io.observe(el);
    return () => io.disconnect();
  }, [visible, dst, linkId, own]);

  if (!visible) return null;
  return (
    <a
      ref={ref}
      className={className}
      href={BASE_PATH ? BASE_PATH + bridgeHref(dst, path, linkId) : bridgeHref(dst, path, linkId)}
      rel="nofollow"
      onClick={() => sendNetBeacon({ dst, bridge: linkId, step: 'click' })}
    >
      {children}
    </a>
  );
}

export function NetLink(props: NetLinkOwnProps): React.ReactElement | null {
  if (props.editorial) {
    return <NetEditorialLink dst={props.dst} path={props.path} className={props.className}>{props.children}</NetEditorialLink>;
  }
  return <NetBridgeLink {...props} />;
}
