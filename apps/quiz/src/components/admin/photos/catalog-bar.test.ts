// KpopCards file 114: the catalog button of the Cartes tab. Before the first pack it reads "Reconstruire le catalogue"; after it, "Ajouter au
// catalogue", which shows a preview (cards, subjects) and only offers the write behind a confirmation button.
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CatalogBar, appendSentence } from './cards-panel';

import type { AppendSummary } from './cards-panel';

const noop = (): void => undefined;
const bar = (frozen: boolean | null, preview: AppendSummary | null = null, busy = false): string =>
  renderToStaticMarkup(h(CatalogBar, { frozen, busy, preview, onRebuild: noop, onPreview: noop, onConfirm: noop, onCancel: noop }));
const A: AppendSummary = { cards: 6, subjects: 3, new_subjects: 1, extended_subjects: 2, waiting: 18, from_no: 183, to_no: 188 };

describe('the catalog button', () => {
  it('reads Reconstruire before the first pack and Ajouter after it, never both', () => {
    expect(bar(false)).toContain('Reconstruire le catalogue');
    expect(bar(false)).not.toContain('Ajouter au catalogue');
    expect(bar(true)).toContain('Ajouter au catalogue');
    expect(bar(true)).not.toContain('Reconstruire');
    expect(bar(null)).toBe('');
  });
  it('after the first pack the first click only previews: no confirmation button until the preview is shown', () => {
    expect(bar(true)).not.toContain('Confirmer');
    const html = bar(true, A);
    expect(html).toContain('6 cartes');
    expect(html).toContain('3 sujets');
    expect(html).toContain('les cartes 183 à 188');
    expect(html).toContain('Confirmer l&#x27;ajout');
    expect(html).toContain('Annuler');
  });
  it('an empty preview has nothing to confirm', () => {
    const html = bar(true, { ...A, cards: 0, subjects: 0, new_subjects: 0, extended_subjects: 0, from_no: null, to_no: null });
    expect(html).toContain('Rien à ajouter');
    expect(html).not.toContain('Confirmer');
  });
  it('disables the buttons while a call runs', () => {
    expect(bar(true, null, true)).toMatch(/<button[^>]*disabled=""/);
    expect(bar(true, A, true).match(/disabled=""/g)?.length).toBe(2);
  });
  it('writes French with no em or en dash', () => {
    for (const t of [appendSentence(A, false), appendSentence(A, true), appendSentence({ ...A, cards: 1, subjects: 1, new_subjects: 0, extended_subjects: 1, from_no: 9, to_no: 9, waiting: 1 }, true), bar(true, A)]) {
      expect(t).not.toMatch(/[–—]/);
    }
    expect(appendSentence({ ...A, cards: 1, subjects: 1, new_subjects: 0, extended_subjects: 1, from_no: 9, to_no: 9 }, true)).toContain('1 carte,');
  });
});
