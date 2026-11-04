// Run PWA (docs/o1/PWA-PLAN.md, section 4): the banner built as DOM, and the controller that decides when it exists, driven with a fake
// clock, a Map for storage and a recording mount. The "absent from the served HTML" guarantee is also proved at the source: the server
// graph never imports a lib/pwa browser module.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

import { mountBanner } from './banner';
import { createController } from './controller';
import { DISMISS_MS, EMPTY_STATE, FINISHED_QUIZZES, PWA_KEY, VISIT_GAP_MS, readState } from './state';

import type { BannerHandle, BannerHandlers, BannerView } from './banner';
import type { ControllerEnv, InstallPrompt } from './controller';

// The two dash characters, built from their code points so this file holds neither (CLAUDE.md).
const DASHES = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);

const SRC = new URL('../../', import.meta.url).pathname;
const T0 = 1_800_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

// ---- a DOM just big enough for the banner -------------------------------------------------------------------------------------------

class FakeNode {
  attrs = new Map<string, string>();
  children: FakeNode[] = [];
  textContent = '';
  parent: FakeNode | null = null;
  handlers = new Map<string, () => void>();
  constructor(readonly tag: string) {}
  setAttribute(k: string, v: string): void { this.attrs.set(k, v); }
  appendChild(c: FakeNode): FakeNode { c.parent = this; this.children.push(c); return c; }
  addEventListener(type: string, fn: () => void): void { this.handlers.set(type, fn); }
  remove(): void { if (this.parent) this.parent.children = this.parent.children.filter((c) => c !== this); this.parent = null; }
  click(): void { this.handlers.get('click')?.(); }
  all(): FakeNode[] { return [this, ...this.children.flatMap((c) => c.all())]; }
  text(): string { return [this.textContent, ...this.children.map((c) => c.text())].join(' ').trim(); }
}
class FakeDoc {
  body = new FakeNode('body');
  createElement(tag: string): FakeNode { return new FakeNode(tag); }
}
const asDoc = (d: FakeDoc): Document => d as unknown as Document;

const VIEW: BannerView = {
  kind: 'prompt', title: 'Install KpopQuiz', body: 'Open KpopQuiz in one tap from your home screen.', steps: ['Tap Share', 'Then tap Add to Home Screen'],
  install: 'Install', notNow: 'Not now', close: 'Close', bottom: 76, safeArea: false,
};

describe('the banner DOM', () => {
  const build = (view: BannerView): { doc: FakeDoc; installs: number; dismisses: number; handle: BannerHandle; root: FakeNode } => {
    const doc = new FakeDoc();
    const calls = { installs: 0, dismisses: 0 };
    const handle = mountBanner(asDoc(doc), view, { onInstall: () => { calls.installs++; }, onDismiss: () => { calls.dismisses++; } });
    const out = { doc, handle, root: handle.element as unknown as FakeNode } as { doc: FakeDoc; installs: number; dismisses: number; handle: BannerHandle; root: FakeNode };
    Object.defineProperty(out, 'installs', { get: () => calls.installs });
    Object.defineProperty(out, 'dismisses', { get: () => calls.dismisses });
    return out;
  };
  const buttons = (n: FakeNode): FakeNode[] => n.all().filter((x) => x.tag === 'button');

  it('the Android and desktop banner: title, one sentence, an Install button, Not now and a Close button; fixed at the bottom, above the tab bar', () => {
    const b = build(VIEW);
    expect(b.doc.body.children).toEqual([b.root]);
    expect(b.root.attrs.get('role')).toBe('region');
    expect(b.root.attrs.get('aria-label')).toBe('Install KpopQuiz');
    const style = b.root.attrs.get('style')!;
    expect(style).toContain('position:fixed');
    expect(style).toContain('bottom:76px');
    expect(b.root.text()).toContain('Install KpopQuiz');
    expect(b.root.text()).toContain('Open KpopQuiz in one tap');
    const [install, later, close] = buttons(b.root);
    expect(install!.textContent).toBe('Install');
    expect(later!.textContent).toBe('Not now');
    expect(close!.attrs.get('aria-label')).toBe('Close');
    install!.click();
    expect(b.installs).toBe(1);
    later!.click();
    close!.click();
    expect(b.dismisses).toBe(2);
  });

  it('the iOS banner: the two gestures in order, no Install button, one Close button', () => {
    const b = build({ ...VIEW, kind: 'ios', title: 'Add KpopQuiz to your home screen' });
    const steps = b.root.all().filter((x) => x.tag === 'li').map((x) => x.textContent);
    expect(steps).toEqual(['Tap Share', 'Then tap Add to Home Screen']);
    expect(buttons(b.root)).toHaveLength(1);
    expect(buttons(b.root)[0]!.attrs.get('aria-label')).toBe('Close');
    expect(b.root.attrs.get('data-kq-pwa')).toBe('ios');
  });

  it('adds the safe area when no tab bar covers it, and remove() takes it out of the page', () => {
    const b = build({ ...VIEW, bottom: 12, safeArea: true });
    expect(b.root.attrs.get('style')).toContain('bottom:calc(12px + env(safe-area-inset-bottom,0px))');
    b.handle.remove();
    expect(b.doc.body.children).toEqual([]);
  });

  it('sets text through textContent only: a word with markup in it never becomes markup', () => {
    const b = build({ ...VIEW, title: '<img src=x onerror=alert(1)>' });
    expect(b.root.all().every((n) => n.tag !== 'img')).toBe(true);
    expect(b.root.text()).toContain('<img src=x onerror=alert(1)>');
  });
});

