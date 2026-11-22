// Owner, 2026-11-22 ("KpopCards should be on this nav too"): the bar of the dle pages has the KpopCards tab, as the home and the other hub
// pages, under the same gate (NET_CARDS and NET_CARDS_BRIDGES on the hub build); with the gate shut the bar is unchanged.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/hub/home/home-font', () => ({ dmSans: { variable: 'dm-sans-var' }, dmMono: { variable: 'dm-mono-var' } }));
vi.mock('@/lib/site/registry', async (original) => {
  const real = await original<typeof import('@/lib/site/registry')>();
  return { ...real, SITE_ID: 'hub', SITE: real.REGISTRY.hub };
});

const tabs = (html: string): string[] => [...html.matchAll(/<a [^>]*class="hub-dle-tab[^"]*"[^>]*>(.*?)<\/a>/g)].map((m) => m[1]!.replace(/<[^>]+>/g, ''));

async function render(locale: 'en' | 'fr', vars: Record<string, string>): Promise<string> {
  vi.resetModules();
  vi.unstubAllEnvs();
  for (const [k, v] of Object.entries(vars)) vi.stubEnv(k, v);
  const { DleChrome } = await import('./dle-chrome');
  return renderToStaticMarkup(createElement(DleChrome, { locale, enPath: '/daily', current: true, children: createElement('main', null, 'page') }));
}

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe('the KpopCards tab of the dle pages', () => {
  it('shows between Quizzes and Community once the cards bridges are on, in English and French', async () => {
    const on = { NET_CARDS: '1', NET_CARDS_BRIDGES: '1' };
    expect(tabs(await render('en', on))).toEqual(['Home', 'Daily games', 'Quizzes', 'KpopCards', 'Community']);
    expect(tabs(await render('fr', on))).toEqual(['Accueil', 'Jeux du jour', 'Quiz', 'KpopCards', 'Communauté']);
    expect(await render('en', on)).toContain('<a href="/kpopcards" class="hub-dle-tab">KpopCards</a>');
  });

  it('is absent with either flag off', async () => {
    for (const vars of [{}, { NET_CARDS: '1' }, { NET_CARDS_BRIDGES: '1' }]) {
      expect(tabs(await render('en', vars)), JSON.stringify(vars)).toEqual(['Home', 'Daily games', 'Quizzes', 'Community']);
    }
  });
});
