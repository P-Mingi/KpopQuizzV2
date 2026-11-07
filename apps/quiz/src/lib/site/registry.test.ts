// Run O1 contract: the kpop registry entry equals today's literals, read from the modules
// and files that hold them on origin/main, so B1's swap of a literal for SITE.* cannot change
// a byte. The anime and hub entries are checked for shape and for their frozen values only.

import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { MAX_PER_DAY } from '@/lib/editorial/types';
import { INDEXNOW_KEY } from '@/lib/indexnow';
import { LEVEL_TITLES } from '@/lib/level-titles';
import { validateSchedule, type QuizBankEntry } from '@/lib/quiz-bank-scheduling';

import { siteForOrigin } from './origin-site';
import * as registryModule from './registry';
import {
  NETWORK, PLACEHOLDERS, REGISTRY, SITE, SITE_ID, dlePreviewOn, flagOn, isSiteId, netOrigin, parseNetOrigins,
  resolveSiteId, siteConfig,
} from './registry';
import { SITE_IDS } from './types';

import type { ThemeTokenName, ThemeTokens } from './types';

const SRC = fileURLToPath(new URL('../../', import.meta.url));
const APP = fileURLToPath(new URL('../../../', import.meta.url));
const REPO = fileURLToPath(new URL('../../../../../', import.meta.url));
const read = (p: string): string => readFileSync(p, 'utf8');

const kpop = REGISTRY.kpop;
// The hub id of research A, refused by the contract (naming trap), spelled so a grep of the diff
// for the trap finds nothing.
const LEGACY_HUB_ID = ['i', 'd'].join('');

