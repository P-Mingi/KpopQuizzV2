// Launch polish, lane LEGAL (owner, 2026-11-20): bunnyverse.org answers /terms, /contact and /dmca, twins of OtakuQuiz's pages. Each one is
// served by the file at the root of app/sites/[site] that also serves OtakuQuiz, one H1, a title and a description of the right length, a
// canonical on its own path, no dash, the mailbox of the hub, and no placeholder. The terms say what KpopCards does; they are a 404 on kpop.
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/image', () => ({ default: () => null }));

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

const DASHES = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);
const MAILBOX = 'hello@kpopquiz.org';

type Page = { default: () => React.ReactElement; generateMetadata: () => { title: string; description: string; alternates?: { canonical?: string }; robots?: unknown } };

async function load(site: 'hub' | 'anime' | 'kpop', name: 'terms' | 'contact' | 'dmca', env: Record<string, string> = {}): Promise<Page> {
  vi.resetModules();
  vi.unstubAllEnvs();
  if (site !== 'kpop') vi.stubEnv('NEXT_PUBLIC_SITE_ID', site);
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  const pages = { terms: () => import('./terms/page'), contact: () => import('./contact/page'), dmca: () => import('./dmca/page') };
  return (await pages[name]()) as unknown as Page;
}

const html = (p: Page): string => renderToStaticMarkup(p.default());
const text = (h: string): string => h.replace(/<[^>]+>/g, ' ').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');

describe('the hub serves /terms, /contact and /dmca', () => {
  for (const name of ['terms', 'contact', 'dmca'] as const) {
    it(`${name}: one H1, a canonical on its own path, a title and a description of the right length, the mailbox, no dash`, async () => {
      const page = await load('hub', name);
      const h = html(page);
      expect(h.match(/<h1\b/g)).toHaveLength(1);
      const meta = page.generateMetadata();
      expect(meta.alternates?.canonical).toBe(`/${name}`);
      expect(meta.title.length).toBeGreaterThan(0);
      // 60 or fewer with the " | Bunnyverse" the layout adds; the description 120 to 160 (rulebook 2).
      expect(meta.title.length + ' | Bunnyverse'.length).toBeLessThanOrEqual(60);
      expect(meta.description.length).toBeGreaterThanOrEqual(120);
      expect(meta.description.length).toBeLessThanOrEqual(160);
      expect(h + JSON.stringify(meta)).not.toMatch(DASHES);
      expect(h).not.toMatch(/\{[a-zA-Z]+\}|\[[A-Z ]+\]/);
      if (/mailto:/.test(h)) expect(h).toContain(`mailto:${MAILBOX}`);
      // the hub never prints its address or its name wrong, and never the KDH film
      expect(text(h)).not.toMatch(/demon hunters/i);
    });
  }

  it('contact: the email of the hub and the legal notice, the same structure as OtakuQuiz', async () => {
    const h = html(await load('hub', 'contact'));
    expect(h).toContain(`mailto:${MAILBOX}`);
    expect(h).toContain('href="/legal"');
    expect(h).toContain('href="/privacy"');
    expect(text(h)).toContain('Bunnyverse is made by fans, for fans');
  });

  it('contact and dmca: the report form is linked only where KpopCards is on', async () => {
    expect(html(await load('hub', 'contact'))).not.toContain('/kpopcards/report');
    expect(html(await load('hub', 'dmca'))).not.toContain('/kpopcards/report');
    const on = { NET_CARDS: '1' };
    expect(html(await load('hub', 'contact', on))).toContain('href="/kpopcards/report"');
    expect(html(await load('hub', 'dmca', on))).toContain('href="/kpopcards/report"');
  });

  it('dmca: how to ask, what we do (48 hours), the counter-notice and repeat claims', async () => {
    const t = text(html(await load('hub', 'dmca')));
    for (const s of ['How to request a takedown', 'What we do', 'Counter-notice', 'Repeat claims', 'within 48 hours']) expect(t, s).toContain(s);
  });

  it('terms: accounts, public profiles, KpopCards (no money value, nothing to buy, packs for an ad), photos and reports, minors', async () => {
    const t = text(html(await load('hub', 'terms')));
    for (const s of [
      'Your account', 'Your public profile', 'KpopCards', 'Photos on the cards', 'Minors', 'Advertising',
      'There is nothing to buy', 'have no money value', 'rewarded ad for a pack.', 'report form', 'within 48 hours',
      'at least 15 years old', 'under 18', 'Card coming', 'Google or Discord', 'French law applies',
    ]) expect(t, s).toContain(s);
    // Terms of the other two sites are named as theirs, from the registry.
    expect(t).toContain('KpopQuiz and OtakuQuiz have their own terms');
    expect(t).not.toContain('Carte');
  });
});

describe('the same files still serve OtakuQuiz, and 404 on kpop', () => {
  for (const name of ['terms', 'contact', 'dmca'] as const) {
    it(`${name}: anime keeps its page and its canonical`, async () => {
      const page = await load('anime', name);
      expect(text(html(page))).toContain('OtakuQuiz');
      expect(page.generateMetadata().alternates?.canonical).toBe(`/${name}`);
    });
    it(`${name}: a build that is neither anime nor hub answers a 404`, async () => {
      const page = await load('kpop', name);
      expect(() => page.default()).toThrow();
      expect(() => page.generateMetadata()).toThrow();
    });
  }
});
