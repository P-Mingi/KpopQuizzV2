// Run O1, lot (b), lane P1: the shared kpop components on the anime build. The world sign-in sheet, the login body, the onboarding form
// and the settings render the words of the site (the network and privacy lines, OtakuQuiz), with no K-pop word, no dash. The kpop
// build keeps its own (o1-p1-kpop-tree.test.ts).
// FandomVerse (owner, 2026-10-28, reverses D-099): Google and Discord only, no email field. Discord is named only by its button.
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: () => undefined, push: () => undefined }),
  usePathname: () => '/login',
  useSearchParams: () => new URLSearchParams('returnTo=/daily'),
}));

async function onSite<T>(site: 'anime' | 'hub', load: () => Promise<T>): Promise<T> {
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.stubEnv('NEXT_PUBLIC_SITE_ID', site);
  return load();
}
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

const BANNED = /k-?pop|discord|kpopquiz|bunny|\bstans?\b/i;
const DASHES = /[\u2013\u2014]/;
/** The markup without the allowed mentions of Discord: its button label and the button's style class (kpop's auth-discord). */
const offButton = (html: string): string => html.replaceAll('Continue with Discord', '').replaceAll('class="auth-btn auth-discord"', '');
/** No trace of an email sign-in: no email field, no link button, no "sent" line. */
function expectNoEmailSignIn(html: string): void {
  expect(html).not.toContain('type="email"');
  expect(html).not.toContain('Email me a sign-in link');
  expect(html).not.toContain('Continue with email');
  expect(html).not.toMatch(/sign-in link|magic link|Link sent/i);
}

describe('the sign-in sheet on a world site', () => {
  for (const [site, brand] of [['anime', 'OtakuQuiz'], ['hub', 'FanQuiz']] as const) {
    it(`${site}: Google and Discord, no email field, the network line and the privacy line`, async () => {
      const { WorldSignInSheet } = await onSite(site, () => import('./world-sign-in-sheet'));
      const html = renderToStaticMarkup(h(WorldSignInSheet, { open: true, request: {}, onClose: () => undefined, inline: true }));
      expect(html).toContain(`Sign in to ${brand}`);
      expect(html).toContain('Continue with Google');
      expect(html.match(/Continue with Discord/g)).toHaveLength(1);
      expect(html.indexOf('Continue with Google')).toBeLessThan(html.indexOf('Continue with Discord'));
      expectNoEmailSignIn(html);
      expect(html).toContain('One FanQuiz passport works on every site of the network.');
      expect(html).toContain('We never post for you.');
      expect(offButton(html)).not.toMatch(BANNED);
      expect(html).not.toMatch(DASHES);
    });
  }

  it('a context title and sub from the caller still win', async () => {
    const { WorldSignInSheet } = await onSite('anime', () => import('./world-sign-in-sheet'));
    const html = renderToStaticMarkup(h(WorldSignInSheet, { open: true, request: { title: 'Save your 7/8', sub: 'Keep it.' }, onClose: () => undefined, inline: true }));
    expect(html).toContain('Save your 7/8');
    expect(html).toContain('Keep it.');
  });
});

describe('the login body on a world site', () => {
  it('anime: the brand, Google and Discord, no email form, the guest link, the network line', async () => {
    const { LoginBody } = await onSite('anime', () => import('./login-body'));
    const html = renderToStaticMarkup(h(LoginBody));
    expect(html).toContain('otakuquiz');
    expect(html).toContain('Continue with Google');
    expect(html.match(/Continue with Discord/g)).toHaveLength(1);
    expect(offButton(html)).not.toMatch(BANNED);
    expect(html).not.toMatch(DASHES);
    expect(html).toContain('Just let me play as a guest');
    expect(html).toContain('One FanQuiz passport works on every site of the network.');
    expectNoEmailSignIn(html);
    expect(html).not.toContain('<form');
    // The guest link stays on the anime build: its basePath before the app path.
    expect(html).toContain('href="/anime"');
  });

  it('hub: Google and Discord, no email form, the guest link at the root', async () => {
    const { LoginBody } = await onSite('hub', () => import('./login-body'));
    const html = renderToStaticMarkup(h(LoginBody));
    expect(html).toContain('Continue with Google');
    expect(html.match(/Continue with Discord/g)).toHaveLength(1);
    expectNoEmailSignIn(html);
    expect(html).not.toContain('<form');
    expect(html).toMatch(/<div class="auth-guest"><a href="\/">/);
  });
});

describe('the onboarding form on anime', () => {
  it('says the words of the site', async () => {
    const [{ OnboardingForm }, { onboardingWords }] = await onSite('anime', () => Promise.all([import('@/app/(site)/onboarding/onboarding-form'), import('@/lib/passport-ui/words')]));
    const html = renderToStaticMarkup(h(OnboardingForm, { words: onboardingWords('anime')! }));
    expect(html).toContain('Pick a username');
    expect(html).toContain('every site of FanQuiz');
    expect(html).toContain('Claim username');
    expect(html).not.toMatch(BANNED);
    expect(html).not.toContain('army_mina');
  });
});

describe('the settings on anime', () => {
  it('while it loads, nothing of kpop', async () => {
    const [{ UxWorldSettings }, { settingsWorld }] = await onSite('anime', () => Promise.all([import('./world-settings'), import('@/lib/passport-ui/settings-world')]));
    const html = renderToStaticMarkup(h(UxWorldSettings, { world: settingsWorld('anime')! }));
    expect(html).not.toMatch(BANNED);
  });
});
