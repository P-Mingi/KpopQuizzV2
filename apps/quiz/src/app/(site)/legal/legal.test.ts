import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { COPY } from '@/copy/hub/h1';
import { isKnownRouteWith } from '@/lib/route-allowlist';
import { LEGAL_KEYS, LEGAL_PLACEHOLDER_KEYS } from '@/lib/site/hub/network-page';
import { REGISTRY } from '@/lib/site/registry';
import { SITE_IDS } from '@/lib/site/types';

// Lot (d), H1 (owner, 2026-10-24, brief H1-legal.md): the legal notice of the three sites. One route, the kpop one, is the source; the
// OtakuQuiz and FanQuiz page re-exports it. One copy file (legal.* keys of copy/hub/h1.ts), the facts the owner still has to give are
// three [BRACKETED] lines written once each, and a build with NET_INDEXING on refuses to print one.

const SRC = join(__dirname, '../../..');
const read = (rel: string): string => readFileSync(join(SRC, rel), 'utf8');
const DASHES = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);
const KEYS = Object.keys(COPY).filter((k) => k.startsWith('legal.')) as (keyof typeof COPY)[];
const PLACEHOLDERS = ['[FORME JURIDIQUE]', '[SIREN]', '[DIRECTEUR DE LA PUBLICATION]'];

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); vi.doUnmock('@/copy/hub/h1'); });

type Site = 'kpop' | 'anime' | 'hub';
interface Env { indexing?: '1' | ''; filled?: boolean }

/** The page of a build of `site`, rendered; `text` is the markup as plain text. */
async function render(site: Site, env: Env = {}) {
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.doUnmock('@/copy/hub/h1');
  if (site !== 'kpop') vi.stubEnv('NEXT_PUBLIC_SITE_ID', site);
  vi.stubEnv('NET_INDEXING', env.indexing ?? '');
  if (env.filled) {
    const real = await vi.importActual<typeof import('@/copy/hub/h1')>('@/copy/hub/h1');
    vi.doMock('@/copy/hub/h1', () => ({ COPY: { ...real.COPY, 'legal.form': 'SAS', 'legal.siren': '123 456 789', 'legal.director': 'Nuri' } }));
  }
  const page = await import('./page');
  const html = renderToStaticMarkup(page.default());
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');
  return { page, html, text };
}

describe('the keys and the one copy file', () => {
  it('LEGAL_KEYS lists every legal.* key of the copy file, and the page prints each of them', () => {
    expect([...LEGAL_KEYS].sort()).toEqual([...KEYS].sort());
    const page = read('app/(site)/legal/page.tsx');
    for (const k of KEYS) expect(page.includes(`'${k}'`), k).toBe(true);
  });

  it('keep the plain voice: no dash, no emoji, every placeholder filled', () => {
    for (const k of KEYS) {
      expect(COPY[k], k).not.toMatch(DASHES);
      expect(COPY[k], k).not.toMatch(/\p{Extended_Pictographic}/u);
    }
  });

  it('write no site name or domain: they come from the registry', () => {
    const copy = KEYS.map((k) => COPY[k]).join('\n');
    for (const s of Object.values(REGISTRY)) {
      expect(copy.includes(s.brand.name), s.brand.name).toBe(false);
      expect(copy.includes(s.domain), s.domain).toBe(false);
    }
  });

  it('the page, the twin and the helpers hold no copy of their own: the placeholders are written once each, in the copy file', () => {
    expect(KEYS.filter((k) => /^\[[^\]]+\]$/.test(COPY[k])).sort()).toEqual([...LEGAL_PLACEHOLDER_KEYS].sort());
    expect(LEGAL_PLACEHOLDER_KEYS.map((k) => COPY[k])).toEqual(PLACEHOLDERS);
    const copyFile = read('copy/hub/h1.ts');
    for (const p of PLACEHOLDERS) {
      expect(copyFile.split(`'${p}'`), p).toHaveLength(2);
      for (const f of ['app/(site)/legal/page.tsx', 'app/sites/[site]/legal/page.tsx', 'lib/site/hub/legal.ts', 'lib/site/hub/network-page.ts']) {
        expect(read(f).includes(p), `${p} in ${f}`).toBe(false);
      }
    }
  });
});

