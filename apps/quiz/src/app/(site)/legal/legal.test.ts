import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { COPY } from '@/copy/hub/h1';
import { isKnownRouteWith } from '@/lib/route-allowlist';
import { LEGAL_KEYS, LEGAL_PLACEHOLDER_KEYS } from '@/lib/site/hub/network-page';
import { REGISTRY } from '@/lib/site/registry';
import { SITE_IDS } from '@/lib/site/types';

import type { Metadata } from 'next';

// Lot (d), H1 (owner, 2026-10-24, brief H1-legal.md): the legal notice of the three sites. One route, the kpop one, is the source; the
// OtakuQuiz and FanQuiz page re-exports it. One copy file (legal.* keys of copy/hub/h1.ts); the publisher is Louis Pecchia, entrepreneur
// individuel (owner, 2026-10-25) and his phone is given (owner, 2026-10-25): the real copy holds no placeholder. The launch gate stays, and
// the tests that need a [BRACKETED] line printed mock 'legal.phone' as '[TELEPHONE]' (render option `placeholder`); a build with NET_INDEXING on
// refuses to print it.
// Fusion A5 (owner, 2026-10-27: main wins for kpop): kpopquiz.org now serves main's page (lib/legal-notice.ts, static metadata, /legal always
// a known route); OtakuQuiz and FanQuiz serve the copy-key page through the twin, which exports networkLegalMetadata. The kpop cases below
// check main's page, the anime and hub cases the network one.

const SRC = join(__dirname, '../../..');
const read = (rel: string): string => readFileSync(join(SRC, rel), 'utf8');
const DASHES = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);
const KEYS = Object.keys(COPY).filter((k) => k.startsWith('legal.')) as (keyof typeof COPY)[];
const PLACEHOLDERS = ['[TELEPHONE]'];
const PHONE = '+33 7 81 55 70 19';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); vi.doUnmock('@/copy/hub/h1'); vi.doUnmock('@/lib/legal-notice'); });

type Site = 'kpop' | 'anime' | 'hub';
interface Env { indexing?: '1' | ''; placeholder?: boolean }

/** Mocks the copy file so that 'legal.phone' is the [TELEPHONE] placeholder the real copy no longer holds (the module cache is reset first). */
async function mockPlaceholder(): Promise<void> {
  const real = await vi.importActual<typeof import('@/copy/hub/h1')>('@/copy/hub/h1');
  vi.doMock('@/copy/hub/h1', () => ({ COPY: { ...real.COPY, 'legal.phone': PLACEHOLDERS[0] } }));
}

/** The page of a build of `site`, rendered; `text` is the markup as plain text. */
async function render(site: Site, env: Env = {}) {
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.doUnmock('@/copy/hub/h1');
  if (site !== 'kpop') vi.stubEnv('NEXT_PUBLIC_SITE_ID', site);
  vi.stubEnv('NET_INDEXING', env.indexing ?? '');
  if (env.placeholder) await mockPlaceholder();
  const page = await import('./page');
  const twin = site === 'kpop' ? null : await import('@/app/sites/[site]/legal/page');
  const meta = (): Metadata => (twin ? twin.generateMetadata() : page.metadata);
  const html = renderToStaticMarkup(page.default());
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');
  return { page, meta, html, text };
}

describe('the keys and the one copy file', () => {
  it('LEGAL_KEYS lists every legal.* key of the copy file, and the page prints each of them', () => {
    expect([...LEGAL_KEYS].sort()).toEqual([...KEYS].sort());
    const page = read('app/(site)/legal/page.tsx');
    for (const k of KEYS) expect(page.includes(`'${k}'`), k).toBe(true);
  });

  it('keep the plain voice: no dash, no emoji, and the real copy holds no placeholder', () => {
    for (const k of KEYS) {
      expect(COPY[k], k).not.toMatch(DASHES);
      expect(COPY[k], k).not.toMatch(/\p{Extended_Pictographic}/u);
      expect(COPY[k], k).not.toMatch(/^\[[^\]]+\]$/);
    }
    expect(COPY['legal.phone']).toBe(PHONE);
  });

  it('write no site name or domain: they come from the registry', () => {
    const copy = KEYS.map((k) => COPY[k]).join('\n');
    for (const s of Object.values(REGISTRY)) {
      expect(copy.includes(s.brand.name), s.brand.name).toBe(false);
      expect(copy.includes(s.domain), s.domain).toBe(false);
    }
  });

  it('the page, the twin and the helpers hold no copy of their own: no placeholder is written in the copy file or anywhere else, the gate watches the key', () => {
    expect(KEYS.filter((k) => /^\[[^\]]+\]$/.test(COPY[k]))).toEqual([]);
    expect([...LEGAL_PLACEHOLDER_KEYS]).toEqual(['legal.phone']);
    for (const k of LEGAL_PLACEHOLDER_KEYS) expect(KEYS, k).toContain(k);
    const copyFile = read('copy/hub/h1.ts');
    for (const p of PLACEHOLDERS) {
      expect(copyFile.includes(`'${p}'`), `${p} in copy/hub/h1.ts`).toBe(false);
      for (const f of ['app/(site)/legal/page.tsx', 'app/sites/[site]/legal/page.tsx', 'lib/site/hub/legal.ts', 'lib/site/hub/network-page.ts']) {
        expect(read(f).includes(p), `${p} in ${f}`).toBe(false);
      }
    }
  });
});

