// Run O1, lane C3: the indexing switch (indexing.ts), and the llms.txt text of anime and hub (root-files.ts).
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function load(site: string, flag: string) {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_SITE_ID', site);
  vi.stubEnv('NET_INDEXING', flag);
  return import('./indexing');
}

describe('NET_INDEXING', () => {
  it('is closed by default on anime and hub: every page noindex and nofollow, whatever it asks', async () => {
    for (const site of ['anime', 'hub']) {
      for (const flag of ['', '0', 'false', 'yes', 'open']) {
        const m = await load(site, flag);
        expect(m.INDEXING_OPEN, `${site} ${flag}`).toBe(false);
        expect(m.robotsFor(true)).toEqual({ index: false, follow: false });
        expect(m.robotsFor(false, true)).toEqual({ index: false, follow: false });
      }
    }
  });

  it('opens on anime and hub with 1 or true: a page says what it asked', async () => {
    for (const site of ['anime', 'hub']) {
      for (const flag of ['1', 'true']) {
        const m = await load(site, flag);
        expect(m.INDEXING_OPEN).toBe(true);
        expect(m.robotsFor(true)).toEqual({ index: true, follow: true });
        expect(m.robotsFor(false)).toEqual({ index: false, follow: true });
      }
    }
  });

  it('never closes kpop', async () => {
    const m = await load('kpop', '');
    expect(m.INDEXING_OPEN).toBe(true);
  });
});

describe('llmsText', () => {
  it('names the site, its host and real routes, never kpopquiz.org or K-pop', async () => {
    vi.resetModules();
    const { REGISTRY } = await import('./registry');
    const { llmsText } = await import('./root-files');
    for (const site of [REGISTRY.anime, REGISTRY.hub]) {
      const text = llmsText(site);
      expect(text.startsWith(`# ${site.seo.llmsTxt.title}\n`)).toBe(true);
      expect(text).not.toMatch(/kpopquiz|K-pop|kpop/i);
      expect(text).not.toMatch(/\d+\+? quizzes/);
    }
    expect(llmsText(REGISTRY.anime)).toContain('/series');
    expect(llmsText(REGISTRY.hub)).toContain('/privacy');
  });
});
