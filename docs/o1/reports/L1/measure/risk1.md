# Audit 02 risk 1 (P0-4): does the inline theme script cause a recovery client render of the root?

Checked 2026-11-09, read only, public site, headless Chromium (the repo's Playwright), `/_vercel/insights/*` and
`/_vercel/speed-insights/*` aborted. Script: `risk1-check.mjs`; output: `risk1-console.json`. Pages: `/`,
`/q/are-you-a-real-coer`, `/blindtest`, each with `localStorage.theme = "dark"` and with no stored theme.

## Answer: NO (not reproduced)

- The theme script sits in `<body>` (first child) on all three templates, as the layout code says.
- A MutationObserver on `<html class>` from document start records only the script's own writes
  (`classList.remove` then `add('dark')`, about 100 to 600 ms after navigation start). The `dark` class is never removed afterwards,
  so there is no reset of `<html className>` for ThemeInit to repair. With no stored theme there is a single no-op write.
- No `Minified React error` (#418, #423, #425, the hydration and recovery codes) and no other console error or warning on any
  page, in either theme. The only console lines are the ones caused by blocking the Vercel script on purpose
  (`Failed to load resource: net::ERR_FAILED` and the Web Analytics "Failed to load script" log).

So the comments in `app/layout.tsx` (L15-20) and `theme-init.tsx` describe a React 19 behaviour that the production site does
not show today. Consequence: P1-3 (move the script to `<head>` and fix the mismatch) is NOT done: it would change `<head>` on every
page for a gain that was not confirmed. ThemeInit stays as a harmless safety net.

Limit: this reads the class and the console, which is what the risk predicts; it is not a CPU profile of hydration. If the owner
wants one, the field data of P0-3 (INP and LCP per template) is the proof that matters.
