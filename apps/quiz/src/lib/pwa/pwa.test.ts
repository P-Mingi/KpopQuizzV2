// Run PWA (docs/o1/PWA-PLAN.md): the switches, the answer of /sw.js, the words, the pages without a banner, the browser sniffing and the
// rule of the banner. The manifests are in manifest.test.ts.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { PWA_FLAGS, PWA_SW_PATH, pwaAppOf, pwaLocaleOf, pwaMode } from './config';
import { PWA_COPY, pwaCopy } from './copy';
import { isNoBannerPath, withoutLocale } from './paths';
import { isIos, isIosSafari, isStandalone } from './platform';
import {
  DISMISS_MS, EMPTY_STATE, FINISHED_QUIZZES, MIN_VISITS, PWA_KEY, TOUCH_MS, VISIT_GAP_MS, decide, hasDailyWin, readState, touchVisit, withDismissal,
  withFinishedQuiz, writeState,
} from './state';
import { swResponse, swThemeOf } from './sw-route';
import { isFilePath, isKnownRoute } from '@/lib/route-allowlist';
import { legacyAnswer } from '@/lib/seo/legacy-urls';
import { PER_SITE_ROOT_FILES, middlewareStep, rewritesFor } from '@/lib/site/routing';
import { REGISTRY, flagOn } from '@/lib/site/registry';

import type { DecisionContext, PwaState } from './state';

// The two dash characters, built from their code points so this file holds neither (CLAUDE.md).
const DASHES = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);

const SRC = new URL('../../', import.meta.url).pathname;

describe('the switches', () => {
  it('two flags, off by default, public only with the NEXT_PUBLIC_ prefix', () => {
    expect(PWA_FLAGS.map((f) => f.name)).toEqual(['NEXT_PUBLIC_NET_PWA', 'NET_PWA_KILL']);
    for (const f of PWA_FLAGS) expect(f.name.startsWith('NEXT_PUBLIC_'), f.name).toBe(f.scope === 'public');
  });

  it('follows the flag convention: 1 or true is on, anything else is off, the kill switch wins', () => {
    for (const v of [undefined, '', '0', 'false', 'yes', 'on', ' 1']) expect(pwaMode({ NEXT_PUBLIC_NET_PWA: v }), String(v)).toBe('off');
    for (const v of ['1', 'true']) expect(pwaMode({ NEXT_PUBLIC_NET_PWA: v })).toBe('on');
    expect(pwaMode({})).toBe('off');
    expect(pwaMode({ NEXT_PUBLIC_NET_PWA: '1', NET_PWA_KILL: '1' })).toBe('kill');
    expect(pwaMode({ NET_PWA_KILL: 'true' })).toBe('kill');
    expect(pwaMode({ NEXT_PUBLIC_NET_PWA: '1', NET_PWA_KILL: '0' })).toBe('on');
    // next dev never gets a caching worker (its chunks keep one address), but the kill switch still clears an old one.
    expect(pwaMode({ NEXT_PUBLIC_NET_PWA: '1', NODE_ENV: 'development' })).toBe('off');
    expect(pwaMode({ NEXT_PUBLIC_NET_PWA: '1', NODE_ENV: 'production' })).toBe('on');
    expect(pwaMode({ NEXT_PUBLIC_NET_PWA: '1', NET_PWA_KILL: '1', NODE_ENV: 'development' })).toBe('kill');
    expect(flagOn('1')).toBe(true);
  });

  it('one app per domain: kpop and hub; OtakuQuiz has none', () => {
    expect(pwaAppOf('kpop')).toBe('kpop');
    expect(pwaAppOf('hub')).toBe('hub');
    expect(pwaAppOf('anime')).toBeNull();
  });

  it('the language of a path is the language of the pages', () => {
    for (const p of ['/', '/q/x', '/frozen', '/fra', '/anime/fr']) expect(pwaLocaleOf(p), p).toBe('en');
    for (const p of ['/fr', '/fr/', '/fr/faq']) expect(pwaLocaleOf(p), p).toBe('fr');
  });
});

