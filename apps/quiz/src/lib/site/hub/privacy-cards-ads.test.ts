// Launch polish, lane LEGAL (owner, 2026-11-20): the privacy policy no longer says "no advertising" and has two sections more, KpopCards and
// Advertising. Each sentence of them is pinned here to the code or the SQL it describes (the numbers: lib/cards/privacy-facts.test.ts).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { COPY } from '@/copy/hub/h1';
import { PRIVACY_SECTIONS } from '@/lib/site/hub/network-page';

vi.mock('next/cache', () => ({ unstable_cache: <T extends (...a: never[]) => unknown>(fn: T) => fn }));
vi.mock('@/lib/supabase/server', () => ({ createPublicReadClient: () => ({}), createServiceRoleClient: () => ({}) }));

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

const SRC = join(__dirname, '../../..');
const read = (p: string): string => readFileSync(join(SRC, p), 'utf8');

async function page(site: 'hub' | 'anime' = 'hub'): Promise<{ text: string; h2: string[] }> {
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.stubEnv('NEXT_PUBLIC_SITE_ID', site);
  const mod = await import('@/app/sites/[site]/privacy/page');
  const html = renderToStaticMarkup(mod.default());
  const text = html.replace(/<[^>]+>/g, ' ').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');
  return { text, h2: [...html.matchAll(/<h2[^>]*>(.*?)<\/h2>/g)].map((m) => m[1]!) };
}

describe('the privacy policy and advertising', () => {
  it('no longer says there is no advertising, and has the KpopCards and Advertising sections', async () => {
    for (const site of ['hub', 'anime'] as const) {
      const { text, h2 } = await page(site);
      expect(text, site).not.toMatch(/no advertising|no ads|no advertising cookies/i);
      expect(h2, site).toContain('KpopCards');
      expect(h2, site).toContain('Advertising');
    }
    expect(PRIVACY_SECTIONS.map((s) => s.title)).toEqual(expect.arrayContaining(['privacy.cards.title', 'privacy.ads.title']));
  });

  it('the copy is the same on the hub and on the anime build', async () => {
    expect((await page('anime')).text).toBe((await page('hub')).text);
  });

  it('advertising: Google AdSense, the rewarded ad, the consent tool (TCF), personalised only with consent, under 18, cookies', async () => {
    const { text } = await page();
    for (const s of [
      'Google AdSense', 'rewarded ad', 'certified consent tool', 'Transparency and Consent Framework (TCF)',
      'Personalised ads are shown only with your consent', 'Without it, ads are not personalised',
      'never ask for personalised ads for a player we know to be under 18', 'cookies',
      'No ad request is marked as child directed for a whole country',
    ]) expect(text, s).toContain(s);
  });

  it('cards: wallet, friend codes, nicknames, push, the demo claim (device and IP hashes), the report form', async () => {
    const { text } = await page();
    for (const s of [
      'the packs you opened', 'your shards', 'Friend codes', 'works once', 'Your nickname', 'Notifications', 'push service',
      'salted hash of the device id', 'salted hash of your IP address', 'The report form needs no account', 'contact detail is erased when the report is closed',
    ]) expect(text, s).toContain(s);
  });

  it('every number is a placeholder filled from the code, none is typed', () => {
    const cards = Object.entries(COPY).filter(([k]) => k.startsWith('privacy.cards.') || k.startsWith('privacy.ads.'));
    for (const [k, v] of cards) expect(v, k).not.toMatch(/\b\d+ (?:hours|days|friends|browsers)\b/);
  });
});

describe('each claim is true of the code', () => {
  const ads = read('lib/cards/ads.ts');
  const client = read('components/cards-bridge/ads-client.tsx');

  it('AdSense and the certified consent tool through TCF: no ad request before the answer in the consent regions or when the country is unknown', () => {
    expect(ads).toContain('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js');
    expect(ads).toContain("https://fundingchoicesmessages.google.com/i/");
    expect(ads).toContain('country === null || CONSENT_COUNTRIES.includes(country)');
    for (const c of ['GB', 'CH', 'FR', 'IS', 'LI', 'NO']) expect(ads).toContain(`'${c}'`);
    expect(client).toContain('__tcfapi');
    expect(client).toContain("'addEventListener', 2");
  });

  it('a refusal means no ad request and no button', () => {
    expect(ads).toContain("if (!tc) return false;");
    expect(ads).toContain("tc.purpose?.consents?.['1'] === true");
    expect(client).toContain("if (!ctx.enabled || state === 'hidden') return null;");
  });

  // Owner, 2026-11-20 (lot LAUNCH-POLISH): no general teen tagging. No country is marked child directed; only a player the site knows to be under 18
  // is tagged under the age of consent (and the site holds no age today).
  it('no country is marked child directed; only a player known to be under 18 is tagged under the age of consent', () => {
    expect(ads).not.toContain("country === 'US'");
    expect(ads).not.toContain('ATTR_CHILD_DIRECTED');
    expect(ads).toContain("if (ctx.knownMinor) a[ATTR_UNDER_AGE] = '1';");
  });

  it('the site asks no age: nothing in the cards or the ads code reads an age or a birth date of the player', () => {
    // the code, not its comments (a comment may say that no birth date is held)
    const code = (src: string): string => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
    for (const src of [ads, client, read('lib/cards/ads-server.ts')]) expect(code(src)).not.toMatch(/birth|age_band|ageBand|is_minor|under18/i);
  });

  it('the demo claim stores hashes only, the report keeps its IP in memory only', () => {
    const demo = read('lib/cards/demo.ts');
    expect(demo).toContain('never stored in the clear');
    expect(read('lib/cards/report.ts')).toContain('the IP is never stored');
  });

  it('the device id and the pack of the demo are in local storage, the theme and the settings too', () => {
    const store = read('components/cards/demo-store.ts');
    expect(store).toContain("'bvc-demo-device-v1'");
    expect(read('lib/cards/kc-themes.ts')).toContain("'kpopcards-theme'");
    expect(read('lib/cards/opening-prefs.ts')).toContain("'kpopcards:prefs'");
  });
});