// ---- the controller -------------------------------------------------------------------------------------------------------------------

interface World {
  now: number;
  path: string;
  framed: boolean;
  standalone: boolean;
  immersive: boolean;
  ios: boolean;
  store: Map<string, string>;
  mounted: { view: BannerView; handlers: BannerHandlers; removed: boolean }[];
  storeFails: boolean;
}

function world(over: Partial<World> = {}): { w: World; env: ControllerEnv; live: () => BannerView[] } {
  const w: World = { now: T0, path: '/', framed: false, standalone: false, immersive: false, ios: false, store: new Map(), mounted: [], storeFails: false, ...over };
  const env: ControllerEnv = {
    app: 'kpop', brand: 'KpopQuiz',
    get store() {
      return w.storeFails ? null : { getItem: (k: string) => w.store.get(k) ?? null, setItem: (k: string, v: string) => { w.store.set(k, v); } };
    },
    now: () => w.now,
    pathname: () => w.path,
    framed: () => w.framed,
    standalone: () => w.standalone,
    immersive: () => w.immersive,
    ios: () => w.ios,
    position: () => ({ bottom: 12, safeArea: true }),
    mount: (view, handlers): BannerHandle => {
      const rec = { view, handlers, removed: false };
      w.mounted.push(rec);
      return { element: {} as HTMLElement, remove: () => { rec.removed = true; } };
    },
  };
  return { w, env, live: () => w.mounted.filter((m) => !m.removed).map((m) => m.view) };
}

const fakePrompt = (outcome: 'accepted' | 'dismissed' = 'accepted'): InstallPrompt & { prompted: number } => {
  const p = { prompted: 0, prompt: async () => { p.prompted++; }, userChoice: Promise.resolve({ outcome }) };
  return p;
};

/** A second visit that has earned the banner: the state a device reaches after a few days and quizzes. */
function earnedWorld(over: Partial<World> = {}): ReturnType<typeof world> {
  const x = world(over);
  x.w.store.set(PWA_KEY, JSON.stringify({ ...EMPTY_STATE, visits: 2, lastSeen: T0 - 1000, quizzes: FINISHED_QUIZZES }));
  return x;
}

