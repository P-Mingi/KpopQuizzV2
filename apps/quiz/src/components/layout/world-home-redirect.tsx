'use client';

/**
 * W-NAV: the preferred-world auto-open on "/" was REMOVED (TIERLIST prod hotfix,
 * bug 3). It read a `world=verse` cookie and client-side router.replace'd "/" to
 * /verse. Because the desktop world toggle was retired in phase 3.2, a cookie stuck
 * on 'verse' turned every landing on the Play home - including the one right after
 * logging in - into a bounce to Verse, with no easy way back. Play is the launch
 * focus, so "/" now always lands and STAYS on Play.
 *
 * Why this is SEO-safe and does not strand Verse:
 *  - The redirect was already browser-only (no server 3xx), so the "/" HTML served
 *    to Googlebot never changed and does not change now. This is a pure deletion of
 *    a client effect: the home page stays static/ISR.
 *  - Verse is still reachable: the site footer carries a Fandoms -> /verse link at
 *    every viewport (added in phase 3.2), plus the mobile top-bar toggle and the
 *    Verse topbar's own Play/Verse toggle inside Verse chrome.
 *
 * The component is kept as an inert no-op so its mount site in the home page needs
 * no change; it renders nothing and runs nothing.
 */
export function WorldHomeRedirect(): null {
  return null;
}
