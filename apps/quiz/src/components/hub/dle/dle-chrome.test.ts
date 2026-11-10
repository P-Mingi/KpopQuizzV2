// Home v4 follow-up (integrator, 2026-11-10): the menu of the dle pages has the tabs of the hub home (Home, Daily games, Quizzes, Community),
// no Blind test tab (owner, 2026-11-07), and its Daily games tab and footer link say "Daily games" / "Jeux du jour".
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/hub/home/home-font', () => ({ dmSans: { variable: 'dm-sans-var' }, dmMono: { variable: 'dm-mono-var' } }));

import { DleChrome } from './dle-chrome';

const render = (locale: 'en' | 'fr'): string =>
  renderToStaticMarkup(createElement(DleChrome, { locale, enPath: '/daily', current: true, children: createElement('main', null, 'page') }));

const tabs = (html: string): string[] => [...html.matchAll(/<a [^>]*class="hub-dle-tab[^"]*"[^>]*>(.*?)<\/a>/g)].map((m) => m[1]!.replace(/<[^>]+>/g, ''));

describe('the menu of the dle pages', () => {
  it('has the four tabs of the hub home and no Blind test tab, in English and French', () => {
    expect(tabs(render('en'))).toEqual(['Home', 'Daily games', 'Quizzes', 'Community']);
    expect(tabs(render('fr'))).toEqual(['Accueil', 'Jeux du jour', 'Quiz', 'Communauté']);
    for (const l of ['en', 'fr'] as const) {
      expect(render(l)).not.toContain('href="/#today"');
      expect(render(l)).not.toMatch(/>Blind test<\/a>/);
    }
  });

  it('names the games "Daily games" / "Jeux du jour" in its footer too', () => {
    expect(render('en')).toContain('class="hub-h2-foot-a">Daily games</a>');
    expect(render('fr')).toContain('class="hub-h2-foot-a">Jeux du jour</a>');
    expect(render('en')).not.toMatch(/dle games|jeux dle/i);
    expect(render('fr')).not.toMatch(/dle games|jeux dle/i);
  });
});
