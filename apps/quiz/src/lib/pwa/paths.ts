// Run PWA: the pages where the install banner never shows. A quiz or a game is being played there (the result screen included: the banner
// waits for the next page), or the page is an account step. Matched on the first segment, after the language prefix, so /fr/q/x is /q/x.
// The shell's own marker of a game or a creation screen (html.ux-focus, data-shell) is read by the browser code on top of this list.

import type { PwaApp } from './config';

const KPOP_NO_BANNER: readonly string[] = [
  'q', 'g', 's', 'quiz', 'embed', 'build', 'live', 'join', 'create', 'name-all', 'personality', 'blindtest', 'blind-test',
  'guess-the-kpop-idol', 'guess-the-kpop-song', 'kpop-true-or-false', 'daily', 'login', 'onboarding', 'auth', 'admin',
];

// /daily of the hub is the Burrow, the door to the games, not a game: the banner may show there.
const HUB_NO_BANNER: readonly string[] = ['kpopdle', 'otakudle', 'login', 'onboarding', 'auth', 'admin'];

const BY_APP: Readonly<Record<PwaApp, readonly string[]>> = { kpop: KPOP_NO_BANNER, hub: HUB_NO_BANNER };

/** The path without its language prefix: /fr/q/x is /q/x, /fr is /. */
export function withoutLocale(pathname: string): string {
  const stripped = pathname.replace(/^\/fr(?=\/|$)/, '');
  return stripped === '' ? '/' : stripped;
}

/** True when `pathname` is a page where a quiz or a game runs, or an account step: no banner there. */
export function isNoBannerPath(app: PwaApp, pathname: string): boolean {
  const first = withoutLocale(pathname).split('/')[1] ?? '';
  return BY_APP[app].includes(first);
}