describe('/sw.js', () => {
  const read = async (r: Response): Promise<{ status: number; body: string; headers: Headers }> => ({ status: r.status, body: await r.text(), headers: r.headers });

  it('is a 404 with the flag off (kpopquiz.org keeps today\'s answer) and on every OtakuQuiz build, whatever the flags', async () => {
    for (const site of ['kpop', 'hub'] as const) expect((await read(swResponse(site, {}))).status, site).toBe(404);
    for (const env of [{}, { NEXT_PUBLIC_NET_PWA: '1' }, { NET_PWA_KILL: '1' }, { NEXT_PUBLIC_NET_PWA: '1', NET_PWA_KILL: '1' }]) {
      expect((await read(swResponse('anime', env))).status, JSON.stringify(env)).toBe(404);
    }
  });

  it('is the worker of the app with the flag on: JavaScript, Cache-Control no-cache, nosniff', async () => {
    for (const site of ['kpop', 'hub'] as const) {
      const r = await read(swResponse(site, { NEXT_PUBLIC_NET_PWA: '1' }));
      expect(r.status).toBe(200);
      expect(r.headers.get('content-type')).toBe('text/javascript; charset=utf-8');
      expect(r.headers.get('cache-control')).toBe('no-cache');
      expect(r.headers.get('x-content-type-options')).toBe('nosniff');
      expect(r.body).toContain(REGISTRY[site].brand.name);
      expect(r.body).toContain("addEventListener('fetch'");
    }
  });

  it('is the self-unregistering worker with the kill switch on, flag on or off, with the same headers', async () => {
    for (const site of ['kpop', 'hub'] as const) {
      for (const flag of [undefined, '1']) {
        const r = await read(swResponse(site, { NEXT_PUBLIC_NET_PWA: flag, NET_PWA_KILL: '1' }));
        expect(r.status).toBe(200);
        expect(r.headers.get('cache-control')).toBe('no-cache');
        expect(r.body).toContain('registration.unregister()');
        expect(r.body).not.toContain("addEventListener('fetch'");
      }
    }
  });

  it('is served from the root: the route files exist, are dynamic, and guard the site', () => {
    const kpop = readFileSync(join(SRC, 'app/sw.js/route.ts'), 'utf8');
    const hub = readFileSync(join(SRC, 'app/sites/[site]/sw.js/route.ts'), 'utf8');
    for (const file of [kpop, hub]) {
      expect(file).toContain("export const dynamic = 'force-dynamic'");
      expect(file).toContain('swResponse(');
    }
    expect(kpop).toContain("SITE_ID !== 'kpop'");
    expect(hub).toContain('isServedSite(site)');
    expect(PER_SITE_ROOT_FILES).toContain('/sw.js');
    expect(PWA_SW_PATH).toBe('/sw.js');
  });

  it('the middleware lets /sw.js through on every build as a file, the hub rewrites it to its own route, kpop adds no rewrite, and the offline page colours come from the site theme', () => {
    for (const site of ['kpop', 'hub'] as const) expect(middlewareStep(site, '/sw.js'), site).not.toBe('not-found');
    expect(isFilePath('/sw.js')).toBe(true);
    expect(isKnownRoute('/sw.js')).toBe(false);
    expect(legacyAnswer('/sw.js', true)).toBeNull();
    expect(rewritesFor('hub')).toContainEqual({ source: '/sw.js', destination: '/sites/hub/sw.js' });
    expect(rewritesFor('anime')).toContainEqual({ source: '/sw.js', destination: '/sites/anime/sw.js' });
    expect(rewritesFor('kpop')).toEqual([]);
    expect(swThemeOf('kpop').page).toBe(REGISTRY.kpop.theme.light.page);
    expect(swThemeOf('hub').accent).toBe(REGISTRY.hub.theme.light['pink-fill']);
    expect(swThemeOf('hub').pageDark).toBe(REGISTRY.hub.theme.dark.page);
  });
});

describe('the words', () => {
  const keys = Object.keys(PWA_COPY.en) as (keyof typeof PWA_COPY.en)[];

  it('English and French have the same keys, all filled', () => {
    expect(Object.keys(PWA_COPY.fr).sort()).toEqual([...keys].sort());
    for (const locale of ['en', 'fr'] as const) for (const k of keys) expect(PWA_COPY[locale][k].trim().length, `${locale}.${k}`).toBeGreaterThan(0);
  });

  it('has no dash character, no emoji, and fills the brand from its argument', () => {
    for (const locale of ['en', 'fr'] as const) {
      for (const k of keys) {
        const text = PWA_COPY[locale][k];
        expect(text, `${locale}.${k}`).not.toMatch(DASHES);
        expect(text, `${locale}.${k}`).not.toMatch(/\p{Extended_Pictographic}/u);
      }
      const c = pwaCopy(locale, 'KpopQuiz');
      for (const v of Object.values(c)) expect(v).not.toContain('{');
      expect(c.installTitle).toContain('KpopQuiz');
    }
    expect(pwaCopy('en', 'Bunnyverse').installTitle).toBe('Install Bunnyverse');
    expect(pwaCopy('fr', 'Bunnyverse').installTitle).toBe('Installer Bunnyverse');
  });

  it('the iOS guide is the two gestures of the plan: Share, then Add to Home Screen (Partager, puis Sur l\'ecran d\'accueil)', () => {
    expect(PWA_COPY.en.iosStep1).toContain('Share');
    expect(PWA_COPY.en.iosStep2).toContain('Add to Home Screen');
    expect(PWA_COPY.fr.iosStep1).toContain('Partager');
    expect(PWA_COPY.fr.iosStep2).toContain("Sur l'écran d'accueil");
  });
});

