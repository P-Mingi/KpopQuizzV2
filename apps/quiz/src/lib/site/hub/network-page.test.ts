import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { COPY } from '@/copy/hub/h1';
import { fillHub, ht } from '@/lib/site/hub/copy';
import { networkCards, networkSiteIds, SHARES_HIDES, SHARES_SEES } from '@/lib/site/hub/network-page';
import { NETWORK, REGISTRY, siteConfig } from '@/lib/site/registry';
import { SITE_IDS } from '@/lib/site/types';

// Lot (d), H1: the data of the network page. The sites, their words, their links and their accent come from the registry.

// Built from code points so this file holds neither dash.
const DASHES = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);
const SRC = fileURLToPath(new URL('../../../', import.meta.url));
const read = (rel: string): string => readFileSync(`${SRC}${rel}`, 'utf8');

describe('the sites list comes from the registry', () => {
  it('has one card per site other than the hub, in the network order', () => {
    expect(networkSiteIds()).toEqual(SITE_IDS.filter((id) => siteConfig(id).kind !== 'hub'));
    expect(networkSiteIds()).toEqual(['kpop', 'anime']);
    expect(networkCards({}).map((c) => c.id)).toEqual(['kpop', 'anime']);
    expect(networkCards({}).map((c) => c.name)).toEqual(networkSiteIds().map((id) => REGISTRY[id].brand.name));
  });

  it('opens the registry origin of each site', () => {
    for (const c of networkCards({})) expect(c.origin).toBe(REGISTRY[c.id].url);
    for (const c of networkCards({ VERCEL_ENV: 'production', NEXT_PUBLIC_NET_ORIGINS: 'kpop=http://kpop.localhost:3000' })) {
      expect(c.origin).toBe(REGISTRY[c.id].url);
    }
  });

  it('follows the dev origins outside production (flags-env.md "Origins")', () => {
    const cards = networkCards({ NEXT_PUBLIC_NET_ORIGINS: 'kpop=http://kpop.localhost:3000,anime=http://anime.localhost:3001' });
    expect(cards.map((c) => c.origin)).toEqual(['http://kpop.localhost:3000', 'http://anime.localhost:3001']);
  });

  it('writes the pitch from the vocabulary of the site, and the accent from its theme', () => {
    for (const c of networkCards({})) {
      const s = REGISTRY[c.id];
      expect(c.pitch).toContain(s.vocabulary.topicPlural);
      expect(c.pitch).toContain(s.vocabulary.memberPlural);
      expect(c.pitch).not.toMatch(/[{}]/);
      expect(c.accentLight).toBe(s.theme.light.pink ?? null);
      expect(c.accentDark).toBe(s.theme.dark.pink ?? s.theme.light.pink ?? null);
    }
    expect(networkCards({})[0]!.pitch).not.toBe(networkCards({})[1]!.pitch);
  });

  it('writes no site origin, domain or network name in the page code or the copy', () => {
    const files = [
      'app/sites/[site]/home-hub.tsx',
      'copy/hub/h1.ts',
      'lib/site/hub/copy.ts',
      'lib/site/hub/network-page.ts',
      'lib/site/hub/passport-summary.ts',
      ...readdirSync(`${SRC}components/hub`).filter((f) => f.endsWith('.tsx') && !f.endsWith('.test.tsx')).map((f) => `components/hub/${f}`),
      // lot H2a: the blocks of the new home and their loaders
      ...readdirSync(`${SRC}components/hub/home`).filter((f) => /\.tsx?$/.test(f) && !f.endsWith('.test.ts')).map((f) => `components/hub/home/${f}`),
      ...readdirSync(`${SRC}lib/site/hub`).filter((f) => /^home-.*\.ts$/.test(f) && !f.endsWith('.test.ts')).map((f) => `lib/site/hub/${f}`),
    ];
    const words = [
      ...Object.values(REGISTRY).flatMap((s) => [s.url, s.domain, s.brand.name, s.brand.name.toLowerCase()]),
      NETWORK.url, NETWORK.name, NETWORK.name.toLowerCase(),
    ];
    for (const f of files) {
      const text = read(f).replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
      expect(text, f).not.toMatch(/https?:\/\//);
      for (const w of words) expect(text.includes(w), `${f} writes "${w}"`).toBe(false);
    }
  });
});

describe('the copy of the page', () => {
  it('fills every placeholder from the registry or from the card', () => {
    // lot H2a: the keys of the new home take more placeholders (a time, a number of songs, a title): any name is filled here
    const vars = new Proxy({ name: 'X', topicPlural: 'tp', memberPlural: 'mp', level: 3 } as Record<string, string | number>, { get: (t, k: string) => t[k] ?? 'x' });
    for (const key of Object.keys(COPY) as (keyof typeof COPY)[]) expect(ht(key, vars), key).not.toMatch(/[{}]/);
    expect(fillHub('{network} / {brand} / {domain} / {nope}')).toBe(`${NETWORK.name} / ${REGISTRY.hub.brand.name} / ${REGISTRY.hub.domain} / {nope}`);
  });

  it('keeps every title, line and key in the plain voice (no dash, no emoji)', () => {
    for (const [k, v] of Object.entries(COPY)) {
      expect(v, k).not.toMatch(DASHES);
      expect(v, k).not.toMatch(/\p{Extended_Pictographic}/u);
      // The new home (hp.*, lot H2a) names K-pop and anime in its words, as the owner's design does; the other keys stay neutral.
      if (!k.startsWith('hp.')) expect(v, k).not.toMatch(/\bk-?pop\b/i);
    }
  });

  it('uses every key it has, in the code of the page', () => {
    const files = [
      'app/sites/[site]/home-hub.tsx', 'lib/site/hub/network-page.ts', 'components/hub/hub-shares.tsx',
      ...readdirSync(`${SRC}components/hub/home`).filter((f) => /\.tsx?$/.test(f) && !f.endsWith('.test.ts')).map((f) => `components/hub/home/${f}`),
    ];
    const code = files.map(read).join('\n');
    for (const key of Object.keys(COPY)) expect(code.includes(`'${key}'`), key).toBe(true);
  });

  it('lists the shares: what other sites see and what they do not', () => {
    expect([...SHARES_SEES, ...SHARES_HIDES].every((k) => k in COPY)).toBe(true);
    expect(ht('shares.seesLevel')).toMatch(/public/);
    expect(SHARES_HIDES.map((k) => ht(k)).join(' ').toLowerCase()).toMatch(/email[\s\S]*sign in[\s\S]*history/);
  });
});
