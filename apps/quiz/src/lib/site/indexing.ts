// Run O1, lane C3: the indexing switch of the anime and hub sites (one flag, default closed).
//
// NET_INDEXING (server flag; the row of flags-env.md section 3 is requested in docs/o1/requests/C3.md), read where the page is built:
//   unset, '0', 'false' or anything else (default): the site is closed to search engines. Every page answers
//     <meta name="robots" content="noindex, nofollow"> (the layout of app/sites/[site] and `robotsFor` below).
//     The matching `X-Robots-Tag: noindex, nofollow` header, for answers that are not HTML, needs an entry in next.config.ts,
//     which this lane does not own: docs/o1/requests/C3.md has the patch; `INDEXING_OPEN` is what it reads.
//   '1' or 'true': each page speaks for itself: the pages that were written to be indexed say index, follow; the ones
//     that are not (login, settings, search, a profile, a thin series hub) keep their own noindex.
// The flag is read at build time like every Next metadata, so the owner flips it per Vercel project and redeploys.
// kpopquiz.org is never closed by it: the kpop build keeps today's behaviour whatever the value.

import { flagOn, SITE_ID } from './registry';

import type { Metadata } from 'next';

/** True on the kpop build (always open) and on another site once the owner sets NET_INDEXING=1. */
export const INDEXING_OPEN: boolean = SITE_ID === 'kpop' || flagOn(process.env.NET_INDEXING);

/** The robots field of a page: its own wish when the site is open, noindex and nofollow while it is closed. */
export function robotsFor(index: boolean, follow: boolean = true): NonNullable<Metadata['robots']> {
  return INDEXING_OPEN ? { index, follow } : { index: false, follow: false };
}