describe('the page, on each site', () => {
  for (const site of ['kpop', 'anime', 'hub'] as const) {
    const reg = REGISTRY[site];

    it(`${site}: title, sub-title, publisher, host, personal data; one h1; site name and domain from the registry`, async () => {
      const { html, text } = await render(site);
      expect(html.match(/<h1\b/g)).toHaveLength(1);
      expect(html).toContain('<h1 class="text-2xl font-medium mb-2">Legal notice</h1>');
      expect(html).toContain('<p lang="fr" class="text-sm text-secondary mb-8">Mentions légales</p>');
      expect(text).toContain(`${reg.brand.name} (${reg.domain}) is published by: Nuri, 6 rue Rémusat, 75016 Paris, France`);
      expect(text).toContain('Legal form: [FORME JURIDIQUE]');
      expect(text).toContain('SIREN: [SIREN]');
      expect(text).toContain('The publication director is: [DIRECTEUR DE LA PUBLICATION]');
      expect(text).toContain(`${reg.brand.name} is hosted by: Vercel Inc. 440 N Barranca Avenue #4133, Covina, CA 91723, United States Phone: +1 559 288 7060`);
      expect(text).toContain('article 6 of the LCEN');
      expect(text).not.toMatch(DASHES);
      for (const other of SITE_IDS.filter((id) => id !== site)) {
        expect(text.includes(REGISTRY[other].brand.name), `${site} page names ${other}`).toBe(false);
      }
    });

    it(`${site}: each placeholder is printed once`, async () => {
      const { text } = await render(site);
      for (const p of PLACEHOLDERS) expect(text.split(p), p).toHaveLength(2);
    });
  }

  it('the email and the privacy link: contact@fanquiz.org and the network policy on OtakuQuiz and FanQuiz, the own ones on KpopQuiz', async () => {
    for (const site of ['anime', 'hub'] as const) {
      const { html, text } = await render(site);
      expect(text, site).toContain('Email: contact@fanquiz.org');
      expect(html, site).toContain('href="mailto:contact@fanquiz.org"');
      expect(html, site).toContain('href="https://fanquiz.org/privacy"');
      expect(html.includes('kpopquiz.org'), site).toBe(false);
    }
    const kpop = await render('kpop');
    expect(kpop.text).toContain('Email: contact@kpopquiz.org');
    expect(kpop.html).toContain('href="mailto:contact@kpopquiz.org"');
    expect(kpop.html).toContain('href="https://kpopquiz.org/privacy"');
    expect(kpop.html.includes('fanquiz.org')).toBe(false);
  });

  it('the twin of OtakuQuiz and FanQuiz re-exports the page of the kpop route', () => {
    const twin = read('app/sites/[site]/legal/page.tsx');
    expect(twin).toMatch(/export \{ default, generateMetadata \} from '@\/app\/\(site\)\/legal\/page';/);
    expect(twin).not.toMatch(/<\w+/);
  });
});

describe('the metadata', () => {
  for (const site of ['kpop', 'anime', 'hub'] as const) {
    it(`${site}: title, a description of 120 to 160 characters, canonical /legal`, async () => {
      const { page } = await render(site);
      const meta = page.generateMetadata();
      expect(meta.title).toBe('Legal notice');
      expect(String(meta.title).length + ` | ${REGISTRY[site].brand.name}`.length).toBeLessThanOrEqual(60);
      const d = String(meta.description);
      expect(d.length).toBeGreaterThanOrEqual(120);
      expect(d.length).toBeLessThanOrEqual(160);
      expect(d).toContain(REGISTRY[site].brand.name);
      expect(d).toContain(REGISTRY[site].domain);
      expect(d).not.toMatch(/[{}]/);
      expect(meta.alternates?.canonical).toBe('/legal');
    });
  }

  it('closed (anime, hub): noindex, nofollow, and the build does not fail while a placeholder is printed', async () => {
    for (const site of ['anime', 'hub'] as const) {
      const { page } = await render(site, { indexing: '' });
      expect(page.generateMetadata().robots).toEqual({ index: false, follow: false });
    }
  });

  it('a placeholder still printed: kpop says noindex too, so nothing half written is indexed', async () => {
    const { page } = await render('kpop');
    expect(page.generateMetadata().robots).toEqual({ index: false, follow: true });
  });

  it('open with a placeholder printed: the build fails and the message names the keys', async () => {
    for (const site of ['anime', 'hub'] as const) {
      const { page } = await render(site, { indexing: '1' });
      expect(() => page.generateMetadata(), site).toThrow(/NET_INDEXING is on[\s\S]*\[FORME JURIDIQUE\], \[SIREN\], \[DIRECTEUR DE LA PUBLICATION\][\s\S]*legal\.form, legal\.siren, legal\.director/);
    }
  });

  it('open with the three facts filled: indexable, nothing in brackets is printed', async () => {
    for (const site of ['anime', 'hub'] as const) {
      const { page, text } = await render(site, { indexing: '1', filled: true });
      expect(page.generateMetadata().robots).toEqual({ index: true, follow: true });
      expect(text).toContain('Legal form: SAS');
      expect(text).toContain('SIREN: 123 456 789');
      expect(text).toContain('The publication director is: Nuri');
      expect(text).not.toMatch(/\[[A-ZÉ ]+\]/);
    }
  });

  it('kpop with the three facts filled: indexable', async () => {
    const { page } = await render('kpop', { filled: true });
    expect(page.generateMetadata().robots).toEqual({ index: true, follow: true });
  });
});