describe('pages without a banner', () => {
  it('a quiz, a game or an account step never has it, in either language', () => {
    for (const p of ['/q/bts-army-level-test', '/fr/q/x', '/g/x', '/blindtest', '/blindtest/ranked', '/quiz/x/edit', '/create', '/live/x', '/join', '/embed/q/x',
      '/name-all/bts', '/guess-the-kpop-idol', '/kpop-true-or-false', '/daily', '/login', '/onboarding', '/s/abc']) {
      expect(isNoBannerPath('kpop', p), `kpop ${p}`).toBe(true);
    }
    for (const p of ['/kpopdle', '/fr/kpopdle', '/otakudle', '/otakudle/one-piece', '/login']) expect(isNoBannerPath('hub', p), `hub ${p}`).toBe(true);
  });

  it('the home, the browse pages and the hub\'s Burrow may have it', () => {
    for (const p of ['/', '/fr', '/bts-quiz', '/quizzes', '/leaderboard', '/groups', '/articles/x', '/me', '/trivia']) expect(isNoBannerPath('kpop', p), `kpop ${p}`).toBe(false);
    for (const p of ['/', '/daily', '/fr/daily', '/credits', '/directory']) expect(isNoBannerPath('hub', p), `hub ${p}`).toBe(false);
  });

  it('the language prefix comes off only as a whole segment', () => {
    expect(withoutLocale('/fr')).toBe('/');
    expect(withoutLocale('/fr/q/x')).toBe('/q/x');
    expect(withoutLocale('/frozen')).toBe('/frozen');
    expect(isNoBannerPath('kpop', '/frq')).toBe(false);
  });
});

describe('the browser', () => {
  const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';
  const IPAD_DESKTOP = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15';
  const IPHONE_CHROME = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1';
  const IPHONE_FB = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/480.0]';
  const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15';
  const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';

  it('iPhone Safari and iPad Safari (also as a Mac with a touch screen) get the guide; nothing else does', () => {
    expect(isIosSafari(IPHONE, 'iPhone', 5)).toBe(true);
    expect(isIosSafari(IPAD_DESKTOP, 'MacIntel', 5)).toBe(true);
    expect(isIosSafari(MAC, 'MacIntel', 0)).toBe(false);
    expect(isIosSafari(ANDROID, 'Linux armv81', 5)).toBe(false);
    expect(isIosSafari(IPHONE_CHROME, 'iPhone', 5)).toBe(false);
    expect(isIosSafari(IPHONE_FB, 'iPhone', 5)).toBe(false);
    expect(isIos(IPHONE_CHROME, 'iPhone', 5)).toBe(true);
  });

  it('standalone is the display mode, or the iOS home screen flag', () => {
    const mm = (on: string[]) => (q: string) => ({ matches: on.some((m) => q.includes(m)) });
    expect(isStandalone({ matchMedia: mm(['standalone']) })).toBe(true);
    expect(isStandalone({ matchMedia: mm(['minimal-ui']) })).toBe(true);
    expect(isStandalone({ matchMedia: mm([]) })).toBe(false);
    expect(isStandalone({ navigatorStandalone: true, matchMedia: mm([]) })).toBe(true);
    expect(isStandalone({})).toBe(false);
    expect(isStandalone({ matchMedia: () => { throw new Error('no'); } })).toBe(false);
  });
});

