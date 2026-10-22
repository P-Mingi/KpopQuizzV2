import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { COPY } from '@/copy/hub/h1';
import { TX_COOKIE_NAMES } from '@/lib/passport/types';

import { ht } from './copy';
import { PRIVACY_NOTICE, PRIVACY_PAGE, PRIVACY_SECTIONS } from './network-page';

// Lot (d), H1: the network privacy draft. The keys privacy.* of copy/hub/h1.ts are the text of docs/o1/reports/H1/privacy-draft.md
// word for word; the cookie names are those of docs/o1/contracts/cookies.md; the hub page shows them under a Draft banner.

const ROOT = join(__dirname, '../../../../../..');
const DRAFT = join(ROOT, 'docs/o1/reports/H1/privacy-draft.md');
const COOKIES = join(ROOT, 'docs/o1/contracts/cookies.md');
const KEYS = Object.keys(COPY).filter((k) => k.startsWith('privacy.')) as (keyof typeof COPY)[];
const DASHES = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);

afterEach(() => { vi.unstubAllEnvs(); });

describe('the keys', () => {
  it('are all on the page or in the notice, and none is missing from the lists', () => {
    const listed = new Set<string>([
      ...Object.values(PRIVACY_PAGE), ...PRIVACY_NOTICE,
      ...PRIVACY_SECTIONS.flatMap((s) => [s.title, ...s.blocks.flatMap((b) => (b.kind === 'p' ? [b.key] : b.kind === 'list' ? b.keys : []))]),
    ]);
    expect([...listed].sort()).toEqual([...KEYS].sort());
  });
  it('keep the plain voice: no dash, no emoji, every placeholder filled', () => {
    for (const k of KEYS) {
      expect(COPY[k], k).not.toMatch(DASHES);
      expect(COPY[k], k).not.toMatch(/\p{Extended_Pictographic}/u);
      expect(ht(k), k).not.toMatch(/[{}]/);
    }
  });
  it('make a passport notice of 3 to 5 lines that names the three sites', () => {
    expect(PRIVACY_NOTICE.length).toBeGreaterThanOrEqual(3);
    expect(PRIVACY_NOTICE.length).toBeLessThanOrEqual(5);
    expect(ht('privacy.notice.l1')).toMatch(/KpopQuiz \(kpopquiz\.org\), OtakuQuiz \(otakuquiz\.org\) and FanQuiz \(fanquiz\.org\)/);
  });
});

describe.skipIf(!existsSync(DRAFT))('the draft document', () => {
  const md = existsSync(DRAFT) ? readFileSync(DRAFT, 'utf8') : '';
  it('holds the text of every key word for word', () => {
    for (const k of KEYS) expect(md.includes(ht(k)), `${k}: ${ht(k)}`).toBe(true);
  });
  it('marks the points the owner decides, and is not wired as final', () => {
    expect(md.match(/^OWNER: /gm)!.length).toBeGreaterThanOrEqual(10);
    expect(md).toMatch(/Draft for the owner to validate/);
    expect(md).not.toMatch(DASHES);
  });
});

describe('the cookie names', () => {
  const NAMES = [
    'sb-<project ref>-auth-token', '__Host-pp_tx', 'pp_tx', 'nq_anon', 'kq_sl', 'preferred_locale', 'verse_nav', 'world', 'theme',
    'fq.net.caps.v1', 'fq.net.via', 'anime.spoiler.v1',
  ];
  const all = KEYS.map((k) => COPY[k]).join('\n');
  it('are written exactly as the cookies contract writes them', () => {
    const contract = readFileSync(COOKIES, 'utf8');
    for (const n of NAMES) {
      expect(contract.includes(n), `${n} in cookies.md`).toBe(true);
      expect(all.includes(n), `${n} in the draft`).toBe(true);
    }
    expect(TX_COOKIE_NAMES).toEqual({ https: '__Host-pp_tx', devHttp: 'pp_tx' });
  });
});

describe('the page of the hub', () => {
  async function render() {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_SITE_ID', 'hub');
    const page = await import('@/app/sites/[site]/privacy/page');
    return { page, html: renderToStaticMarkup(page.default()) };
  }
  it('shows a visible Draft banner, one h1, and the text of the keys', async () => {
    const { html } = await render();
    expect(html).toContain('data-hub-draft');
    expect(html).toContain('<strong>Draft</strong>');
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).toContain(`>${ht('privacy.h1')}</h1>`);
    for (const s of PRIVACY_SECTIONS) expect(html).toContain(`>${ht(s.title)}</h2>`);
    expect(html).toContain('__Host-pp_tx');
    expect(html).toContain('href="mailto:contact@fanquiz.org"');
  });
  it('is closed to search engines while it is a draft', async () => {
    const { page } = await render();
    expect(page.generateMetadata().robots).toEqual({ index: false, follow: true });
    expect(page.generateMetadata().title).toBe(ht('privacy.metaTitle'));
  });
  it('leaves the page of the other builds as it was', async () => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_SITE_ID', 'anime');
    vi.stubEnv('NET_INDEXING', '1');
    const page = await import('@/app/sites/[site]/privacy/page');
    expect(renderToStaticMarkup(page.default())).not.toContain('data-hub-draft');
    expect(page.generateMetadata().robots).toEqual({ index: true, follow: true });
  });
  it('is closed on the other builds while NET_INDEXING is off', async () => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_SITE_ID', 'anime');
    const page = await import('@/app/sites/[site]/privacy/page');
    expect(page.generateMetadata().robots).toEqual({ index: false, follow: false });
  });
});
