// o1/slots: the admin's Photos tab lists the new slots, rendered the way the tab renders them (the panels themselves, react-dom/server).
// The admin sits behind a secret path and is never opened by a lane, so this render is the proof that the owner will find them.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { DLE_SERIES } from '@/lib/dle/series';
import { ICON_GROUPS } from '@/lib/photos/slots';

import { BannersPanel } from './banners-panel';
import { IconsPanel } from './icons-panel';

const props = { head: null, assets: [], now: Date.parse('2026-11-10T12:00:00Z'), blocked: null, onSaved: () => {} };

describe('the Icônes du jeu panel', () => {
  const html = renderToStaticMarkup(createElement(IconsPanel, props));

  it('lists every group, the home rows, the legacy slot and one card per series', () => {
    for (const g of ICON_GROUPS) expect(html, g.title).toContain(g.title.replace(/&/g, '&amp;'));
    for (const name of ['Quiz K-pop du jour', 'Quiz anime du jour', 'Débat du jour', 'Blind test du jour', 'Accueil, ligne blind test']) expect(html, name).toContain(name);
    expect(html).toContain('Par série (toutes les séries)');
    expect(html).toContain('Otakudle, une étape par série');
    for (const s of DLE_SERIES) expect(html, s.id).toContain(`Étape ${s.name}`);
  });
});

describe('the Bannières et images panel', () => {
  const html = renderToStaticMarkup(createElement(BannersPanel, props));

  it('lists the banner and the small square of every series', () => {
    for (const s of DLE_SERIES) {
      expect(html, s.id).toContain(`Otakudle ${s.name}`);
      expect(html, s.id).toContain(`Mode ${s.name} du jour`);
      expect(html, s.id).toContain(`bunnyverse.org/otakudle/${s.id}`);
    }
    expect(html).toContain('Mode Un Otakudle par série (toutes les séries)');
  });
});