/** Every file under src/ that is not a test. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.test\.tsx?$/.test(name) ? [] : [full];
  });
}

describe('the old publisher is gone', () => {
  it('no file of src/ outside the tests says Nuri, Rémusat or 75016, in copy, code or comments', () => {
    const hits = sourceFiles(SRC).filter((f) => /Nuri|Rémusat|Remusat|75016/i.test(readFileSync(f, 'utf8')));
    expect(hits).toEqual([]);
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
      expect(text).toContain(`${reg.brand.name} (${reg.domain}) is published by: Louis Pecchia, entrepreneur individuel (EI), 3560 chemin des Lauves, 13100 Aix-en-Provence, France`);
      expect(text).toContain('Legal form: Entrepreneur individuel (EI) SIREN 109 686 634, SIRET du siège 109 686 634 00014 TVA non applicable, article 293 B du CGI Phone: +33 7 81 55 70 19 Email:');
      expect(text).toContain('The publication director is: Louis Pecchia');
      expect(text).not.toMatch(/RCS|gmail/i);
      expect(text).toContain(`${reg.brand.name} is hosted by: Vercel Inc. 440 N Barranca Avenue #4133, Covina, CA 91723, United States Phone: +1 559 288 7060`);
      expect(text).toContain('article 6 of the LCEN');
      expect(text).not.toMatch(DASHES);
      for (const other of SITE_IDS.filter((id) => id !== site)) {
        expect(text.includes(REGISTRY[other].brand.name), `${site} page names ${other}`).toBe(false);
      }
    });

    it(`${site}: the page prints the phone once, with the publisher, and no placeholder`, async () => {
      const { text } = await render(site);
      expect(text.split(PHONE), PHONE).toHaveLength(2);
      expect(text).toContain(`Louis Pecchia, entrepreneur individuel (EI), 3560 chemin des Lauves, 13100 Aix-en-Provence, France Legal form: Entrepreneur individuel (EI) SIREN 109 686 634, SIRET du siège 109 686 634 00014 TVA non applicable, article 293 B du CGI Phone: ${PHONE}`);
      expect(text).not.toMatch(/\[[A-ZÉ ]+\]/);
    });

    if (site !== 'kpop') it(`${site}: with a placeholder mocked in, each placeholder is printed once`, async () => {
      const { text } = await render(site, { placeholder: true });
      for (const p of PLACEHOLDERS) expect(text.split(p), p).toHaveLength(2);
      expect(text).toContain('Phone: [TELEPHONE] Email:');
    });
  }

  it('the email and the privacy link: hello@kpopquiz.org and the network policy on OtakuQuiz and FanQuiz, the own ones on KpopQuiz', async () => {
    for (const site of ['anime', 'hub'] as const) {
      const { html, text } = await render(site);
      expect(text, site).toContain('Email: hello@kpopquiz.org');
      expect(html, site).toContain('href="mailto:hello@kpopquiz.org"');
      expect(html, site).toContain('href="https://fanquiz.org/privacy"');
      // the one network mailbox is on kpopquiz.org; no other kpop mention
      expect(html.replaceAll('hello@kpopquiz.org', '').includes('kpopquiz.org'), site).toBe(false);
    }
    const kpop = await render('kpop');
    expect(kpop.text).toContain('Email: hello@kpopquiz.org');
    expect(kpop.html).toContain('href="mailto:hello@kpopquiz.org"');
    expect(kpop.html).toContain('href="https://kpopquiz.org/privacy"');
    expect(kpop.html.includes('fanquiz.org')).toBe(false);
  });

  it('the twin of OtakuQuiz and FanQuiz re-exports the page of the kpop route, and its metadata is the network one', () => {
    const twin = read('app/sites/[site]/legal/page.tsx');
    expect(twin).toMatch(/export \{ default \} from '@\/app\/\(site\)\/legal\/page';/);
    expect(twin).toMatch(/return networkLegalMetadata\(\);/);
    expect(twin).not.toMatch(/<\w+/);
  });
});

describe('the metadata', () => {
  for (const site of ['kpop', 'anime', 'hub'] as const) {
    it(`${site}: title, a description of 120 to 160 characters, canonical /legal`, async () => {
      const { meta: m } = await render(site);
      const meta = m();
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

  it('closed (anime, hub): noindex, nofollow, and the build does not fail, with a placeholder printed or not', async () => {
    for (const site of ['anime', 'hub'] as const) {
      for (const placeholder of [true, false]) {
        const { meta } = await render(site, { indexing: '', placeholder });
        expect(meta().robots, `${site} placeholder ${placeholder}`).toEqual({ index: false, follow: false });
      }
    }
  });

  it('a placeholder still printed: kpop says noindex too, so nothing half written is indexed', async () => {
    // kpop reads main's lib/legal-notice.ts: its completeness check decides the robots line.
    vi.resetModules();
    const real = await vi.importActual<typeof import('@/lib/legal-notice')>('@/lib/legal-notice');
    vi.doMock('@/lib/legal-notice', () => ({ ...real, LEGAL: { ...real.LEGAL, phone: '[TELEPHONE]' }, legalIsComplete: () => false }));
    const page = await import('./page');
    expect(page.metadata.robots).toEqual({ index: false, follow: true });
    expect(renderToStaticMarkup(page.default())).toContain('Phone: [TELEPHONE]');
  });

  it('open with a placeholder printed: the build fails and the message names the keys', async () => {
    for (const site of ['anime', 'hub'] as const) {
      const { meta } = await render(site, { indexing: '1', placeholder: true });
      expect(() => meta(), site).toThrow(/NET_INDEXING is on[\s\S]*\[TELEPHONE\][\s\S]*legal\.phone/);
    }
  });

  it('the real copy, anime and hub open: no placeholder, indexable, the build does not fail, the phone is printed', async () => {
    for (const site of ['anime', 'hub'] as const) {
      const { meta, text } = await render(site, { indexing: '1' });
      expect(() => meta(), site).not.toThrow();
      expect(meta().robots).toEqual({ index: true, follow: true });
      expect(text).toContain(`Phone: ${PHONE}`);
      expect(text).toContain('The publication director is: Louis Pecchia');
      expect(text).not.toMatch(/\[[A-ZÉ ]+\]/);
    }
  });

  it('the real copy, kpop with the flag: no placeholder, indexable', async () => {
    const { meta } = await render('kpop', { indexing: '1' });
    expect(() => meta()).not.toThrow();
    expect(meta().robots).toEqual({ index: true, follow: true });
  });

  it('the real copy, kpop without the flag: indexable too (kpop is never closed by it)', async () => {
    const { meta } = await render('kpop');
    expect(meta().robots).toEqual({ index: true, follow: true });
  });
});

describe('the launch gate', () => {
  it('fails only when NET_INDEXING is on and a placeholder is left', async () => {
    vi.resetModules();
    await mockPlaceholder();
    const { legalLaunchGate, legalPlaceholders } = await import('@/lib/site/hub/legal');
    expect(legalPlaceholders()).toEqual(PLACEHOLDERS);
    expect(() => legalLaunchGate(false, PLACEHOLDERS)).not.toThrow();
    expect(() => legalLaunchGate(true, [])).not.toThrow();
    expect(() => legalLaunchGate(true, ['[TELEPHONE]'])).toThrow(/\[TELEPHONE\]/);
    expect(() => legalLaunchGate(true)).toThrow(/legal\.phone/);
  });

  it('the real copy leaves nothing for the gate: it never throws, open or closed', async () => {
    const { legalLaunchGate, legalPlaceholders } = await import('@/lib/site/hub/legal');
    expect(legalPlaceholders()).toEqual([]);
    expect(() => legalLaunchGate(true)).not.toThrow();
    expect(() => legalLaunchGate(false)).not.toThrow();
  });

  it('reads NET_INDEXING by default: 1 and true open it, anything else does not', async () => {
    for (const [v, throws] of [['1', true], ['true', true], ['0', false], ['', false], ['yes', false]] as const) {
      vi.resetModules();
      vi.doUnmock('@/copy/hub/h1');
      await mockPlaceholder();
      vi.stubEnv('NET_INDEXING', v);
      const { legalLaunchGate } = await import('@/lib/site/hub/legal');
      if (throws) expect(() => legalLaunchGate(), v).toThrow(); else expect(() => legalLaunchGate(), v).not.toThrow();
    }
  });

  // The test that keeps launch from going out with a placeholder: it fails on the build that has NET_INDEXING on and still prints one.
  it('the real copy prints no placeholder, whatever NET_INDEXING says', async () => {
    const { legalPlaceholders } = await import('@/lib/site/hub/legal');
    expect(legalPlaceholders(), 'fill legal.phone before launch').toEqual([]);
  });
});

describe('the routes', () => {
  it('OtakuQuiz and FanQuiz allow /legal; kpop knows it on every build, like /privacy (main lists it in KNOWN_ROUTES)', () => {
    expect(REGISTRY.anime.routes.allow).toContain('/legal');
    expect(REGISTRY.hub.routes.allow).toContain('/legal');
    const on = { v1: true, v12: true };
    expect(isKnownRouteWith('/legal', on)).toBe(true);
    expect(isKnownRouteWith('/legal', { v1: false, v12: false })).toBe(true);
    expect(isKnownRouteWith('/privacy', on)).toBe(true);
  });

  it('NEXT_PUBLIC_NET_PRIVACY no longer decides /legal on kpop: known whatever it says', async () => {
    for (const [v, known] of [['1', true], ['true', true], ['0', true], ['false', true], ['', true]] as const) {
      vi.resetModules();
      vi.stubEnv('NEXT_PUBLIC_NET_PRIVACY', v);
      const { isKnownRoute } = await import('@/lib/route-allowlist');
      expect(isKnownRoute('/legal'), v).toBe(known);
    }
  });
});
