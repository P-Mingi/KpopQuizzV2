// Lane charrefs (L32): the "Références personnages" screen rendered the way the tab renders it (react-dom/server). The admin sits behind a secret
// path and is never opened by a lane: this render is the proof that the three boxes, the credits, the filters and the counter are there.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { NO_LICENSE_WORDS } from '@/lib/photos/character-refs';

import { CharacterRefsPanel } from './character-refs-panel';

import type { CharacterRefsData, RefListRow } from '@/lib/photos/character-refs';

const row = (over: Partial<RefListRow>): RefListRow => ({
  series: 'inuyasha', seriesName: 'Inuyasha', character: 'kohaku', name: 'Kohaku', status: 'reference', reference: null, candidate: null, published: null, publishedAt: null, ...over,
});
const aniList = {
  hasFile: true, pageUrl: 'https://anilist.co/character/12345', imageUrl: 'https://s4.anilist.co/file/anilistcdn/character/large/b12345-x.png', filePageUrl: null,
  author: 'AniList (character image, rights holder of the series)', license: '© the rights holder of the series, via AniList: not a free licence', foundBy: 'anilist: media list',
};
const data: CharacterRefsData = {
  schema: 'ok', total: 1116, published: 2,
  series: [{ slug: 'inuyasha', name: 'Inuyasha', count: 3 }, { slug: 'gintama', name: 'Gintama', count: 1 }],
  rows: [
    row({ reference: aniList }),
    row({ character: 'rin', name: 'Rin', reference: { ...aniList, license: null, author: null, foundBy: 'anilist: checked by hand' } }),
    row({ character: 'sango', name: 'Sango' }),
    row({
      series: 'gintama', seriesName: 'Gintama', character: 'kagura', name: 'Kagura', status: 'published', publishedAt: '2026-11-10T10:00:00Z',
      published: { url: 'https://cdn.example/kagura.webp', license: 'cc_by', author: 'Jane Doe', sourceUrl: 'https://commons.wikimedia.org/wiki/File:K.png', verified: true },
    }),
  ],
};
const html = renderToStaticMarkup(createElement(CharacterRefsPanel, { head: null, data, onSaved: () => {} }));

describe('the Références personnages screen', () => {
  it('draws the three boxes of every character', () => {
    expect(html.match(/data-testid="ref-box-reference"/g)).toHaveLength(4);
    expect(html.match(/data-testid="ref-box-candidate"/g)).toHaveLength(4);
    expect(html.match(/data-testid="ref-box-published"/g)).toHaveLength(4);
    expect(html).toContain('Image libre');
    expect(html).toContain('Publiée aujourd&#x27;hui');
    expect(html).toContain('Rien de publié');
  });
  it('names the source from the host of the reference, with its credits and how it was found', () => {
    expect(html).toContain('Référence AniList');
    expect(html).not.toMatch(/Fandom/);
    expect(html).toContain('anilist.co');
    expect(html).toContain('s4.anilist.co');
    expect(html).toContain('AniList (character image, rights holder of the series)');
    expect(html).toContain('not a free licence');
    expect(html).toContain('Trouvé par');
    expect(html).toContain('liste de la série');
    expect(html).toContain('vérifié à la main');
  });
  it('says the licence is not stated when the reference has none, and "Pas de référence" when there is none', () => {
    expect(NO_LICENSE_WORDS).toBe('non indiquée : à considérer comme non libre');
    expect(html).toContain('non indiquée : à considérer comme non libre');
    expect(html).toContain('Pas de référence');
  });
  it('pre-fills the free picture form with the credits of the reference, and offers the buttons and the licence list', () => {
    expect(html).toContain('value="https://anilist.co/character/12345"');
    expect(html).toContain('value="AniList (character image, rights holder of the series)"');
    expect(html).toContain('Remplacer par une image libre');
    expect(html).toContain('Valider et publier');
    for (const l of ['CC0', 'Domaine public', 'CC BY', 'CC BY-SA', 'Oeuvre du propriétaire', 'Commande avec droits écrits', 'Autre licence libre']) expect(html, l).toContain(l);
  });
  it('shows the picture published today with its licence', () => {
    expect(html).toContain('https://cdn.example/kagura.webp');
    expect(html).toContain('CC BY, vérifiée');
  });
  it('has the filters by series and status, and the counter from the data', () => {
    expect(html).toContain('Toutes les séries (1116)');
    expect(html).toContain('Gintama (1)');
    for (const t of ['>Tous<', '>Référence<', '>Candidat<', '>Publié<']) expect(html, t).toContain(t);
    expect(html).toContain('2 / 1116 publiés');
  });
  it('has no dash and no preview (signed URL) until the server gave one', () => {
    expect(html).not.toMatch(/[\u2013\u2014]/);
    expect(html).toContain('Aperçu en cours');
  });
  it('says so when the list could not be read, and when the table is not there', () => {
    expect(renderToStaticMarkup(createElement(CharacterRefsPanel, { head: null, data: null, onSaved: () => {} }))).toContain('n&#x27;a pas pu être lue');
    expect(renderToStaticMarkup(createElement(CharacterRefsPanel, { head: null, data: { ...data, schema: 'missing' }, onSaved: () => {} }))).toContain('migration L32');
  });
});
