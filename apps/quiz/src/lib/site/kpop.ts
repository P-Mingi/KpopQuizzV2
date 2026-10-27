// Run O1, lane B1. The values of the kpop site that live outside the frozen SiteConfig shape
// (BACKLOG 5.1 freezes the fields; the kpop entry itself is in registry.ts). They are today's
// literals, so the kpop build renders the same bytes; anime and hub never read them.
//
// kpop.test.ts compares each one with the file that held it before the wiring.

/**
 * The browser chrome colours of the root layout's viewport (the `theme-color` meta tags).
 * Not theme tokens (tokens.md 7): the dark value is #141210, not the --ux-page of a0.css.
 */
export const KPOP_THEME_COLOR = { light: '#FAF8F5', dark: '#141210' } as const;
