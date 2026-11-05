// ADMIN-2 (owner, 2026-10-30; PLAN-ADMIN-2 section 2): the site is a choice of the admin's interface, never the host or SITE_ID. Every route
// of app/api/admin reads `site` (the query string, then the JSON body), validates it against SITE_IDS and reads and writes through
// forSite(query, site) / withSite(row, site) with that site. The one rule here, shared by all of them.
//
// Until the kpop and anime admins are removed (step 6) their pages send no `site`: on the kpop and anime builds a request without one means
// the build's own site, as before. On the hub build `site` is always required. A `site` that is present is always validated, on every build.
import { NextResponse } from 'next/server';

import { ADMIN_RESPONSE_HEADERS } from './guard';
import { SITE_ID } from '@/lib/site/registry';
import { SITE_IDS } from '@/lib/site/types';

import type { SiteId } from '@/lib/site/types';

export type AdminSiteResult = { readonly ok: true; readonly site: SiteId } | { readonly ok: false; readonly res: NextResponse };

export interface AdminSiteOptions {
  /** The sites this route can act on (a route of kpop-only data lists ['kpop']). Default: all three. */
  readonly only?: readonly SiteId[];
  /** The build the request runs on (tests); default the build's SITE_ID. */
  readonly build?: SiteId;
  /** A call that is not the admin's (a cron on its own build) may leave `site` out on the hub too: it means the build's site. */
  readonly buildDefault?: boolean;
}

/** A SiteId, or null. Exact match: no trim, no case folding. */
export function parseSite(raw: unknown): SiteId | null {
  return typeof raw === 'string' && (SITE_IDS as readonly string[]).includes(raw) ? (raw as SiteId) : null;
}

function refuse(code: 'bad_site' | 'site_required' | 'site_unsupported', error: string): AdminSiteResult {
  return { ok: false, res: NextResponse.json({ error, code }, { status: 400, headers: { ...ADMIN_RESPONSE_HEADERS } }) };
}

/**
 * The site of one admin call from its raw value (null/undefined/'' when none was sent). Answers 400 (after the admin guard, so a refused
 * visitor still sees the 404 only): bad_site for a value that is not a SiteId, site_required on the hub build without one, site_unsupported
 * for a site the route does not serve.
 */
export function resolveAdminSite(raw: unknown, options: AdminSiteOptions = {}): AdminSiteResult {
  const build = options.build ?? SITE_ID;
  let site: SiteId;
  if (raw === undefined || raw === null || raw === '') {
    if (build === 'hub' && options.buildDefault !== true) return refuse('site_required', 'Say which site: site=kpop, site=anime or site=hub.');
    site = build;
  } else {
    const parsed = parseSite(raw);
    if (parsed === null) return refuse('bad_site', 'Unknown site.');
    site = parsed;
  }
  if (options.only && !options.only.includes(site)) return refuse('site_unsupported', 'This tool does not serve that site.');
  return { ok: true, site };
}

/** The site of a request: `?site=` first, else `site` of an already parsed JSON body. */
export function adminSiteOf(request: { readonly nextUrl?: { readonly searchParams: URLSearchParams }; readonly url: string }, body?: unknown, options: AdminSiteOptions = {}): AdminSiteResult {
  const params = request.nextUrl?.searchParams ?? new URL(request.url).searchParams;
  const fromQuery = params.get('site');
  if (fromQuery !== null && fromQuery !== '') return resolveAdminSite(fromQuery, options);
  const fromBody = body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>).site : undefined;
  return resolveAdminSite(fromBody, options);
}
