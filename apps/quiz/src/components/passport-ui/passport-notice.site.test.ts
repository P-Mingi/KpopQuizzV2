// Run O1, lot (d), lane H1 point 17: the short passport notice on the sign-in screens of the world sites, with a link to the full text on
// the hub, and no "OK" to click. Same copy as the policy (privacy.notice.*). The kpop sign-in screens are not touched.
import { readFileSync } from 'node:fs';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: () => undefined, push: () => undefined }),
  usePathname: () => '/login',
  useSearchParams: () => new URLSearchParams('returnTo=/daily'),
}));

async function onSite<T>(site: 'anime' | 'hub' | 'kpop', load: () => Promise<T>): Promise<T> {
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.stubEnv('NEXT_PUBLIC_SITE_ID', site);
  return load();
}
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

const SRC = new URL('../../', import.meta.url).pathname;
const DASHES = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);

describe('the sign-in sheet of anime and hub', () => {
  for (const site of ['anime', 'hub'] as const) {
    it(`${site}: the three notice lines and a link to the privacy page of the hub, no OK`, async () => {
      const { WorldSignInSheet } = await onSite(site, () => import('./world-sign-in-sheet'));
      const { ht } = await import('@/lib/site/hub/copy');
      const { NETWORK } = await import('@/lib/site/registry');
      const html = renderToStaticMarkup(h(WorldSignInSheet, { open: true, request: {}, onClose: () => undefined, inline: true }));
      expect(html).toContain('data-passport-notice');
      for (const k of ['privacy.notice.l1', 'privacy.notice.l2', 'privacy.notice.l3'] as const) expect(html).toContain(ht(k));
      expect(html).toContain(`href="${NETWORK.url}/privacy"`);
      expect(`${NETWORK.url}/privacy`).toBe('https://fanquiz.org/privacy');
      expect(html).toContain(`>${ht('privacy.notice.link')}</a>`);
      expect(html).not.toMatch(/>\s*(?:OK|Okay|I agree|Accept)\s*</i);
      expect(html).not.toMatch(DASHES);
    });
  }

  it('the notice can be replaced through the optional prop', async () => {
    const { WorldSignInSheet } = await onSite('anime', () => import('./world-sign-in-sheet'));
    const html = renderToStaticMarkup(h(WorldSignInSheet, { open: true, request: {}, onClose: () => undefined, inline: true, notice: null }));
    expect(html).not.toContain('data-passport-notice');
  });
});

describe('the login page of anime and hub', () => {
  for (const site of ['anime', 'hub'] as const) {
    it(`${site}: the notice rides on the privacy line of the page, and says where the full text is`, async () => {
      const { LoginBody } = await onSite(site, () => import('./login-body'));
      const { ht } = await import('@/lib/site/hub/copy');
      const html = renderToStaticMarkup(h(LoginBody, {}));
      for (const k of ['privacy.notice.l1', 'privacy.notice.l2', 'privacy.notice.l3', 'privacy.notice.full'] as const) expect(html).toContain(ht(k));
      expect(ht('privacy.notice.full')).toBe('The full text is at fanquiz.org/privacy.');
      expect(html).toContain('We never post for you.');
      expect(html).not.toMatch(DASHES);
    });
  }
});

describe('kpop is left alone', () => {
  it('the kpop login body has no notice', async () => {
    const { LoginBody } = await onSite('kpop', () => import('@/components/login/login-body'));
    const { ht } = await import('@/lib/site/hub/copy');
    const html = renderToStaticMarkup(h(LoginBody));
    expect(html).not.toContain(ht('privacy.notice.l1'));
    expect(html).not.toContain('fanquiz.org');
  });

  it('the shared kpop modules do not know the notice', () => {
    for (const f of ['components/login/login-body.tsx', 'components/ux-v1/sign-in-sheet.tsx']) {
      const text = readFileSync(`${SRC}${f}`, 'utf8');
      expect(text, f).not.toMatch(/passport-notice|privacy\.notice|hub\/copy|network-page/);
    }
  });
});