describe('the controller', () => {
  it('never shows on the first visit, however many quizzes were finished in it', () => {
    const { w, env, live } = world();
    const c = createController(env);
    c.keepPrompt(fakePrompt());
    c.tick();
    for (let i = 0; i < FINISHED_QUIZZES + 2; i++) c.quizFinished();
    w.path = '/quizzes';
    w.now += 10 * 60_000;
    c.tick();
    expect(live()).toEqual([]);
    expect(readState(env.store).visits).toBe(1);
    expect(readState(env.store).quizzes).toBe(FINISHED_QUIZZES + 2);
  });

  it('shows on a later visit after enough finished quizzes, with the browser\'s install window kept for the button', () => {
    const { w, env, live } = world();
    const c = createController(env);
    c.tick();
    for (let i = 0; i < FINISHED_QUIZZES; i++) c.quizFinished();
    w.now += VISIT_GAP_MS + 1;
    const p = fakePrompt();
    c.keepPrompt(p);
    c.tick();
    expect(readState(env.store).visits).toBe(2);
    expect(live()).toHaveLength(1);
    expect(live()[0]).toMatchObject({ kind: 'prompt', title: 'Install KpopQuiz', install: 'Install', notNow: 'Not now', bottom: 12, safeArea: true });
    expect(c.showing()).toBe(true);
  });

  it('speaks French under /fr and English elsewhere, with the brand of the app', () => {
    const fr = earnedWorld({ path: '/fr/faq' });
    const cf = createController(fr.env);
    cf.keepPrompt(fakePrompt());
    cf.tick();
    expect(fr.live()[0]).toMatchObject({ title: 'Installer KpopQuiz', install: 'Installer', notNow: 'Pas maintenant', close: 'Fermer' });
    const en = earnedWorld({ path: '/faq' });
    const ce = createController(en.env);
    ce.keepPrompt(fakePrompt());
    ce.tick();
    expect(en.live()[0]).toMatchObject({ title: 'Install KpopQuiz', install: 'Install' });
  });

  it('a daily game win earns it without the quizzes (the hub)', () => {
    const { w, env, live } = world();
    w.store.set(PWA_KEY, JSON.stringify({ ...EMPTY_STATE, visits: 2, lastSeen: T0 - 1000 }));
    const hub = { ...env, app: 'hub' as const, brand: 'Bunnyverse' };
    const c = createController(hub);
    c.keepPrompt(fakePrompt());
    c.tick();
    expect(live()).toEqual([]);
    w.store.set('dle:v1:history', JSON.stringify({ kpopdle: { '2026-11-03': { won: true, guesses: 4 } } }));
    c.tick();
    expect(live()[0]).toMatchObject({ kind: 'prompt', title: 'Install Bunnyverse' });
  });

  it('never during a quiz or a game: it waits on the pages where one runs, and appears on the next page', () => {
    const { w, env, live } = earnedWorld({ path: '/q/some-quiz' });
    const c = createController(env);
    c.keepPrompt(fakePrompt());
    c.tick();
    expect(live()).toEqual([]);
    w.immersive = true;
    w.path = '/quizzes';
    c.tick();
    expect(live()).toEqual([]);
    w.immersive = false;
    c.tick();
    expect(live()).toHaveLength(1);
  });

  it('goes away, not dismissed, when a quiz page opens under it, and comes back on the next page', () => {
    const { w, env, live } = earnedWorld({ path: '/' });
    const c = createController(env);
    c.keepPrompt(fakePrompt());
    c.tick();
    expect(live()).toHaveLength(1);
    w.path = '/q/some-quiz';
    c.tick();
    expect(live()).toEqual([]);
    expect(readState(env.store).dismissedUntil).toBe(0);
    w.path = '/leaderboard';
    c.tick();
    expect(live()).toHaveLength(1);
  });

  it('never when already installed (display mode standalone), after appinstalled, or inside a frame', () => {
    const a = earnedWorld({ standalone: true });
    const ca = createController(a.env);
    ca.keepPrompt(fakePrompt());
    ca.tick();
    expect(a.live()).toEqual([]);
    const b = earnedWorld();
    const cb = createController(b.env);
    cb.keepPrompt(fakePrompt());
    cb.tick();
    expect(b.live()).toHaveLength(1);
    cb.appInstalled();
    expect(b.live()).toEqual([]);
    cb.tick();
    expect(b.live()).toEqual([]);
    expect(readState(b.env.store).installed).toBe(true);
    const f = earnedWorld({ framed: true });
    const cf = createController(f.env);
    cf.keepPrompt(fakePrompt());
    cf.tick();
    expect(f.live()).toEqual([]);
  });

  it('offers nothing when the browser gives no install window and is not iOS Safari (Firefox, desktop Safari)', () => {
    const { env, live } = earnedWorld();
    const c = createController(env);
    c.tick();
    expect(live()).toEqual([]);
  });

  it('on iPhone and iPad Safari it shows the two gestures, and the close button keeps it away for 30 days', () => {
    const { w, env, live } = earnedWorld({ ios: true });
    const c = createController(env);
    c.tick();
    expect(live()[0]).toMatchObject({ kind: 'ios', title: "Add KpopQuiz to your home screen", steps: ['Tap Share', 'Then tap Add to Home Screen'] });
    w.mounted[0]!.handlers.onDismiss();
    expect(live()).toEqual([]);
    expect(readState(env.store).dismissedUntil).toBe(T0 + DISMISS_MS);
    w.now = T0 + DISMISS_MS - 1;
    c.tick();
    expect(live()).toEqual([]);
    w.now = T0 + DISMISS_MS;
    c.tick();
    expect(live()).toHaveLength(1);
  });

  it('Install opens the browser window; accepted means installed for good, dismissed in the window means 30 days away', async () => {
    const yes = earnedWorld();
    const cy = createController(yes.env);
    const py = fakePrompt('accepted');
    cy.keepPrompt(py);
    cy.tick();
    yes.w.mounted[0]!.handlers.onInstall();
    await Promise.resolve();
    await Promise.resolve();
    expect(py.prompted).toBe(1);
    expect(yes.live()).toEqual([]);
    expect(readState(yes.env.store).installed).toBe(true);

    const no = earnedWorld();
    const cn = createController(no.env);
    cn.keepPrompt(fakePrompt('dismissed'));
    cn.tick();
    no.w.mounted[0]!.handlers.onInstall();
    await Promise.resolve();
    await Promise.resolve();
    expect(readState(no.env.store).dismissedUntil).toBe(T0 + DISMISS_MS);
    expect(readState(no.env.store).installed).toBe(false);
    cn.tick();
    expect(no.live()).toEqual([]);
  });

  it('the install window can be used once: a second tick after the click offers nothing', async () => {
    const { w, env, live } = earnedWorld();
    const c = createController(env);
    c.keepPrompt(fakePrompt('dismissed'));
    c.tick();
    w.mounted[0]!.handlers.onInstall();
    await Promise.resolve();
    await Promise.resolve();
    w.now = T0 + DISMISS_MS + 1;
    c.tick();
    expect(live()).toEqual([]);
  });

  it('the kill worker: no banner and no registration for a day, then it tries again', () => {
    const { w, env, live } = earnedWorld();
    const c = createController(env);
    c.keepPrompt(fakePrompt());
    c.tick();
    expect(live()).toHaveLength(1);
    expect(c.quiet()).toBe(false);
    c.killed();
    expect(live()).toEqual([]);
    expect(c.quiet()).toBe(true);
    c.tick();
    expect(live()).toEqual([]);
    w.now = T0 + DAY + 1;
    expect(c.quiet()).toBe(false);
  });

  it('with no storage (a private window) a visit is counted by nothing, so the banner never shows, and nothing throws', () => {
    const { env, live } = world({ storeFails: true });
    const c = createController(env);
    c.keepPrompt(fakePrompt());
    c.quizFinished();
    expect(() => { c.tick(); c.killed(); c.appInstalled(); }).not.toThrow();
    expect(live()).toEqual([]);
  });
});

