// One production URL against what it must answer (rulebook 13.5: a URL that earned a link keeps
// a 200 or a 301). Pure assessment plus a small fetcher; the guard (linked-guard.ts) loops.
//
//   expect 200       HTTP 200, no noindex (meta robots or X-Robots-Tag), a canonical to itself.
//   expect redirect  a permanent redirect (301 or 308: both are permanent and pass the link) to
//                    the exact target, in one hop, and the target itself passes the 200 check.

import { SITE_ORIGIN, WATCH_USER_AGENT } from './env';

export interface FetchedPage {
  status: number;
  location: string | null;
  xRobots: string;
  html: string;
}

export type Expectation = { kind: 'ok' } | { kind: 'redirect'; to: string };

/** Path plus query of a URL on our host ("/q/x?y=1"), trailing slash dropped; null when off site. */
export function sitePath(urlOrPath: string, base = SITE_ORIGIN): string | null {
  try {
    const u = new URL(urlOrPath, base);
    if (u.origin !== new URL(base).origin) return null;
    const p = u.pathname.replace(/\/+$/, '') || '/';
    return `${p}${u.search}`;
  } catch {
    return null;
  }
}

/** Null when the page answers 200, indexable, canonical to itself; else the reason. */
export function assessOk(path: string, page: FetchedPage | null): string | null {
  if (!page) return 'no response (network error or timeout)';
  if (page.status !== 200) return page.location ? `HTTP ${page.status} to ${page.location} (expected 200)` : `HTTP ${page.status} (expected 200)`;
  const metaRobots = page.html.match(/<meta[^>]+name=["']robots["'][^>]*>/i)?.[0] ?? '';
  if (/noindex/i.test(page.xRobots)) return 'noindex in X-Robots-Tag';
  if (/noindex/i.test(metaRobots)) return 'noindex in meta robots';
  const canonTag = page.html.match(/<link[^>]+rel=["']canonical["'][^>]*>/i)?.[0] ?? '';
  const canonHref = canonTag.match(/href=["']([^"']+)["']/i)?.[1] ?? '';
  if (!canonHref) return 'no canonical';
  const want = (sitePath(path) ?? path).split('?')[0];
  const got = sitePath(canonHref)?.split('?')[0] ?? null;
  if (got !== want) return `canonical points to ${got ?? canonHref} (not itself)`;
  return null;
}

/** Null when the page is a one-hop permanent redirect to `to`; else the reason. */
export function assessRedirect(to: string, page: FetchedPage | null): string | null {
  if (!page) return 'no response (network error or timeout)';
  if (page.status !== 301 && page.status !== 308) return `HTTP ${page.status} (expected a 301 to ${to})`;
  const got = page.location ? sitePath(page.location) : null;
  if (got !== (sitePath(to) ?? to)) return `redirects to ${page.location ?? 'nothing'} (expected ${to})`;
  return null;
}

export type Fetcher = (url: string) => Promise<FetchedPage | null>;

/** GET one URL without following redirects. Null on network error or timeout. */
export function makeFetcher(timeoutMs = 15000, fetchImpl: typeof fetch = fetch): Fetcher {
  return async (url) => {
    try {
      const res = await fetchImpl(url, {
        method: 'GET',
        redirect: 'manual',
        headers: { 'user-agent': WATCH_USER_AGENT, accept: 'text/html' },
        signal: AbortSignal.timeout(timeoutMs),
      });
      const html = res.status === 200 ? await res.text() : '';
      return { status: res.status, location: res.headers.get('location'), xRobots: res.headers.get('x-robots-tag') ?? '', html };
    } catch {
      return null;
    }
  };
}

/** A failure worth a second look (network, 5xx): retried once before it counts. */
export function isTransient(page: FetchedPage | null): boolean {
  return !page || page.status >= 500;
}