describe('the rule of the banner', () => {
  const NOW = 1_800_000_000_000;
  const earned: PwaState = { ...EMPTY_STATE, visits: MIN_VISITS, lastSeen: NOW, quizzes: FINISHED_QUIZZES };
  const base: DecisionContext = {
    app: 'kpop', now: NOW, state: earned, pathname: '/', framed: false, standalone: false, immersive: false, dailyWin: false, offer: 'prompt',
  };
  const reason = (c: Partial<DecisionContext>): string => {
    const d = decide({ ...base, ...c });
    return d.show ? 'show' : d.reason;
  };

  it('shows after the finished quizzes, on a second visit, with something to offer', () => {
    expect(decide(base)).toEqual({ show: true, kind: 'prompt' });
    expect(decide({ ...base, offer: 'ios' })).toEqual({ show: true, kind: 'ios' });
  });

  it('shows after a daily game win instead of the quizzes', () => {
    expect(reason({ state: { ...earned, quizzes: 0 } })).toBe('not-earned');
    expect(reason({ state: { ...earned, quizzes: 0 }, dailyWin: true })).toBe('show');
    expect(reason({ app: 'hub', state: { ...earned, quizzes: 0 }, dailyWin: true })).toBe('show');
  });

  it('is the plan, refusal by refusal: never on the first visit, never in a game or a quiz, never full screen, never when installed', () => {
    expect(reason({ state: { ...earned, visits: 1 } })).toBe('first-visit');
    expect(reason({ state: { ...earned, visits: 0 } })).toBe('first-visit');
    expect(reason({ state: { ...earned, quizzes: FINISHED_QUIZZES - 1 } })).toBe('not-earned');
    expect(reason({ pathname: '/q/some-quiz' })).toBe('play-or-account-page');
    expect(reason({ pathname: '/fr/q/some-quiz' })).toBe('play-or-account-page');
    expect(reason({ app: 'hub', pathname: '/kpopdle' })).toBe('play-or-account-page');
    expect(reason({ immersive: true })).toBe('immersive');
    expect(reason({ standalone: true })).toBe('standalone');
    expect(reason({ state: { ...earned, installed: true } })).toBe('installed');
    expect(reason({ framed: true })).toBe('framed');
    expect(reason({ offer: null })).toBe('nothing-to-offer');
  });

  it('a dismissal keeps it away for 30 days exactly, and the kill worker for a day', () => {
    const dismissed = withDismissal(earned, NOW);
    expect(dismissed.dismissedUntil - NOW).toBe(30 * 24 * 60 * 60 * 1000);
    expect(DISMISS_MS).toBe(30 * 24 * 60 * 60 * 1000);
    expect(reason({ state: dismissed })).toBe('dismissed');
    expect(reason({ state: dismissed, now: NOW + DISMISS_MS - 1 })).toBe('dismissed');
    expect(reason({ state: dismissed, now: NOW + DISMISS_MS })).toBe('show');
    expect(reason({ state: { ...earned, killedUntil: NOW + 1 } })).toBe('killed');
  });

  it('counts a visit after 30 minutes of silence, keeps one alive, and survives a clock that went back', () => {
    const first = touchVisit(EMPTY_STATE, NOW);
    expect(first.visits).toBe(1);
    expect(touchVisit(first, NOW + TOUCH_MS - 1)).toBe(first);
    expect(touchVisit(first, NOW + TOUCH_MS).visits).toBe(1);
    expect(touchVisit(first, NOW + TOUCH_MS).lastSeen).toBe(NOW + TOUCH_MS);
    expect(touchVisit(first, NOW + VISIT_GAP_MS + 1).visits).toBe(2);
    expect(touchVisit(first, NOW - 1000).visits).toBe(2);
    expect(withFinishedQuiz(first).quizzes).toBe(1);
  });
});

describe('what the banner remembers', () => {
  const memory = (): { map: Map<string, string>; store: { getItem(k: string): string | null; setItem(k: string, v: string): void } } => {
    const map = new Map<string, string>();
    return { map, store: { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => { map.set(k, v); } } };
  };

  it('round-trips, and a broken, foreign or hostile value is the empty state', () => {
    const m = memory();
    const state: PwaState = { visits: 3, lastSeen: 5, quizzes: 2, dismissedUntil: 9, installed: true, killedUntil: 4 };
    expect(writeState(m.store, state)).toBe(true);
    expect(readState(m.store)).toEqual(state);
    for (const raw of ['', 'null', '[]', '"x"', '{', '{"visits":"3"}', '{"visits":-1,"quizzes":1e99}']) {
      m.map.set(PWA_KEY, raw);
      expect(readState(m.store), raw).toEqual(EMPTY_STATE);
    }
  });

  it('works with no storage at all, and with a storage that throws: nothing is remembered, nothing breaks', () => {
    expect(readState(null)).toEqual(EMPTY_STATE);
    expect(writeState(null, EMPTY_STATE)).toBe(false);
    const throwing = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    expect(readState(throwing)).toEqual(EMPTY_STATE);
    expect(writeState(throwing, EMPTY_STATE)).toBe(false);
    expect(hasDailyWin(throwing)).toBe(false);
  });

  it('reads a win of the daily games from their own history, and only a win', () => {
    const m = memory();
    expect(hasDailyWin(m.store)).toBe(false);
    m.map.set('dle:v1:history', JSON.stringify({ kpopdle: { '2026-11-01': { won: false, guesses: 8 } } }));
    expect(hasDailyWin(m.store)).toBe(false);
    m.map.set('dle:v1:history', JSON.stringify({ kpopdle: { '2026-11-01': { won: false, guesses: 8 } }, otakudle: { '2026-11-02': { won: true, guesses: 3 } } }));
    expect(hasDailyWin(m.store)).toBe(true);
    for (const raw of ['{', 'null', '[]', '{"a":1}', '{"a":[]}']) {
      m.map.set('dle:v1:history', raw);
      expect(hasDailyWin(m.store), raw).toBe(false);
    }
  });
});
