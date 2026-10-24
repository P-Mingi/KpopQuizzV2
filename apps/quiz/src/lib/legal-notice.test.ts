import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { isKnownRoute } from '@/lib/route-allowlist';

import { LEGAL, legalIsComplete, legalPlaceholders } from './legal-notice';

// The legal notice (mentions légales) of kpopquiz.org: publisher, publication director, host, personal data.

const SRC = join(__dirname, '..');
const DASHES = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);

describe('the facts', () => {
  it('names the publisher, the host and the mailbox of the brief', () => {
    expect(LEGAL.publisher).toBe('Nuri, 6 rue Rémusat, 75016 Paris, France');
    expect(LEGAL.email).toBe('contact@kpopquiz.org');
    expect(LEGAL.privacyUrl).toBe('https://kpopquiz.org/privacy');
    expect(LEGAL.host).toEqual({ name: 'Vercel Inc.', address: '440 N Barranca Avenue #4133, Covina, CA 91723, United States', phone: '+1 559 288 7060' });
  });

  it('keeps the three facts the owner has not given as placeholders, each written once, in this file only', () => {
    expect([LEGAL.form, LEGAL.siren, LEGAL.director]).toEqual(['[FORME JURIDIQUE]', '[SIREN]', '[DIRECTEUR DE LA PUBLICATION]']);
    expect(legalPlaceholders()).toEqual(['[FORME JURIDIQUE]', '[SIREN]', '[DIRECTEUR DE LA PUBLICATION]']);
    expect(legalIsComplete()).toBe(false);
    const lib = readFileSync(join(SRC, 'lib/legal-notice.ts'), 'utf8');
    const page = readFileSync(join(SRC, 'app/(site)/legal/page.tsx'), 'utf8');
    for (const p of legalPlaceholders()) {
      expect(lib.split(`'${p}'`), p).toHaveLength(2);
      expect(page.includes(p), p).toBe(false);
    }
  });

  it('uses the plain voice: no dash, no emoji', () => {
    for (const v of [LEGAL.description, LEGAL.lede, LEGAL.title, LEGAL.sub, LEGAL.publisher, LEGAL.host.address, LEGAL.host.phone]) {
      expect(v).not.toMatch(DASHES);
      expect(v).not.toMatch(/\p{Extended_Pictographic}/u);
    }
  });

  it('has a description of 120 to 160 characters and a title that fits with the suffix', () => {
    expect(LEGAL.description.length).toBeGreaterThanOrEqual(120);
    expect(LEGAL.description.length).toBeLessThanOrEqual(160);
    expect(`${LEGAL.title} | KpopQuiz`.length).toBeLessThanOrEqual(60);
  });
});

describe('the page', () => {
  it('renders one h1, the French sub-title, the publisher, the host and the privacy link', async () => {
    const { default: Page, metadata } = await import('@/app/(site)/legal/page');
    const html = renderToStaticMarkup(Page());
    const text = html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/\s+/g, ' ');
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).toContain('>Legal notice</h1>');
    expect(html).toContain('<p lang="fr" class="text-sm text-secondary mb-8">Mentions légales</p>');
    expect(text).toContain('KpopQuiz (kpopquiz.org) is published by: Nuri, 6 rue Rémusat, 75016 Paris, France');
    expect(text).toContain('Legal form: [FORME JURIDIQUE]');
    expect(text).toContain('SIREN: [SIREN]');
    expect(text).toContain('The publication director is: [DIRECTEUR DE LA PUBLICATION]');
    expect(text).toContain('KpopQuiz is hosted by: Vercel Inc. 440 N Barranca Avenue #4133, Covina, CA 91723, United States Phone: +1 559 288 7060');
    expect(html).toContain('href="mailto:contact@kpopquiz.org"');
    expect(html).toContain('href="https://kpopquiz.org/privacy"');
    expect(text).not.toMatch(DASHES);
    expect(metadata.title).toBe('Legal notice');
    expect(metadata.alternates?.canonical).toBe('/legal');
  });

  it('says noindex while a placeholder is printed', async () => {
    const { metadata } = await import('@/app/(site)/legal/page');
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });
});

describe('the wiring', () => {
  it('the middleware knows /legal and does not run on it, like the other legal pages', () => {
    expect(isKnownRoute('/legal')).toBe(true);
    const mw = readFileSync(join(SRC, 'middleware.ts'), 'utf8');
    expect(mw).toContain('terms|privacy|legal|dmca|about');
  });

  it('both footers link it beside Privacy', () => {
    for (const f of ['components/layout/ux-v1/ux-footer.tsx', 'components/layout/footer.tsx']) {
      const text = readFileSync(join(SRC, f), 'utf8').replace(/\s+/g, ' ');
      expect(text, f).toMatch(/label: 'Privacy', href: '\/privacy' \},\s*\{ label: 'Legal notice', href: '\/legal' \}/);
    }
  });

  it('the sitemap lists /legal only once the notice is complete', () => {
    const sm = readFileSync(join(SRC, 'app/sitemap.ts'), 'utf8');
    expect(sm).toContain('...(legalIsComplete() ? [{ url: `${SITE_URL}/legal`');
  });
});
