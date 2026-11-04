// Run PWA (docs/o1/PWA-PLAN.md, sections 3 and 4): the browser side, started once after hydration by a dynamic import from ThemeInit, and only when
// NEXT_PUBLIC_NET_PWA is on (a build with the flag off never fetches this module, as with lib/network/boot.ts). It
//   - registers /sw.js at the root scope, once the page has loaded (not in a frame, not on an OtakuQuiz build, not for a day after the kill worker ran);
//   - keeps the browser's install window (beforeinstallprompt) for the banner's button, and notes an install (appinstalled);
//   - counts finished quizzes (lib/analytics.ts), and every few seconds asks the controller whether the banner shows.
// It touches no page and no network request of its own. Everything stays on the device: one localStorage key, no account.

import { setFinishListener } from '@/lib/analytics';
import { SITE_ID, siteConfig } from '@/lib/site/registry';

import { mountBanner } from './banner';
import { PWA_KILLED_MESSAGE, PWA_SW_PATH, pwaAppOf } from './config';
import { createController } from './controller';
import { isIosSafari, isStandalone } from './platform';

import type { ControllerEnv, InstallPrompt } from './controller';
import type { KeyStore } from './state';

/** How often the page is asked again whether the banner shows: a Next navigation is no page load. */
const TICK_MS = 3000;

/** The storage, or null when the browser refuses it (a private window, blocked site data). */
function localStore(): KeyStore | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function browserEnv(app: 'kpop' | 'hub', store: KeyStore | null): ControllerEnv {
  const doc = document;
  const nav = navigator as Navigator & { standalone?: boolean };
  return {
    app,
    brand: siteConfig(app).brand.name,
    store,
    now: () => Date.now(),
    pathname: () => window.location.pathname,
    framed: () => window.top !== window.self,
    standalone: () => isStandalone({ matchMedia: (q) => window.matchMedia(q), navigatorStandalone: nav.standalone }),
    immersive: () => doc.fullscreenElement != null
      || doc.documentElement.classList.contains('ux-focus') || doc.documentElement.classList.contains('ux-create')
      || doc.querySelector('[data-shell="focus"], [data-shell="create"]') !== null,
    ios: () => isIosSafari(nav.userAgent, nav.platform, nav.maxTouchPoints),
    position: () => {
      // Above the tab bar when it shows (phones), else above the safe area.
      const bar = doc.querySelector('.ux-tabbar');
      const tabs = bar && window.getComputedStyle(bar).display !== 'none' ? bar.getBoundingClientRect().height : 0;
      return { bottom: tabs + 12, safeArea: tabs === 0 };
    },
    mount: (view, handlers) => mountBanner(doc, view, handlers),
  };
}

function register(): void {
  if (!('serviceWorker' in navigator)) return;
  const go = (): void => {
    // updateViaCache 'none': the browser never takes the worker (or what it imports) from the HTTP cache, so a new version or the kill worker arrives at once.
    navigator.serviceWorker.register(PWA_SW_PATH, { scope: '/', updateViaCache: 'none' }).catch(() => undefined);
  };
  if (document.readyState === 'complete') go();
  else window.addEventListener('load', go, { once: true });
}

export function bootPwa(): void {
  const app = pwaAppOf(SITE_ID);
  if (app === null || typeof window === 'undefined') return;
  // `next dev` serves chunks that change under one address: no worker there (and /sw.js answers 404, lib/pwa/config.ts pwaMode).
  if (process.env.NODE_ENV === 'development') return;
  // A frame (an embed on another site) never registers a worker and never shows a banner.
  if (window.top !== window.self) return;

  const store = localStore();
  const controller = createController(browserEnv(app, store));

  window.addEventListener('beforeinstallprompt', (e) => {
    // Our banner is the offer: hold the browser's own mini bar back and keep the event for the button.
    e.preventDefault();
    controller.keepPrompt(e as unknown as InstallPrompt);
  });
  window.addEventListener('appinstalled', () => controller.appInstalled());
  setFinishListener((type) => { if (type === 'quiz') controller.quizFinished(); });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.onmessage = (e: MessageEvent) => {
      const data = e.data as { kq?: unknown } | null;
      if (data && data.kq === PWA_KILLED_MESSAGE) controller.killed();
    };
  }

  controller.tick();
  if (!controller.quiet()) register();
  window.setInterval(() => { if (document.visibilityState === 'visible') controller.tick(); }, TICK_MS);
}
