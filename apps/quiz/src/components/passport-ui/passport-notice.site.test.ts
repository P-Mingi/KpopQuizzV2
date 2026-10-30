// Run O1, lot (d), lane H1 point 17: the short passport notice on the sign-in screens of the world sites, with a link to the full text on
// the hub, and no "OK" to click. Same copy as the policy (privacy.notice.*). The kpop sign-in screens show it only with NEXT_PUBLIC_NET_PRIVACY on (second pass, below).
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
      expect(`${NETWORK.url}/privacy`).toBe('https://bunnyverse.org/privacy');
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
      expect(ht('privacy.notice.full')).toBe('The full text is at bunnyverse.org/privacy.');
      expect(html).toContain('We never post for you.');
      expect(html).not.toMatch(DASHES);
    });
  }
});

/** The markup of an element once every lazy part and Suspense boundary has resolved. */
async function settled(el: React.ReactElement): Promise<string> {
  const { renderToPipeableStream } = await import('react-dom/server');
  const { Writable } = await import('node:stream');
  return new Promise((resolve, reject) => {
    let out = '';
    const sink = new Writable({ write(chunk, _enc, cb) { out += String(chunk); cb(); }, final(cb) { resolve(out); cb(); } });
    const { pipe } = renderToPipeableStream(el, { onAllReady: () => pipe(sink), onError: reject });
  });
}

// Second pass (owner 2026-10-24, point 17): kpop shows the same notice, behind NEXT_PUBLIC_NET_PRIVACY, and is today's page without it.
describe('kpop: the notice is behind NEXT_PUBLIC_NET_PRIVACY', () => {
  async function kpopLogin(flag: string | undefined): Promise<{ html: string; ht: (k: 'privacy.notice.l1' | 'privacy.notice.l2' | 'privacy.notice.l3' | 'privacy.notice.full') => string }> {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv('NEXT_PUBLIC_SITE_ID', 'kpop');
    if (flag !== undefined) vi.stubEnv('NEXT_PUBLIC_NET_PRIVACY', flag);
    const { LoginBody } = await import('@/components/login/login-body');
    const { ht } = await import('@/lib/site/hub/copy');
    return { html: await settled(h(LoginBody)), ht };
  }

  it('off (unset, 0, false): the kpop login body has no notice and no link to bunnyverse.org', async () => {
    for (const flag of [undefined, '', '0', 'false']) {
      const { html, ht } = await kpopLogin(flag);
      expect(html, String(flag)).not.toContain('data-passport-notice');
      expect(html, String(flag)).not.toContain(ht('privacy.notice.l1'));
      expect(html, String(flag)).not.toContain('bunnyverse.org');
    }
  });

  it('off: the markup is the same whether the flag is unset or 0', async () => {
    const a = await kpopLogin(undefined);
    const b = await kpopLogin('0');
    expect(b.html).toBe(a.html);
  });

  it('on (1, true): the three lines and where the full text is, as a note of the login page', async () => {
    for (const flag of ['1', 'true']) {
      const { html, ht } = await kpopLogin(flag);
      expect(html, flag).toContain('data-passport-notice');
      for (const k of ['privacy.notice.l1', 'privacy.notice.l2', 'privacy.notice.l3'] as const) expect(html, flag).toContain(ht(k));
      expect(html, flag).toContain('href="https://bunnyverse.org/privacy"');
      expect(html, flag).toContain('class="auth-note" data-passport-notice');
      expect(html, flag).not.toMatch(DASHES);
    }
  });

  it('on: the kpop sign-in sheet shows the same notice and the link; off it does not', async () => {
    const sheet = async (flag: string | undefined): Promise<string> => {
      vi.resetModules();
      vi.unstubAllEnvs();
      vi.stubEnv('NEXT_PUBLIC_SITE_ID', 'kpop');
      if (flag !== undefined) vi.stubEnv('NEXT_PUBLIC_NET_PRIVACY', flag);
      const { SignInSheet } = await import('@/components/ux-v1/sign-in-sheet');
      const { UxFeedbackProvider } = await import('@/components/ux-v1/toast');
      return settled(h(UxFeedbackProvider, null, h(SignInSheet, { open: true, request: {}, onClose: () => undefined, inline: true })));
    };
    const on = await sheet('1');
    expect(on).toContain('data-passport-notice');
    expect(on).toContain('href="https://bunnyverse.org/privacy"');
    expect(on).toContain('Continue with Discord');
    const off = await sheet(undefined);
    expect(off).not.toContain('data-passport-notice');
    expect(off).not.toContain('bunnyverse.org');
  });

  it('the shared kpop modules reach the notice only through a lazy import, shown only with the flag on', () => {
    for (const f of ['components/login/login-body.tsx', 'components/ux-v1/sign-in-sheet.tsx']) {
      const text = readFileSync(`${SRC}${f}`, 'utf8');
      expect(text, f).not.toMatch(/^import .*(?:passport-notice|hub\/copy|network-page)/m);
      expect(text, f).toMatch(/lazy\(\(\) => import\('@\/components\/passport-ui\/passport-notice'\)/);
      expect(text, f).toContain("process.env.NEXT_PUBLIC_NET_PRIVACY === '1' || process.env.NEXT_PUBLIC_NET_PRIVACY === 'true'");
      expect(text, f).not.toMatch(/privacy\.notice|from '@\/lib\/site\/registry'/);
    }
  });
});
