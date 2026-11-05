// Run PWA (docs/o1/PWA-PLAN.md): the one place that says which sites are an installable app and how the switches read.
//
// Two switches, both off by default on every site (flags-env.md convention: '1' or 'true' is on, anything else is off):
//   NEXT_PUBLIC_NET_PWA (public, inlined at build): the page registers /sw.js and may show the install banner. Off: no registration,
//     no banner, no client code fetched, and /sw.js answers 404 (kpopquiz.org keeps today's answer for that address).
//   NET_PWA_KILL (server, read when /sw.js is asked): on, /sw.js is a worker that deletes its caches and unregisters itself, whatever
//     the first switch says. The way out for a worker already installed in browsers (docs/launch/o1/PWA.md).
// These two live here and not in registry.ts O1_FLAGS: registry.ts is in the kpop client bundle (the NET_LAUNCH_DATE precedent of
// lib/site/indexing.ts), and the flags table of flags-env.md mirrors O1_FLAGS one to one (contract.test.ts). ORCH moves them
// when it accepts that chunk change; PWA_FLAGS has the exact entries (lane L1: 'PWA' is no lane of LANES.md, contract.test.ts refuses it).
//
// Free of next/*, Node built-ins and browser globals: the route handler, the worker builder and the browser code all import it.

import { flagOn } from '@/lib/site/registry';

import type { SiteId } from '@/lib/site/types';

/** The worker, at the root of the origin so its scope is the whole site. */
export const PWA_SW_PATH = '/sw.js';

/** What the kill worker posts to the pages it controlled: the page then stops registering for a day (lib/pwa/boot.ts). */
export const PWA_KILLED_MESSAGE = 'kq-pwa-killed';

/** The two switches, in the shape of O1_FLAGS (registry.ts). */
export const PWA_FLAGS: readonly { readonly name: string; readonly scope: 'public' | 'server'; readonly lane: string; readonly reserved: false }[] = [
  { name: 'NEXT_PUBLIC_NET_PWA', scope: 'public', lane: 'L1', reserved: false },
  { name: 'NET_PWA_KILL', scope: 'server', lane: 'L1', reserved: false },
];

/** The installable apps: one per domain. KpopQuiz on kpopquiz.org, Bunnyverse on bunnyverse.org. */
export type PwaApp = 'kpop' | 'hub';

/**
 * The app a build belongs to. OtakuQuiz lives under bunnyverse.org/anime and has no app of its own (plan, section 1), so the anime
 * build answers null: it registers nothing, shows no banner, and its /sw.js is a 404. Its manifest (public/brand/anime/site.webmanifest)
 * still describes OtakuQuiz as an own app, which routing.test.ts and kpop-icons.test.ts pin: making /anime install the Bunnyverse app is
 * a decision for ORCH (that manifest, those two tests, and this one line).
 */
export function pwaAppOf(site: SiteId): PwaApp | null {
  if (site === 'kpop') return 'kpop';
  if (site === 'hub') return 'hub';
  return null;
}

export type PwaMode = 'off' | 'on' | 'kill';

export interface PwaEnv {
  readonly NEXT_PUBLIC_NET_PWA?: string | undefined;
  readonly NET_PWA_KILL?: string | undefined;
  readonly NODE_ENV?: string | undefined;
}

/**
 * What /sw.js is: the kill switch wins over everything (it also clears a worker a developer registered), then `next dev` (its chunks keep
 * one address while they change, so a worker caching them would serve stale code: no worker in development), then the flag, else nothing.
 */
export function pwaMode(env: PwaEnv): PwaMode {
  if (flagOn(env.NET_PWA_KILL)) return 'kill';
  if (env.NODE_ENV === 'development') return 'off';
  return flagOn(env.NEXT_PUBLIC_NET_PWA) ? 'on' : 'off';
}

/** The locale of a page, from its path as the pages do: /fr and below is French, everything else English. */
export function pwaLocaleOf(pathname: string): 'en' | 'fr' {
  return pathname === '/fr' || pathname.startsWith('/fr/') ? 'fr' : 'en';
}