// ---- absent from the served HTML ----------------------------------------------------------------------------------------------------

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((e) => {
    const full = join(dir, e);
    return statSync(full).isDirectory() ? filesUnder(full) : [full];
  });
}

describe('the banner is client code only, after the conditions, and flag-gated', () => {
  const sources = filesUnder(SRC).filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f));
  const importersOf = (needle: RegExp): string[] => sources.filter((f) => needle.test(readFileSync(f, 'utf8'))).map((f) => relative(SRC, f)).sort();

  it('the browser modules are imported by nothing but each other and the one dynamic import of ThemeInit (never by a page, a layout or a server module)', () => {
    expect(importersOf(/from '(?:@\/lib\/pwa|\.\.?\/pwa)\/(?:boot|banner|controller)'/).filter((f) => !f.startsWith('lib/pwa/'))).toEqual([]);
    expect(importersOf(/import\('@\/lib\/pwa\/boot'\)/)).toEqual(['components/layout/theme-init.tsx']);
    expect(importersOf(/@\/lib\/pwa\//).filter((f) => !f.startsWith('lib/pwa/'))).toEqual([
      'app/sites/[site]/sw.js/route.ts', 'app/sw.js/route.ts', 'components/layout/theme-init.tsx',
    ]);
  });

  it('ThemeInit starts it only when NEXT_PUBLIC_NET_PWA is on, and renders nothing for it', () => {
    const text = readFileSync(join(SRC, 'components/layout/theme-init.tsx'), 'utf8');
    expect(text).toMatch(/if \(on\(process\.env\.NEXT_PUBLIC_NET_PWA\)\) \{\s*void import\('@\/lib\/pwa\/boot'\)/);
    expect(text).toContain('export function ThemeInit(): null');
    expect(text).toContain('return null;');
  });

  it('the analytics hook is a no-op until boot sets it, and boot sets it only for a quiz', () => {
    const analytics = readFileSync(join(SRC, 'lib/analytics.ts'), 'utf8');
    expect(analytics).toContain('let finishListener');
    expect(analytics).toContain('finishListener?.(type);');
    const boot = readFileSync(join(SRC, 'lib/pwa/boot.ts'), 'utf8');
    expect(boot).toContain("if (type === 'quiz') controller.quizFinished();");
  });

  it('the page code reads storage inside try/catch only (state.ts) and writes nothing outside the one key', () => {
    const state = readFileSync(join(SRC, 'lib/pwa/state.ts'), 'utf8');
    expect(state.match(/\.setItem\(/g)?.length).toBe(1); // writeState, inside its try
    for (const f of ['boot.ts', 'controller.ts', 'banner.ts', 'platform.ts', 'paths.ts']) {
      expect(readFileSync(join(SRC, 'lib/pwa', f), 'utf8'), f).not.toMatch(/\.setItem\(|document\.cookie|sessionStorage/);
    }
  });

  it('no file of lib/pwa has an em or en dash', () => {
    for (const f of filesUnder(join(SRC, 'lib/pwa'))) expect(readFileSync(f, 'utf8'), f).not.toMatch(DASHES);
  });
});