describe('the launch gate', () => {
  it('fails only when NET_INDEXING is on and a placeholder is left', async () => {
    const { legalLaunchGate, legalPlaceholders } = await import('@/lib/site/hub/legal');
    expect(legalPlaceholders()).toEqual(PLACEHOLDERS);
    expect(() => legalLaunchGate(false, PLACEHOLDERS)).not.toThrow();
    expect(() => legalLaunchGate(true, [])).not.toThrow();
    expect(() => legalLaunchGate(true, ['[SIREN]'])).toThrow(/\[SIREN\]/);
    expect(() => legalLaunchGate(true)).toThrow(/legal\.form/);
  });

  it('reads NET_INDEXING by default: 1 and true open it, anything else does not', async () => {
    for (const [v, throws] of [['1', true], ['true', true], ['0', false], ['', false], ['yes', false]] as const) {
      vi.resetModules();
      vi.stubEnv('NET_INDEXING', v);
      const { legalLaunchGate } = await import('@/lib/site/hub/legal');
      if (throws) expect(() => legalLaunchGate(), v).toThrow(); else expect(() => legalLaunchGate(), v).not.toThrow();
    }
  });

  // The test that keeps launch from going out with a placeholder: it fails on the build that has NET_INDEXING on and still prints one.
  it('the real copy prints no placeholder when this build has NET_INDEXING on', async () => {
    const { flagOn } = await import('@/lib/site/registry');
    const { legalPlaceholders } = await import('@/lib/site/hub/legal');
    if (flagOn(process.env.NET_INDEXING)) expect(legalPlaceholders(), 'fill legal.form, legal.siren and legal.director before launch').toEqual([]);
  });
});

describe('the routes', () => {
  it('OtakuQuiz and FanQuiz allow /legal; kpop answers it only with NEXT_PUBLIC_NET_PRIVACY on', () => {
    expect(REGISTRY.anime.routes.allow).toContain('/legal');
    expect(REGISTRY.hub.routes.allow).toContain('/legal');
    const on = { v1: true, v12: true };
    expect(isKnownRouteWith('/legal', on)).toBe(false);
    expect(isKnownRouteWith('/legal', { ...on, netPrivacy: false })).toBe(false);
    expect(isKnownRouteWith('/legal', { ...on, netPrivacy: true })).toBe(true);
    expect(isKnownRouteWith('/legal', { v1: false, v12: false, netPrivacy: true })).toBe(true);
    expect(isKnownRouteWith('/legal/x', { ...on, netPrivacy: true })).toBe(false);
    expect(isKnownRouteWith('/privacy', on)).toBe(true);
  });

  it('the flag is read like every flag: 1 and true', async () => {
    for (const [v, known] of [['1', true], ['true', true], ['0', false], ['false', false], ['', false]] as const) {
      vi.resetModules();
      vi.stubEnv('NEXT_PUBLIC_NET_PRIVACY', v);
      const { isKnownRoute } = await import('@/lib/route-allowlist');
      expect(isKnownRoute('/legal'), v).toBe(known);
    }
  });
});
