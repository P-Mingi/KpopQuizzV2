// Launch polish, lane ADS: Google's rules for a rewarded ad and the owner's rules for consent and age, ONE TEST EACH, so a change that breaks a rule names it.
//   R1 only the official rewarded formats: no reward for a normal ad or a click       R5 no incentive outside the game
//   R2 the player chooses: the screen before each ad, with the link to the odds      R6 one consent tool only: Google's (TCF)
//   R3 never an automatic start                                                      R7 personalised only with consent
//   R4 packs and cards won by an ad cannot be traded or transferred                  R8 a KNOWN minor is tagged; the site knows no age today
//   R9 the flags off give nothing                                                    R10 the provider is interchangeable behind one interface
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { AdIntro, BinderBanner, RewardedAdButton } from '@/components/cards-bridge/ads-client';

import {
  AD_INTRO_ODDS_PATH, AD_INTRO_TITLE, AD_PROVIDER_PATH, ATTR_NPA_UNKNOWN, ATTR_UNDER_AGE, adMinSeconds, adPersonalisation, adProviderOf, adsContext, cmpSrc, createRewardController, isKnownMinor,
  scriptAttributes,
} from './ads';

import type { AdsContext, RewardBreak, RewardState } from './ads';

const SRC = path.resolve(__dirname, '../..');
const REPO = path.resolve(SRC, '../../..');
const read = (rel: string): string => readFileSync(path.join(SRC, rel), 'utf8');
const ENV_ON = { NET_CARDS_ADS: '1', NEXT_PUBLIC_NET_CARDS_ADS: '1', NEXT_PUBLIC_ADSENSE_PUB_ID: 'ca-pub-1234567890123456' };
const ON: AdsContext = adsContext(ENV_ON, 'FR', 'hub');

function files(dir: string, keep: (f: string) => boolean): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? files(p, keep) : keep(p) ? [p] : [];
  });
}
const isSource = (f: string): boolean => /\.(ts|tsx|css)$/.test(f) && !/\.test\.tsx?$/.test(f);

function setup(opts: { ticket?: string | null } = {}) {
  let brk: RewardBreak | null = null;
  const states: RewardState[] = [];
  const grant = vi.fn(async () => undefined);
  const ticket = vi.fn(async () => (opts.ticket === undefined ? 't1' : opts.ticket));
  const adBreak = vi.fn((o: RewardBreak) => { brk = o; });
  const c = createRewardController({ adBreak, ticket, grant, onState: (s) => states.push(s) });
  return { c, get brk() { return brk!; }, states, grant, ticket, adBreak };
}

