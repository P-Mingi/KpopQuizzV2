// Run PWA (docs/o1/PWA-PLAN.md, section 4): the install banner's brain, with every browser fact handed in (`ControllerEnv`), so the tests
// drive it with a fake clock, a Map for storage and a recording banner. lib/pwa/boot.ts builds the real environment.
//
// The browser calls tick() every few seconds while the page is visible (a Next navigation is no page load, so the page is asked again). A tick
// counts the visit, asks decide() (lib/pwa/state.ts) and shows the banner, or takes it away when a quiz or a game page opens under it. Taking it
// away that way is not a dismissal: only the close button, "Not now" and the browser's own answer keep it away for 30 days.

import { pwaCopy } from './copy';
import { pwaLocaleOf } from './config';
import {
  FINISHED_QUIZZES, decide, hasDailyWin, readState, touchVisit, withDismissal, withFinishedQuiz, withInstalled, withKill, writeState,
} from './state';

import type { BannerHandle, BannerHandlers, BannerView } from './banner';
import type { PwaApp } from './config';
import type { InstallOffer, KeyStore, PwaState } from './state';

/** The `beforeinstallprompt` event of Chrome and Edge, as much of it as is used. */
export interface InstallPrompt {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ readonly outcome: 'accepted' | 'dismissed' }>;
}

export interface ControllerEnv {
  readonly app: PwaApp;
  /** The name of the app: KpopQuiz or Bunnyverse. */
  readonly brand: string;
  readonly store: KeyStore | null;
  now(): number;
  pathname(): string;
  framed(): boolean;
  standalone(): boolean;
  /** A full screen element, or the shell's game and creation modes. */
  immersive(): boolean;
  /** iPhone or iPad Safari: the two gestures are the offer. */
  ios(): boolean;
  /** Where the banner sits: pixels above the bottom of the screen, and whether the safe area adds to it. */
  position(): { readonly bottom: number; readonly safeArea: boolean };
  mount(view: BannerView, handlers: BannerHandlers): BannerHandle;
}

export interface Controller {
  tick(): void;
  /** A quiz was finished on this page (lib/analytics.ts gameComplete). */
  quizFinished(): void;
  /** The browser offered its install window: keep it for the button. */
  keepPrompt(p: InstallPrompt): void;
  /** The app got installed (appinstalled). */
  appInstalled(): void;
  /** The kill worker ran. */
  killed(): void;
  /** True while the banner is on screen. */
  showing(): boolean;
  /** True while the page must not register the worker (the kill worker ran less than a day ago). */
  quiet(): boolean;
}

export function createController(env: ControllerEnv): Controller {
  let prompt: InstallPrompt | null = null;
  let handle: BannerHandle | null = null;
  let kind: 'prompt' | 'ios' | null = null;

  const read = (): PwaState => readState(env.store);
  const save = (change: (s: PwaState) => PwaState): PwaState => {
    const next = change(read());
    writeState(env.store, next);
    return next;
  };
  const hide = (): void => {
    handle?.remove();
    handle = null;
    kind = null;
  };

  function dismiss(): void {
    hide();
    save((s) => withDismissal(s, env.now()));
  }

  async function install(): Promise<void> {
    const p = prompt;
    prompt = null;
    hide();
    if (!p) return;
    try {
      await p.prompt();
      const choice = await p.userChoice;
      save((s) => (choice.outcome === 'accepted' ? withInstalled(s) : withDismissal(s, env.now())));
    } catch {
      save((s) => withDismissal(s, env.now()));
    }
  }

  function show(which: 'prompt' | 'ios'): void {
    const copy = pwaCopy(pwaLocaleOf(env.pathname()), env.brand);
    const { bottom, safeArea } = env.position();
    handle = env.mount({
      kind: which,
      title: which === 'ios' ? copy.iosTitle : copy.installTitle,
      body: copy.installBody,
      steps: [copy.iosStep1, copy.iosStep2],
      install: copy.install,
      notNow: copy.notNow,
      close: copy.close,
      bottom,
      safeArea,
    }, { onInstall: () => { void install(); }, onDismiss: dismiss });
    kind = which;
  }

  function tick(): void {
    const now = env.now();
    let state = read();
    const touched = touchVisit(state, now);
    if (touched !== state) {
      state = touched;
      writeState(env.store, state);
    }
    const offer: InstallOffer = prompt !== null ? 'prompt' : env.ios() ? 'ios' : null;
    const decision = decide({
      app: env.app, now, state, pathname: env.pathname(), framed: env.framed(), standalone: env.standalone(), immersive: env.immersive(),
      dailyWin: state.quizzes < FINISHED_QUIZZES && hasDailyWin(env.store), offer,
    });
    if (handle) {
      // On screen: it stays while the rule still says so for the same kind of offer, and goes (not dismissed) when a game page opens under it.
      if (!decision.show || decision.kind !== kind) hide();
      return;
    }
    if (decision.show) show(decision.kind);
  }

  return {
    tick,
    quizFinished: () => { save(withFinishedQuiz); },
    keepPrompt: (p) => { prompt = p; },
    appInstalled: () => { hide(); save(withInstalled); },
    killed: () => { hide(); save((s) => withKill(s, env.now())); },
    showing: () => handle !== null,
    quiet: () => read().killedUntil > env.now(),
  };
}
