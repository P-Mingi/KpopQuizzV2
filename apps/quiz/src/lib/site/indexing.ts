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
//
// NET_LAUNCH_DATE (server value, YYYY-MM-DD; lane H1): the day the network opens. While the site is closed the network privacy
// page is a draft (banner, noindex, not in the sitemap). Once it is open the page prints this date, is indexable and is in the
// hub sitemap; a build that is open and has no valid date fails with a clear message (`launchDateOrThrow`).

import { flagOn, SITE_ID } from './registry';

import type { FlagScope } from './registry';

import type { Metadata } from 'next';

import type { SiteId } from './types';

/** True on the kpop build (always open) and on another site once the owner sets NET_INDEXING=1. */
export const INDEXING_OPEN: boolean = SITE_ID === 'kpop' || flagOn(process.env.NET_INDEXING);

/** The same switch for a named site, read now: kpop is always open, another site once NET_INDEXING is 1 or true. */
export function indexingOpenFor(site: SiteId, raw: string | undefined = process.env.NET_INDEXING): boolean {
  return site === 'kpop' || flagOn(raw);
}

/** The robots field of a page: its own wish when the site is open, noindex and nofollow while it is closed. */
export function robotsFor(index: boolean, follow: boolean = true): NonNullable<Metadata['robots']> {
  return INDEXING_OPEN ? { index, follow } : { index: false, follow: false };
}

/**
 * Server env VALUES of the run read here (a date, not an on/off switch), kept apart from O1_FLAGS in registry.ts, which the flag table of
 * docs/o1/contracts/flags-env.md mirrors one to one (contract.test.ts). The row of NET_LAUNCH_DATE is requested in docs/o1/requests/H1.md;
 * the entry moves into O1_FLAGS when the row is in the table. (Not in registry.ts: that module is in the kpop client bundle, and a byte
 * added there changes kpopquiz.org's chunks.)
 */
export const O1_VALUE_ENVS: readonly { readonly name: string; readonly scope: FlagScope; readonly lane: string }[] = [
  { name: 'NET_LAUNCH_DATE', scope: 'server', lane: 'L1' },
];

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as const;

/** A real calendar date written YYYY-MM-DD (2026-02-30 is not one), as parts; null for anything else. */
function dateParts(raw: string | undefined): { y: number; m: number; d: number } | null {
  const hit = /^(\d{4})-(\d{2})-(\d{2})$/.exec((raw ?? '').trim());
  if (!hit) return null;
  const y = Number(hit[1]);
  const m = Number(hit[2]);
  const d = Number(hit[3]);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d ? { y, m, d } : null;
}

/** NET_LAUNCH_DATE as the string YYYY-MM-DD, or null when it is missing or not a real date. */
export function parseLaunchDate(raw: string | undefined): string | null {
  const p = dateParts(raw);
  return p ? `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}` : null;
}

/** "2026-10-24" as "24 October 2026"; null when the value is not a real date. */
export function formatLaunchDate(raw: string | undefined): string | null {
  const p = dateParts(raw);
  return p ? `${p.d} ${MONTHS[p.m - 1]} ${p.y}` : null;
}

/** The launch date of this build: null while the site is closed; once it is open, the valid NET_LAUNCH_DATE or an Error. */
export function launchDateOrThrow(open: boolean = INDEXING_OPEN, raw: string | undefined = process.env.NET_LAUNCH_DATE): string | null {
  if (!open) return null;
  const date = parseLaunchDate(raw);
  if (date) return date;
  throw new Error(
    `NET_LAUNCH_DATE is missing or not a date (got "${raw ?? ''}"). NET_INDEXING is on, so the privacy policy prints its launch date: `
    + 'set NET_LAUNCH_DATE=YYYY-MM-DD on this project, or turn NET_INDEXING off.',
  );
}
