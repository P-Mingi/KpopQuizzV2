// Run O1, lot (c), lane B6: the `via` code on landing (BACKLOG 5.1, cookies.md 1) and the Web Analytics filter.
// The via-catcher (`catchVia`) runs on the target site of a jump: it reads ?via=, keeps a valid one in
// sessionStorage (`fq.net.via`), strips it from the address bar, and counts one `land` beacon.
import { SITE_IDS } from '@/lib/site/types';
import { SITE_ID, REGISTRY } from '@/lib/site/registry';

import { sendNetBeacon } from './beacon-client';
import { writeVia } from './storage';
import { NET_LINK_IDS, VIA_RE } from './types';

import type { SiteId } from '@/lib/site/types';
import type { NetBridgeId } from './types';

/** The code, or null when it does not match VIA_RE. */
export function validVia(raw: string | null | undefined): string | null {
  return typeof raw === 'string' && VIA_RE.test(raw) ? raw : null;
}

/** The site a via letter stands for, and the link id after the dot (null when it is not a known NetBridgeId). */
export function parseVia(via: string): { source: SiteId; bridge: NetBridgeId | null } | null {
  if (!VIA_RE.test(via)) return null;
  const source = SITE_IDS.find((id) => REGISTRY[id].letter === via.charAt(0));
  if (!source) return null;
  const id = via.slice(2);
  return { source, bridge: (NET_LINK_IDS as readonly string[]).includes(id) ? (id as NetBridgeId) : null };
}

/** The parameters Web Analytics must never receive: the via code and the identifiers of the jump and sign-in. */
const DROPPED = ['via', 't', 'code', 'state', 'token', 'ticket', 'access_token', 'refresh_token', 'email', 'uid', 'user_id', 'anon_id'];

/** `href` without the dropped parameters and without a fragment that carries one (never throws). */
export function cleanUrl(href: string): string {
  try {
    const u = new URL(href, 'https://example.invalid');
    const absolute = /^[a-z][a-z0-9+.-]*:/i.test(href);
    for (const k of DROPPED) u.searchParams.delete(k);
    if (u.hash.includes('=')) u.hash = '';
    return absolute ? u.toString() : `${u.pathname}${u.search}${u.hash}`;
  } catch {
    return href.split(/[?#]/)[0] ?? href;
  }
}

/**
 * Run on every page load of a site with a NET flag on. Idempotent per URL: once the parameter is gone nothing
 * happens. A malformed `via` is stripped and ignored.
 */
export function catchVia(win: Window = window): void {
  let url: URL;
  try {
    url = new URL(win.location.href);
  } catch {
    return;
  }
  if (!url.searchParams.has('via')) return;
  const via = validVia(url.searchParams.get('via'));
  url.searchParams.delete('via');
  try {
    win.history.replaceState(win.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  } catch { /* the address stays as it is */ }
  if (via === null) return;
  const parsed = parseVia(via);
  if (parsed === null || parsed.source === SITE_ID) return;
  writeVia(via);
  if (parsed.bridge !== null) sendNetBeacon({ dst: parsed.source, bridge: parsed.bridge, step: 'land' });
}

/**
 * Registers the filter on @vercel/analytics (window.va 'beforeSend', the call <Analytics beforeSend> itself makes): the
 * address of a pageview or event loses `via` and the identifiers above. Safe before or after <Analytics /> mounted.
 */
export function installAnalyticsFilter(win: Window = window): void {
  const w = win as Window & { va?: (event: string, properties?: unknown) => void; vaq?: unknown[] };
  if (!w.va) {
    w.va = (...params: unknown[]) => {
      if (!w.vaq) w.vaq = [];
      w.vaq.push(params);
    };
  }
  w.va('beforeSend', (event: { type: 'pageview' | 'event'; url: string }) => ({ ...event, url: cleanUrl(event.url) }));
}