describe('kpop entry = today\'s literals', () => {
  const layout = read(`${SRC}app/layout.tsx`);
  const org = read(`${SRC}lib/seo/org.ts`);

  it('url and domain match lib/seo/org.ts and the root layout fallback', () => {
    expect(org).toContain(`export const SITE_URL = '${kpop.url}';`);
    expect(layout).toContain(`: '${kpop.url}';`);
    expect(kpop.url).toBe(`https://${kpop.domain}`);
  });

  it('brand name, title template and Open Graph image match the root layout', () => {
    expect(layout).toContain(`template: '${kpop.seo.titleTemplate}',`);
    expect(layout).toContain(`siteName: '${kpop.brand.name}',`);
    expect(layout).toContain(`publisher: '${kpop.brand.name}',`);
    expect(layout).toContain(`{ url: '${kpop.brand.ogTemplate}', width: 1200, height: 630,`);
    expect(layout).toContain(`{ url: '${kpop.brand.favicon}', type: 'image/svg+xml' }`);
  });

  it('manifest names match public/site.webmanifest', () => {
    const manifest = JSON.parse(read(`${APP}public/site.webmanifest`)) as { name: string; short_name: string };
    expect(manifest.name).toBe(kpop.brand.name);
    expect(manifest.short_name).toBe(kpop.brand.shortName);
  });

  it('brand assets exist in public/', () => {
    for (const p of [kpop.brand.logo, kpop.brand.favicon, kpop.brand.ogTemplate, kpop.seo.organization.logo]) {
      expect(existsSync(`${APP}public${p}`), p).toBe(true);
    }
  });

  it('mascot matches the mascot alt text', () => {
    expect(read(`${SRC}components/ui/mascot.tsx`)).toContain(`default: '${kpop.brand.mascot} mascot',`);
  });

  it('organization matches organizationJsonLd() of lib/seo/org.ts', () => {
    const o = kpop.seo.organization;
    expect(org).toContain(`name: '${o.name}',`);
    expect(org).toContain(`alternateName: '${o.alternateName}',`);
    expect(org).toContain(`logo: \`\${SITE_URL}${o.logo}\`,`);
    expect(org).toContain(`export const CONTACT_EMAIL = '${o.email}';`);
  });

  it('IndexNow key is lib/indexnow.ts INDEXNOW_KEY and its public key file exists', () => {
    expect(kpop.seo.indexNowKey).toBe(INDEXNOW_KEY);
    expect(read(`${APP}public/${INDEXNOW_KEY}.txt`).trim()).toBe(INDEXNOW_KEY);
  });

  // Fusion A5: main builds /llms.txt in lib/seo/llms.ts (SEO Mission 3 F.4); the heading is the first line it returns.
  it('llms.txt heading is the first line of lib/seo/llms.ts (app/llms.txt/route.ts calls it)', () => {
    expect(read(`${SRC}app/llms.txt/route.ts`)).toContain("import { buildLlmsTxt } from '@/lib/seo/llms';");
    expect(read(`${SRC}lib/seo/llms.ts`)).toContain(`return \`# ${kpop.seo.llmsTxt.title}\n`);
  });

  it('a kpop hub is noindex below 1 published quiz (group-quiz-page.tsx)', () => {
    expect(kpop.seo.minPublishedForIndexableHub).toBe(1);
    expect(read(`${SRC}app/(site)/[slug]/group-quiz-page.tsx`)).toContain('...(n === 0 ? { robots: { index: false, follow: true } } : {}),');
  });

  it('level ladder equals lib/level-titles.ts LEVEL_TITLES', () => {
    expect(kpop.levelTitles).toEqual(LEVEL_TITLES);
  });

  it('editorial caps equal MAX_PER_DAY and the quiz bank weekly group limit', () => {
    expect(kpop.editorial.dailyItemCap).toBe(MAX_PER_DAY);
    expect(kpop.editorial.quizDailyCap).toBe(0);
    const row = (id: string, date: string): QuizBankEntry => ({
      id, title: id, description: null, group_id: 7, quiz_type: 'multiple_choice', difficulty: 'easy',
      category: `c${id}`, questions: [], scheduled_date: date, status: 'scheduled', verified_at: null,
      verification_notes: null, published_quiz_id: null, created_at: date, updated_at: date,
    });
    // Monday 2026-10-12 to Sunday 2026-10-18, every other day so no "consecutive" rule fires.
    const week = ['2026-10-12', '2026-10-14', '2026-10-16', '2026-10-18'];
    const atLimit = week.slice(0, kpop.editorial.weeklyGroupLimit).map((d, i) => row(String(i), d));
    const overLimit = week.slice(0, kpop.editorial.weeklyGroupLimit + 1).map((d, i) => row(String(i), d));
    expect(validateSchedule(atLimit).filter((v) => v.rule === 'group_weekly_limit')).toHaveLength(0);
    expect(validateSchedule(overLimit).filter((v) => v.rule === 'group_weekly_limit')).toHaveLength(1);
  });

  it('daily system account and fallback topic match ensure_daily_quiz (migration 042)', () => {
    const sql = read(`${REPO}supabase/migrations/042_fix_ensure_daily_quiz.sql`);
    expect(sql).toContain(`'${kpop.daily.systemUserId}',`);
    expect(sql).toContain(`WHERE slug = '${kpop.daily.fallbackGroupSlug}'`);
  });

  it('theme tokens equal styles/ux-v1/a0.css (light and dark blocks)', () => {
    const css = read(`${SRC}styles/ux-v1/a0.css`);
    const block = (start: string): string => {
      const i = css.indexOf(start);
      expect(i, start).toBeGreaterThan(-1);
      return css.slice(i, css.indexOf('}', i));
    };
    const parse = (b: string): Map<string, string> => {
      const m = new Map<string, string>();
      for (const hit of b.matchAll(/--ux-([a-z0-9-]+):\s*([^;]+);/g)) m.set(hit[1]!, hit[2]!.trim());
      return m;
    };
    const light = parse(block('html.ux-v1,\n.ux-theme-light {'));
    const dark = parse(block('html.ux-v1.dark,\n.ux-theme-dark {'));
    const check = (tokens: ThemeTokens, live: Map<string, string>): void => {
      for (const [name, value] of Object.entries(tokens) as [ThemeTokenName, string][]) {
        // New token: absent before B1, then declared by B1 with exactly the registry value.
        if (name === 'on-accent' && !live.has(name)) continue;
        expect(live.get(name), name).toBe(value);
      }
    };
    check(kpop.theme.light, light);
    check(kpop.theme.dark, dark);
    // The literal the new --ux-on-accent replaces (before B1), or the token itself (after B1).
    expect(css).toMatch(/\.ux-btn-primary[^}]*color:\s*(#fff\b|var\(--ux-on-accent\))/i);
    expect(kpop.theme.light['on-accent']).toBe('#FFFFFF');
    expect(kpop.theme.dark['on-accent']).toBe('#FFFFFF');
  });

  it('auth: kpop keeps /auth/callback, Supabase OAuth for Google, and one sign-out scope', () => {
    expect(kpop.auth).toEqual({
      providers: ['google', 'discord', 'email'], googleClientIdEnv: null,
      emailLanding: '/auth/callback', signOutModes: ['global'],
    });
  });

  it('kpop routes are today\'s route allowlist and nothing is a placeholder', () => {
    expect(kpop.routes.allow).toBe('route-allowlist');
    expect(PLACEHOLDERS.kpop).toEqual([]);
  });
});

describe('frozen values of every entry (BACKLOG 5.1)', () => {
  it('ids, kinds, letters, brands and domains', () => {
    expect(SITE_IDS).toEqual(['kpop', 'anime', 'hub']);
    expect(Object.keys(REGISTRY)).toEqual(['kpop', 'anime', 'hub']);
    const rows = SITE_IDS.map((id) => {
      const s = REGISTRY[id];
      return [s.id, s.kind, s.letter, s.brand.name, s.domain, s.url];
    });
    expect(rows).toEqual([
      ['kpop', 'world', 'k', 'KpopQuiz', 'kpopquiz.org', 'https://kpopquiz.org'],
      ['anime', 'world', 'a', 'OtakuQuiz', 'bunnyverse.org', 'https://bunnyverse.org/anime'],
      ['hub', 'hub', 'f', 'Bunnyverse', 'bunnyverse.org', 'https://bunnyverse.org'],
    ]);
    expect(NETWORK).toEqual({ name: 'Bunnyverse', url: 'https://bunnyverse.org' });
  });

  it('every entry has the same keys in the same order (the frozen shape)', () => {
    const shape = Object.keys(kpop);
    expect(shape.join(',')).toBe(
      'id,kind,url,domain,letter,brand,vocabulary,features,routes,seo,audio,theme,levelTitles,auth,passport,editorial,daily,copy',
    );
    for (const id of SITE_IDS) {
      expect(Object.keys(REGISTRY[id])).toEqual(shape);
      expect(Object.keys(REGISTRY[id].features)).toEqual(Object.keys(kpop.features));
      expect(REGISTRY[id].copy.namespace).toBe(id);
      expect(REGISTRY[id].audio).toEqual({ source: 'deezer', kit: 'required' });
      expect(REGISTRY[id].passport.probeOrder).toEqual([]);
    }
  });

  // Bunnyverse (owner, 2026-10-28, reverses D-099): anime and hub sign in with Google and Discord only, Google through
  // Supabase's OAuth redirect (kpopquiz.org's client, no client id env), never with an email link.
  it('anime: star oshi, /auth/confirm, Google and Discord only, both sign-out scopes, kpop-only features off', () => {
    const a = REGISTRY.anime;
    expect(a.vocabulary.favourites.pickIcon).toBe('star');
    expect(a.auth.emailLanding).toBe('/auth/confirm');
    expect(a.auth.providers).toEqual(['google', 'discord']);
    expect(a.auth.providers).not.toContain('email');
    expect(a.auth.googleClientIdEnv).toBeNull();
    expect(a.auth.signOutModes).toEqual(['global', 'local']);
    for (const k of ['imageQuiz', 'fandomWar', 'mvPulse', 'live', 'verse', 'embed', 'localizedLandings'] as const) {
      expect(a.features[k], k).toBe(false);
    }
    expect(a.features.airingBanner).toBe(true);
    expect(a.seo.minPublishedForIndexableHub).toBe(3);
    expect(a.daily.fallbackGroupSlug).toBe('anime-mix');
  });

  it('hub: passport pages only, no quiz feature', () => {
    const h = REGISTRY.hub;
    const on = Object.entries(h.features).filter(([, v]) => v).map(([k]) => k);
    expect(on).toEqual(['passportPages']);
    expect(h.auth.emailLanding).toBe('/auth/confirm');
    expect(h.auth.providers).toEqual(['google', 'discord']);
    expect(h.auth.googleClientIdEnv).toBeNull();
  });

  it('placeholders are declared for anime and hub', () => {
    expect(PLACEHOLDERS.anime.length).toBeGreaterThan(0);
    expect(PLACEHOLDERS.hub.length).toBeGreaterThan(0);
  });
});

describe('the site of a build', () => {
  it('unset or empty means kpop', () => {
    expect(resolveSiteId({})).toBe('kpop');
    expect(resolveSiteId({ NEXT_PUBLIC_SITE_ID: '', SITE_ID: ' ' })).toBe('kpop');
  });

  it('NEXT_PUBLIC_SITE_ID wins, SITE_ID is the server alias', () => {
    expect(resolveSiteId({ NEXT_PUBLIC_SITE_ID: 'anime' })).toBe('anime');
    expect(resolveSiteId({ SITE_ID: 'hub' })).toBe('hub');
    expect(resolveSiteId({ NEXT_PUBLIC_SITE_ID: 'kpop', SITE_ID: 'kpop' })).toBe('kpop');
  });

  it('an unknown value or a disagreement throws', () => {
    expect(() => resolveSiteId({ NEXT_PUBLIC_SITE_ID: LEGACY_HUB_ID })).toThrow(/unknown site id/);
    expect(() => resolveSiteId({ NEXT_PUBLIC_SITE_ID: 'world' })).toThrow(/unknown site id/);
    expect(() => resolveSiteId({ NEXT_PUBLIC_SITE_ID: 'anime', SITE_ID: 'hub' })).toThrow(/disagree/);
  });

  it('SITE follows the environment of the test run and siteConfig reads the registry', () => {
    expect(SITE).toBe(REGISTRY[SITE_ID]);
    expect(siteConfig('anime')).toBe(REGISTRY.anime);
    expect(isSiteId('hub')).toBe(true);
    expect(isSiteId(LEGACY_HUB_ID)).toBe(false);
  });
});

describe('flags (flags-env.md 3)', () => {
  it('on is 1 or true, everything else is off', () => {
    expect(flagOn('1')).toBe(true);
    expect(flagOn('true')).toBe(true);
    for (const v of [undefined, '', '0', 'false', 'TRUE', 'yes', ' 1']) expect(flagOn(v), String(v)).toBe(false);
  });
});

describe('origins outside production (flags-env.md 4)', () => {
  const DEV = 'kpop=http://kpop.localhost:3000,anime=http://anime.localhost:3001 hub=http://hub.localhost:3002';

  it('parses the dev map and keeps registry urls for sites without an entry', () => {
    expect(parseNetOrigins(DEV)).toEqual({
      kpop: 'http://kpop.localhost:3000', anime: 'http://anime.localhost:3001', hub: 'http://hub.localhost:3002',
    });
    expect(parseNetOrigins(undefined)).toEqual({});
    expect(netOrigin('anime', { NEXT_PUBLIC_NET_ORIGINS: DEV })).toBe('http://anime.localhost:3001');
    expect(netOrigin('anime', { NEXT_PUBLIC_NET_ORIGINS: 'hub=https://fq-staging.vercel.app' })).toBe('https://bunnyverse.org/anime');
    expect(netOrigin('hub', { NEXT_PUBLIC_NET_ORIGINS: 'hub=https://fq-staging.vercel.app', VERCEL_ENV: 'preview' }))
      .toBe('https://fq-staging.vercel.app');
  });

  it('production ignores the map entirely', () => {
    expect(netOrigin('kpop', { NEXT_PUBLIC_NET_ORIGINS: DEV, VERCEL_ENV: 'production' })).toBe('https://kpopquiz.org');
    expect(siteForOrigin('http://anime.localhost:3001', { NEXT_PUBLIC_NET_ORIGINS: DEV, VERCEL_ENV: 'production' })).toBeNull();
    expect(siteForOrigin('https://bunnyverse.org/anime', { VERCEL_ENV: 'production' })).toBe('anime');
  });

  it('maps an origin back to its site, registry urls first', () => {
    expect(siteForOrigin('https://bunnyverse.org', {})).toBe('hub');
    expect(siteForOrigin('http://hub.localhost:3002', { NEXT_PUBLIC_NET_ORIGINS: DEV })).toBe('hub');
    expect(siteForOrigin('https://evil.example', { NEXT_PUBLIC_NET_ORIGINS: DEV })).toBeNull();
  });

  it('refuses malformed entries', () => {
    for (const bad of [
      'anime', 'anime=', `${LEGACY_HUB_ID}=https://bunnyverse.org`, 'world=https://x.org',
      'anime=https://bunnyverse.org/anime/', 'anime=https://bunnyverse.org/anime/path', 'anime=http://bunnyverse.org/anime',
      'anime=javascript:alert(1)', 'anime=https://a.org,anime=https://b.org',
    ]) {
      expect(() => parseNetOrigins(bad), bad).toThrow(/NEXT_PUBLIC_NET_ORIGINS/);
    }
  });
});

// Bunnyverse (finding 7): the hub and OtakuQuiz share the origin https://bunnyverse.org. An Origin header has no path, so an origin
// alone names the site at the root of the domain; 'anime' is only ever the answer for an address under /anime.
describe('siteForOrigin on a shared origin', () => {
  const PROXY = 'hub=http://localhost:3024,anime=http://localhost:3024';

  it('every registry url maps back to its own site, in production and outside it', () => {
    for (const id of SITE_IDS) {
      expect(siteForOrigin(REGISTRY[id].url, {}), id).toBe(id);
      expect(siteForOrigin(REGISTRY[id].url, { VERCEL_ENV: 'production' }), id).toBe(id);
    }
  });

  it('a full URL under /anime is anime, never the hub', () => {
    for (const url of [
      'https://bunnyverse.org/anime', 'https://bunnyverse.org/anime/', 'https://bunnyverse.org/anime/q/who-is-l?ref=x#top',
      'https://BUNNYVERSE.org/anime/series', 'https://bunnyverse.org:443/anime/auth/callback',
    ]) {
      expect(siteForOrigin(url, { VERCEL_ENV: 'production' }), url).toBe('anime');
      expect(siteForOrigin(url, { NEXT_PUBLIC_NET_ORIGINS: PROXY }), url).toBe('anime');
    }
  });

  it('the origin alone, and a path outside /anime, is the hub (the site at the root of bunnyverse.org)', () => {
    for (const url of [
      'https://bunnyverse.org', 'https://bunnyverse.org/', 'https://bunnyverse.org/privacy', 'https://bunnyverse.org/animex',
      'https://bunnyverse.org/anime-mix-quiz', 'https://bunnyverse.org/Anime', 'https://bunnyverse.org/anime/../privacy',
    ]) {
      expect(siteForOrigin(url, { VERCEL_ENV: 'production' }), url).toBe('hub');
    }
    expect(siteForOrigin('https://kpopquiz.org/q/x', {})).toBe('kpop');
  });

  it('dev proxy (hub and anime on one origin): the bare origin is the hub (it was anime), /anime below it is anime, production ignores both', () => {
    expect(siteForOrigin('http://localhost:3024', { NEXT_PUBLIC_NET_ORIGINS: PROXY })).toBe('hub');
    expect(siteForOrigin('http://localhost:3024/anime', { NEXT_PUBLIC_NET_ORIGINS: PROXY })).toBe('anime');
    expect(siteForOrigin('http://localhost:3024/anime/q/x', { NEXT_PUBLIC_NET_ORIGINS: PROXY })).toBe('anime');
    expect(siteForOrigin('http://localhost:3024/privacy', { NEXT_PUBLIC_NET_ORIGINS: PROXY })).toBe('hub');
    expect(siteForOrigin('http://anime.localhost:3001', { NEXT_PUBLIC_NET_ORIGINS: 'anime=http://anime.localhost:3001' })).toBeNull();
    expect(siteForOrigin('http://anime.localhost:3001/anime', { NEXT_PUBLIC_NET_ORIGINS: 'anime=http://anime.localhost:3001' })).toBe('anime');
    expect(siteForOrigin('http://localhost:3024', { NEXT_PUBLIC_NET_ORIGINS: PROXY, VERCEL_ENV: 'production' })).toBeNull();
    expect(siteForOrigin('http://localhost:3024/anime', { NEXT_PUBLIC_NET_ORIGINS: PROXY, VERCEL_ENV: 'production' })).toBeNull();
  });

  it('anything that is not an http(s) address of a site of the network is null', () => {
    for (const bad of [
      '', 'null', 'bunnyverse.org', 'javascript:alert(1)', 'ftp://bunnyverse.org/anime', 'https://bunnyverse.org.evil.example',
      'https://evil.example/https://bunnyverse.org/anime', 'https://user@evil.example/anime', 'http://bunnyverse.org/anime',
    ]) {
      expect(siteForOrigin(bad, { NEXT_PUBLIC_NET_ORIGINS: PROXY }), bad).toBeNull();
    }
  });
});

// Bunnyverse review (2026-10-28): siteForOrigin is server-only; registry.ts is in every kpopquiz.org client bundle and must not
// carry it (lib/site/origin-site.ts).
describe('siteForOrigin lives outside the registry module', () => {
  it('registry.ts exports no siteForOrigin', () => {
    expect('siteForOrigin' in registryModule).toBe(false);
  });
});

// DEV-PREVIEW (owner order, 2026-11-03): NEXT_PUBLIC_DLE_PREVIEW opens the daily games on a Preview only. Off by default, ignored on Production.
describe('NEXT_PUBLIC_DLE_PREVIEW (the Preview-only switch of dailyGuess)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('is off when unset, empty, 0 or false, on for 1 and true, and only on a Preview', () => {
    expect(dlePreviewOn({})).toBe(false);
    for (const v of [undefined, '', '0', 'false', 'yes', ' 1']) expect(dlePreviewOn({ NEXT_PUBLIC_DLE_PREVIEW: v, NEXT_PUBLIC_VERCEL_ENV: 'preview' }), String(v)).toBe(false);
    for (const v of ['1', 'true']) {
      expect(dlePreviewOn({ NEXT_PUBLIC_DLE_PREVIEW: v, NEXT_PUBLIC_VERCEL_ENV: 'preview' })).toBe(true);
      expect(dlePreviewOn({ NEXT_PUBLIC_DLE_PREVIEW: v, NEXT_PUBLIC_VERCEL_ENV: 'production' })).toBe(false);
      expect(dlePreviewOn({ NEXT_PUBLIC_DLE_PREVIEW: v, NEXT_PUBLIC_VERCEL_ENV: 'development' })).toBe(false);
      expect(dlePreviewOn({ NEXT_PUBLIC_DLE_PREVIEW: v, NEXT_PUBLIC_VERCEL_ENV: 'Preview' })).toBe(false);
      expect(dlePreviewOn({ NEXT_PUBLIC_DLE_PREVIEW: v, NEXT_PUBLIC_VERCEL_ENV: '' })).toBe(false);
    }
  });

  it('is closed by default where the deployment kind is unknown, as in a browser bundle that only has the public flag', () => {
    // Integrator review 2026-11-03: a flag set on Production by mistake must not open the games on the client when the server keeps them closed.
    for (const v of ['1', 'true']) {
      expect(dlePreviewOn({ NEXT_PUBLIC_DLE_PREVIEW: v })).toBe(false);
      expect(dlePreviewOn({ NEXT_PUBLIC_DLE_PREVIEW: v, NEXT_PUBLIC_VERCEL_ENV: undefined })).toBe(false);
    }
  });

  it('does not read VERCEL_ENV: the server-only variable alone never turns the switch on, whatever its value', () => {
    // Integrator review 2026-11-03: VERCEL_ENV is not inlined in a client bundle, so a test on it made the server and the client disagree.
    // The param type no longer has it, so the cast is what lets the test hand it over.
    const withServerVar = (e: Record<string, string | undefined>): boolean => dlePreviewOn(e as Parameters<typeof dlePreviewOn>[0]);
    for (const v of ['1', 'true']) {
      for (const vercelEnv of ['preview', 'development', 'production', '', undefined]) {
        expect(withServerVar({ NEXT_PUBLIC_DLE_PREVIEW: v, VERCEL_ENV: vercelEnv }), `${v} / VERCEL_ENV ${String(vercelEnv)}`).toBe(false);
      }
      // One source of truth: the public value decides, whatever the server-only one says next to it.
      expect(withServerVar({ NEXT_PUBLIC_DLE_PREVIEW: v, NEXT_PUBLIC_VERCEL_ENV: 'preview', VERCEL_ENV: 'production' })).toBe(true);
      expect(withServerVar({ NEXT_PUBLIC_DLE_PREVIEW: v, NEXT_PUBLIC_VERCEL_ENV: 'production', VERCEL_ENV: 'preview' })).toBe(false);
    }
  });

  it('passes the two public values written out in full, so Next inlines the same ones in the server and the client bundles', () => {
    const call = /dailyGuess: dlePreviewOn\(([^\n]*)\),?\n/.exec(read(`${SRC}lib/site/registry.ts`));
    expect(call, 'the dailyGuess line of the hub').not.toBeNull();
    const args = call?.[1] ?? '';
    expect(args).toContain('process.env.NEXT_PUBLIC_DLE_PREVIEW');
    expect(args).toContain('process.env.NEXT_PUBLIC_VERCEL_ENV');
    // Not the server-only variable, and not the env object as a whole (Next inlines `process.env.NAME` accesses only).
    expect(args).not.toMatch(/process\.env\.VERCEL_ENV|\.\.\.process\.env|process\.env\s*[,)}]/);
  });

  it('leaves the hub switch off in this test run, where the variable is not set', () => {
    expect(REGISTRY.hub.features.dailyGuess).toBe(false);
    expect(REGISTRY.hub.routes.allow).not.toContain('/kpopdle');
  });

  it('turns the hub switch and its route map on with the variable on a preview, and not on Production', async () => {
    vi.stubEnv('NEXT_PUBLIC_DLE_PREVIEW', '1');
    vi.stubEnv('NEXT_PUBLIC_VERCEL_ENV', 'preview');
    vi.resetModules();
    const on = await import('./registry');
    expect(on.REGISTRY.hub.features.dailyGuess).toBe(true);
    expect(on.REGISTRY.hub.routes.allow).toEqual(expect.arrayContaining(['/daily', '/kpopdle', '/otakudle', '/otakudle/one-piece', '/otakudle/dragon-ball', '/fr/otakudle']));
    // Only the hub's switch moves: kpop and anime keep their own features.
    expect(on.REGISTRY.kpop.features.dailyGuess).toBe(false);
    expect(on.REGISTRY.anime.features.dailyGuess).toBe(false);
    vi.stubEnv('NEXT_PUBLIC_VERCEL_ENV', 'production');
    vi.resetModules();
    const prod = await import('./registry');
    expect(prod.REGISTRY.hub.features.dailyGuess).toBe(false);
    // The flag alone, with no deployment kind (a client bundle reads only the public values), keeps the switch closed.
    vi.stubEnv('NEXT_PUBLIC_VERCEL_ENV', '');
    vi.resetModules();
    const unknown = await import('./registry');
    expect(unknown.REGISTRY.hub.features.dailyGuess).toBe(false);
    expect(prod.REGISTRY.hub.features.dailyGuess).toBe(false);
    expect(prod.REGISTRY.hub.routes.allow).not.toContain('/kpopdle');
  });

  it('on the module too: only the public deployment kind "preview" with the flag opens the hub; VERCEL_ENV and the other kinds do not', async () => {
    const hubOn = async (): Promise<boolean> => {
      vi.resetModules();
      return (await import('./registry')).REGISTRY.hub.features.dailyGuess;
    };
    // Flag on, deployment kind unset (a local build, a test run, a client bundle without system variables): closed, even with VERCEL_ENV preview.
    vi.stubEnv('NEXT_PUBLIC_DLE_PREVIEW', '1');
    vi.stubEnv('NEXT_PUBLIC_VERCEL_ENV', undefined);
    vi.stubEnv('VERCEL_ENV', 'preview');
    expect(await hubOn()).toBe(false);
    for (const kind of ['production', 'development', '']) {
      vi.stubEnv('NEXT_PUBLIC_VERCEL_ENV', kind);
      expect(await hubOn(), `flag 1 / public kind "${kind}"`).toBe(false);
    }
    // The flag 'true' opens a Preview, and a Preview without the flag stays closed.
    vi.stubEnv('NEXT_PUBLIC_VERCEL_ENV', 'preview');
    vi.stubEnv('NEXT_PUBLIC_DLE_PREVIEW', 'true');
    expect(await hubOn()).toBe(true);
    for (const flag of ['', '0', 'false']) {
      vi.stubEnv('NEXT_PUBLIC_DLE_PREVIEW', flag);
      expect(await hubOn(), `preview / flag "${flag}"`).toBe(false);
    }
    vi.stubEnv('NEXT_PUBLIC_DLE_PREVIEW', undefined);
    expect(await hubOn()).toBe(false);
  });

  it('is a public flag of the table, lane ORCH, not reserved', () => {
    expect(registryModule.O1_FLAGS).toContainEqual({ name: 'NEXT_PUBLIC_DLE_PREVIEW', scope: 'public', lane: 'ORCH', reserved: false });
  });
});