describe('R1 only the official rewarded formats: never a reward for a normal ad or a click', () => {
  it('the only ad request the controller makes is type reward', () => {
    const s = setup();
    s.c.probe();
    expect(s.adBreak).toHaveBeenCalledTimes(1);
    expect(s.adBreak.mock.calls[0]![0].type).toBe('reward');
    expect(new Set(read('lib/cards/ads.ts').match(/type: '[a-z]+'/g))).toEqual(new Set(["type: 'reward'"]));
  });
  it('every Google event but adViewed grants nothing: offered, dismissed, done with any status, even a status that says viewed', async () => {
    const s = setup();
    s.c.probe();
    s.brk.beforeReward(vi.fn());
    s.c.agree();
    await s.c.click();
    s.brk.adDismissed();
    for (const breakStatus of ['viewed', 'dismissed', 'noAdPreloaded', 'timeout', 'error', 'frequencyCapped', 'ignored', 'other', 'notReady', 'invalid']) s.brk.adBreakDone({ breakStatus });
    expect(s.grant).not.toHaveBeenCalled();
  });
  it('the display banner and the consent code never reach the ticket or claim routes: no reward for a normal ad or a click', () => {
    const src = read('components/cards-bridge/ads-client.tsx');
    const banner = src.slice(src.indexOf('export function BinderBanner'));
    expect(banner).not.toMatch(/api\/cards\/ad|grant|claim|ticket/);
    expect(src.match(/post\('\/api\/cards\/ad\/[a-z]+'/g)).toEqual(["post('/api/cards/ad/ticket'", "post('/api/cards/ad/claim'"]);
    expect(src).not.toMatch(/adClicked|adClick\b/i);
  });
  it('the claim is reached from adViewed only', () => {
    const src = read('lib/cards/ads.ts');
    expect(src.match(/d\.grant\(/g)).toHaveLength(1);
    expect(src.slice(src.indexOf('adViewed: () => {'), src.indexOf('adDismissed: () => {'))).toContain('d.grant(');
  });
});

describe('R2 the player chooses to watch: a screen before each ad says "Watch an ad, get 1 pack" with a link to the odds', () => {
  it('the screen says it and links to the odds page, which exists', () => {
    expect(AD_INTRO_TITLE).toBe('Watch an ad, get 1 pack');
    expect(AD_INTRO_ODDS_PATH).toBe('/kpopcards/odds');
    expect(existsSync(path.join(SRC, 'app/sites/[site]/(hub)/kpopcards/odds/page.tsx'))).toBe(true);
    const html = renderToStaticMarkup(createElement(AdIntro, { onWatch: () => undefined, onClose: () => undefined }));
    expect(html).toContain('Watch an ad, get 1 pack');
    expect(html).toMatch(/href="[^"]*\/kpopcards\/odds"/);
    expect(html).toContain('role="dialog"');
    expect(html).toContain('Not now');
  });
  it('the ad button opens that screen; only the screen\'s own Watch button starts an ad, and the answer "Not now" starts none', () => {
    const src = read('components/cards-bridge/ads-client.tsx');
    expect(src).toContain('onClick={open}');
    expect(src).toContain('onClick={onWatch}');
    expect(src).toContain('onClick={onClose}');
    expect(src).toContain('onClose={() => setIntro(false)}');
    expect(src.match(/\.click\(\)/g)).toHaveLength(1);
    expect(src.slice(src.indexOf('const watch = useCallback'), src.indexOf('if (!ctx.enabled || state'))).toContain('ctl.current?.agree(); void ctl.current?.click()');
  });
  it('a click without the player\'s yes does nothing: no ticket, no ad; the yes is good for one ad only', async () => {
    const s = setup();
    s.c.probe();
    const show = vi.fn();
    s.brk.beforeReward(show);
    await s.c.click();
    expect(s.ticket).not.toHaveBeenCalled();
    expect(show).not.toHaveBeenCalled();
    s.c.agree();
    await s.c.click();
    expect(show).toHaveBeenCalledTimes(1);
    s.brk.adDismissed();
    s.brk.adBreakDone({ breakStatus: 'dismissed' });
    s.brk.beforeReward(show);
    await s.c.click();
    expect(show).toHaveBeenCalledTimes(1);
    expect(s.ticket).toHaveBeenCalledTimes(1);
  });
  it('the lobby says the same words and links to the odds from its tile', () => {
    const lobby = read('components/cards/lobby-view.tsx');
    expect(lobby).toContain('Watch an ad, get 1 pack');
    expect(lobby).not.toMatch(/Two ads open a pack/);
    const live = lobby.split('\n').find((l) => l.includes('<RewardedAdButton'))!;
    expect(live).not.toMatch(/shards/);
  });
});

describe('R3 never an automatic start', () => {
  it('probing and being offered an ad never shows it and never asks for a ticket', () => {
    const s = setup();
    s.c.probe();
    const show = vi.fn();
    s.brk.beforeReward(show);
    s.brk.adBreakDone({});
    expect(show).not.toHaveBeenCalled();
    expect(s.ticket).not.toHaveBeenCalled();
    expect(s.grant).not.toHaveBeenCalled();
    expect(s.states).toEqual(['ready']);
  });
  it('the components call no ad function on their own: the show function runs only inside click(), and the page never clicks the button on load', () => {
    const src = read('lib/cards/ads.ts');
    expect(src.match(/fn\(\)/g)).toHaveLength(1);
    expect(src.slice(src.indexOf('const click = async'))).toContain('fn()');
    const lobby = read('components/cards/lobby-view.tsx');
    // The packs page presses the ad button only from the player's own press of the main button, which opens the screen (R2), never from an effect.
    expect(lobby.match(/adBtn\.current\?\.click\(\)/g)).toHaveLength(1);
    expect(lobby).toMatch(/else if \(main\.kind === 'ad'\) adBtn\.current\?\.click\(\)/);
  });
});

describe('R4 packs and cards won by an ad cannot be traded or transferred: there is no trade, gift or transfer to block', () => {
  const API = path.join(SRC, 'app/api/cards');
  const WORDS = /trade|gift|transfer|swap|send|give|donat|exchange|offer/i;
  it('no route of /api/cards moves anything between players', () => {
    const dirs = files(API, (f) => /route\.ts$/.test(f)).map((f) => path.relative(API, f));
    expect(dirs.length).toBeGreaterThan(20);
    expect(dirs.filter((d) => WORDS.test(d))).toEqual([]);
  });
  it('no cards SQL function takes a second player or is named for a trade, gift or transfer', () => {
    const dir = path.join(REPO, 'docs/pending-migrations/cards');
    const sql = readdirSync(dir).filter((f) => /^\d{3}-.*\.sql$/.test(f) && !f.includes('rollback')).map((f) => readFileSync(path.join(dir, f), 'utf8')).join('\n');
    const names = [...sql.matchAll(/create (?:or replace )?function public\.([a-z_0-9]+)\(([^)]*)\)/gi)].map((m) => ({ name: m[1]!, args: m[2]! }));
    expect(names.length).toBeGreaterThan(40);
    expect(names.filter((f) => WORDS.test(f.name))).toEqual([]);
    // An argument that names a second player (a recipient, a target user, a sender) would be the start of a transfer.
    expect(names.filter((f) => /p_(to|from|target|recipient|receiver|sender|other)_?user|p_(to|from|recipient|receiver|sender)\b/i.test(f.args))).toEqual([]);
  });
  it('the friends feature (codes, wish lists, the ranking) writes no wallet, pack or card of anyone', () => {
    const sql = readFileSync(path.join(REPO, 'docs/pending-migrations/cards/112-social.sql'), 'utf8');
    for (const fn of ['cards_friend_code_new', 'cards_friend_redeem', 'cards_friend_remove', 'cards_friends']) {
      const start = sql.indexOf(`function public.${fn}(`);
      expect(start, fn).toBeGreaterThan(-1);
      const body = sql.slice(start, sql.indexOf('$f$;', sql.indexOf('as $f$', start) + 6));
      expect(body, fn).not.toMatch(/(update|delete from)\s+public\.cards_(wallets|owned|packs|ad_events|ad_tickets|crafts)/i);
      expect(body, fn).not.toMatch(/insert into\s+public\.cards_(owned|packs|ad_events|ad_tickets|crafts)/i);
      // The one write to a wallet is the caller's own empty wallet, created only when missing.
      for (const m of body.matchAll(/insert into public\.cards_wallets[^;]*;/gi)) expect(m[0], fn).toMatch(/values \(p_user,[^;]*on conflict \(user_id\) do nothing/);
    }
  });
  it('a craft and a recycle act on the caller\'s own wallet only (the routes take no user id from the body)', () => {
    for (const r of ['craft', 'recycle', 'open']) expect(read(`app/api/cards/${r}/route.ts`), r).not.toMatch(/body\.(user|userId|to|recipient|target)\b/);
  });
});

describe('R5 no incentive outside the game', () => {
  const SRC_FILES = files(SRC, isSource);
  it('no page, component or copy asks anyone to watch ads or click ads to support the site', () => {
    const hits = SRC_FILES.filter((f) => /(watch|view|click|see|open)\s+(the\s+|our\s+|some\s+)?ads?\b[^.\n]{0,40}\b(support|help)\b|\b(support|help)\s+(us|the site|the team|kpopquiz|bunnyverse)\b[^.\n]{0,40}\bads?\b/i.test(readFileSync(f, 'utf8')));
    expect(hits.map((f) => path.relative(SRC, f))).toEqual([]);
  });
  it('the rewarded ad is offered inside the cards game only: no other page or component reads the ad client or the ad routes', () => {
    const users = SRC_FILES.filter((f) => /components\/cards-bridge\/ads-client|api\/cards\/ad\/(ticket|claim|grant)/.test(readFileSync(f, 'utf8'))).map((f) => path.relative(SRC, f));
    for (const u of users) expect(u, u).toMatch(/^(components\/cards\/|components\/cards-bridge\/|lib\/cards\/|lib\/kpopcards\/|app\/api\/cards\/)/);
  });
});

describe('R6 one consent tool only: Google\'s (TCF)', () => {
  it('no other consent or cookie vendor is in the code', () => {
    const vendors = /cookiebot|onetrust|usercentrics|didomi|iubenda|quantcast|osano|termly|cookieyes|complianz|trustarc|axeptio|cookie-?script|klaro|tarteaucitron|sourcepoint|consentmanager/i;
    const hits = files(SRC, isSource).filter((f) => vendors.test(readFileSync(f, 'utf8')));
    expect(hits.map((f) => path.relative(SRC, f))).toEqual([]);
  });
  it('the only CMP address is Google\'s Funding Choices, and the TCF API is read in one component', () => {
    const ctx = adsContext(ENV_ON, 'FR', 'hub');
    expect(cmpSrc(ctx)).toBe('https://fundingchoicesmessages.google.com/i/pub-1234567890123456?ers=1');
    const users = files(SRC, isSource).filter((f) => /__tcfapi/.test(readFileSync(f, 'utf8'))).map((f) => path.relative(SRC, f));
    expect(users).toEqual(['components/cards-bridge/ads-client.tsx']);
  });
  it('the CMP loads in every country (Google decides who sees a message), and an ad waits for its answer in the consent regions', () => {
    expect(cmpSrc(adsContext(ENV_ON, 'JP', 'hub'))).not.toBeNull();
    expect(adsContext(ENV_ON, 'FR', 'hub').consentRequired).toBe(true);
    const src = read('components/cards-bridge/ads-client.tsx');
    expect(src.slice(src.indexOf('export function useAdConsent'), src.indexOf('function useAdScript'))).not.toMatch(/if \(!ctx\.consentRequired\) \{ setOk\(true\); return; \}/);
  });
});

describe('R7 personalised ads only with consent, otherwise non personalised', () => {
  const full = { gdprApplies: true, eventStatus: 'useractioncomplete', purpose: { consents: { '1': true, '3': true, '4': true } } };
  it('only the consent for purposes 1, 3 and 4 personalises; everything else does not, in any country', () => {
    expect(adPersonalisation(full)).toBe('personalised');
    for (const tc of [null, {}, { gdprApplies: false }, { ...full, eventStatus: 'cmpuishown' }, { ...full, purpose: { consents: { '1': true, '3': true } } }, { ...full, purpose: { consents: { '1': true, '3': false, '4': true } } }]) {
      expect(adPersonalisation(tc), JSON.stringify(tc)).toBe('non_personalised');
    }
  });
  it('the browser asks for non personalised ads unless that mode says personalised, and the tag says so when there is no signal at all', () => {
    const src = read('components/cards-bridge/ads-client.tsx');
    expect(src).toContain("requestNonPersonalizedAds = mode === 'personalised' ? 0 : 1");
    expect(scriptAttributes(ON)![ATTR_NPA_UNKNOWN]).toBe('true');
    expect(src).toContain('adPersonalisation(tc, { knownMinor: ctx.knownMinor })');
  });
});

describe('R8 a player the site KNOWS to be under 18 is tagged (no personalised ads); no blanket tagging', () => {
  it('a known minor is tagged under age on the tag and never personalised, even with every consent', () => {
    const minor = adsContext(ENV_ON, 'FR', 'hub', { knownMinor: true });
    expect(scriptAttributes(minor)![ATTR_UNDER_AGE]).toBe('1');
    expect(adPersonalisation({ gdprApplies: true, eventStatus: 'useractioncomplete', purpose: { consents: { '1': true, '3': true, '4': true } } }, { knownMinor: minor.knownMinor })).toBe('non_personalised');
  });
  it('an adult, an unknown age and every country carry no under age tag', () => {
    for (const c of ['FR', 'US', 'JP', null]) expect(ATTR_UNDER_AGE in scriptAttributes(adsContext(ENV_ON, c, 'hub'))!, String(c)).toBe(false);
  });
  it('isKnownMinor: under 18 in whole years only; an age the site does not hold is not a minor', () => {
    expect(isKnownMinor(17)).toBe(true);
    expect(isKnownMinor(0)).toBe(true);
    for (const a of [18, 19, 40, null, undefined, Number.NaN, -1, Infinity]) expect(isKnownMinor(a), String(a)).toBe(false);
  });
  it('the site holds no age of any player today: the profile has no birth, age or minor column and the ads context says no minor', async () => {
    const dir = path.join(REPO, 'supabase/migrations');
    const sql = readdirSync(dir).filter((f) => f.endsWith('.sql')).map((f) => readFileSync(path.join(dir, f), 'utf8')).join('\n');
    const blocks = [...sql.matchAll(/(?:create table (?:if not exists )?(?:public\.)?profiles\s*\(|alter table (?:if exists )?(?:public\.)?profiles\b)[^;]*;/gi)].map((m) => m[0]);
    expect(blocks.length).toBeGreaterThan(0);
    expect(blocks.filter((b) => /\b(birth|birthdate|birth_date|date_of_birth|dob|age|age_range|age_band|is_minor|minor|over_?18|under_?18)\b/i.test(b))).toEqual([]);
    vi.resetModules();
    vi.doMock('next/headers', () => ({ headers: async () => new Headers({ 'x-vercel-ip-country': 'FR' }) }));
    vi.stubEnv('NET_CARDS_ADS', '1');
    vi.stubEnv('NEXT_PUBLIC_NET_CARDS_ADS', '1');
    vi.stubEnv('NEXT_PUBLIC_SITE_ID', 'hub');
    vi.stubEnv('SITE_ID', '');
    vi.stubEnv('NEXT_PUBLIC_ADSENSE_PUB_ID', 'ca-pub-1234567890123456');
    const { readAdsContext } = await import('./ads-server');
    const c = await readAdsContext();
    expect(c.enabled).toBe(true);
    expect(c.knownMinor).toBe(false);
    vi.unstubAllEnvs();
    vi.doUnmock('next/headers');
  });
});

describe('R9 the flags off give nothing: no script, no CMP, no tag, no button, no banner', () => {
  const offs: Array<[string, Parameters<typeof adsContext>[0]]> = [
    ['no flags', {}],
    ['NET_CARDS_ADS only', { NET_CARDS_ADS: '1', NEXT_PUBLIC_ADSENSE_PUB_ID: 'ca-pub-1234567890123456' }],
    ['NEXT_PUBLIC_NET_CARDS_ADS only', { NEXT_PUBLIC_NET_CARDS_ADS: '1', NEXT_PUBLIC_ADSENSE_PUB_ID: 'ca-pub-1234567890123456' }],
    ['both flags, no publisher id', { NET_CARDS_ADS: '1', NEXT_PUBLIC_NET_CARDS_ADS: '1' }],
    ['both flags, a malformed publisher id', { NET_CARDS_ADS: '1', NEXT_PUBLIC_NET_CARDS_ADS: '1', NEXT_PUBLIC_ADSENSE_PUB_ID: 'pub-1234567890123456' }],
    ['the publisher id alone (the verification variable never turns ads on)', { NEXT_PUBLIC_ADSENSE_PUB_ID: 'ca-pub-1234567890123456' }],
  ];
  it.each(offs)('%s: disabled, no script attributes, no CMP address, nothing rendered', (_n, env) => {
    const c = adsContext(env, 'FR', 'hub');
    expect(c.enabled).toBe(false);
    expect(scriptAttributes(c)).toBeNull();
    expect(cmpSrc(c)).toBeNull();
    expect(renderToStaticMarkup(createElement(RewardedAdButton, { ctx: c, onGranted: () => undefined }))).toBe('');
    expect(renderToStaticMarkup(createElement(BinderBanner, { ctx: c }))).toBe('');
  });
  it('kpopquiz.org and the anime build never get an ad, flags on or not', () => {
    expect(adsContext(ENV_ON, 'FR', 'kpop').enabled).toBe(false);
    expect(adsContext(ENV_ON, 'FR', 'anime').enabled).toBe(false);
  });
  it('no layout, page or head loads the ad script or the CMP by itself: only lib/cards/ads.ts holds their addresses (ads-client.tsx writes the tag from them)', () => {
    const hits = files(SRC, (f) => /\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f)).filter((f) => /googlesyndication|fundingchoices|adsbygoogle\.js/.test(readFileSync(f, 'utf8'))).map((f) => path.relative(SRC, f));
    expect(hits).toEqual(['lib/cards/ads.ts']);
  });
});

describe('R10 the provider is interchangeable behind one interface', () => {
  it('AdSense uses the web claim; AppLixir, later, uses the signed callback (SSV route, off); anything else is AdSense', () => {
    expect(AD_PROVIDER_PATH).toEqual({ adsense: 'claim', applixir: 'ssv' });
    expect(adProviderOf(undefined)).toBe('adsense');
    expect(adProviderOf('adsense')).toBe('adsense');
    expect(adProviderOf('applixir')).toBe('applixir');
    expect(adProviderOf('whatever')).toBe('adsense');
  });
  it('the minimum seconds before a claim: default 15, from 5 to 120, a bad value is the default', () => {
    expect(adMinSeconds(undefined)).toBe(15);
    expect(adMinSeconds('30')).toBe(30);
    expect(adMinSeconds('1')).toBe(5);
    expect(adMinSeconds('500')).toBe(120);
    for (const bad of ['', 'x', '-5', '1.5', '1000']) expect(adMinSeconds(bad), bad).toBe(15);
  });
  it('the signed callback path of LAUNCH-PREP is still there and stays off by its own flag', () => {
    expect(statSync(path.join(SRC, 'app/api/cards/ad/ssv/route.ts')).isFile()).toBe(true);
    expect(read('app/api/cards/ad/ssv/route.ts')).toContain('adPacksOn(env())');
  });
});
