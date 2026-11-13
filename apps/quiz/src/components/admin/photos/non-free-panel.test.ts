// Lot 3 DLE: the button "Supprimer les images non libres" of the Photos tab: its words, its refusal over 1,100, the word SUPPRIMER, and the
// calls it makes (the counts it was shown are sent back, never a list).
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { callNonFree } from './api';
import { CONFIRM_WORD, NonFreePanel, PreviewBlock, countsLine, fr, refusalLine, reportLine } from './non-free-panel';

describe('the words of the panel', () => {
  it('groups thousands and counts in the singular and the plural', () => {
    expect(fr(1068)).toBe('1 068');
    expect(fr(12)).toBe('12');
    expect(countsLine({ rows: 1068, files: 2900, orphans: 12 })).toBe('1 068 images, 2 900 fichiers à supprimer avec elles, 12 fichiers orphelins.');
    expect(countsLine({ rows: 1, files: 1, orphans: 1 })).toBe('1 image, 1 fichier à supprimer avec elles, 1 fichier orphelin.');
    expect(refusalLine({ counts: { rows: 1200, files: 3000, orphans: 0 }, max: 1100 })).toBe('1 200 images sélectionnées, plus que 1 100 : suppression refusée, rien n\'est supprimé.');
    expect(reportLine({ rows: 1068, files: 2900, orphans: 12, failedChunks: 0 })).toBe('Supprimé : 1 068 images, 2 900 fichiers, 12 fichiers orphelins.');
    expect(reportLine({ rows: 1, files: 2, orphans: 0, failedChunks: 2 })).toContain('2 lot(s) ont échoué');
    expect(CONFIRM_WORD).toBe('SUPPRIMER');
  });

  it('draws a labelled button and nothing else before the click (no word field, no list)', () => {
    const html = renderToStaticMarkup(h(NonFreePanel));
    expect(html).toContain('Supprimer les images non libres');
    expect(html).toContain('aria-labelledby="nf-h"');
    expect(html).not.toContain('nf-word');
    expect(html).toContain('aria-live="polite"');
    expect(html).not.toMatch(/[\u2013\u2014]/);
  });
});

describe('the preview block', () => {
  const base = { counts: { rows: 1068, files: 2900, orphans: 12 }, tooMany: false, max: 1100, examples: Array.from({ length: 10 }, (_, i) => ({ slug: `one-piece/c${i}`, license: 'other', why: 'Official artwork' })) };
  const view = (over: Partial<typeof base>, word = '', deleting = false): string =>
    renderToStaticMarkup(h(PreviewBlock, { preview: { ...base, ...over }, word, deleting, onWord: () => undefined, onRun: () => undefined }));

  it('shows the counts and 10 examples, then asks for the word; the final button waits for it', () => {
    const html = view({});
    expect(html).toContain('1\u00A0068 images, 2\u00A0900 fichiers');
    expect(html).toContain('10 exemples');
    expect((html.match(/<li>/g) ?? []).length).toBe(10);
    expect(html).toContain('Tape SUPPRIMER pour confirmer');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Supprimer maintenant/);
    expect(view({}, 'supprimer')).toMatch(/disabled=""/);
    expect(view({}, 'SUPPRIMER')).not.toMatch(/<button[^>]*disabled/);
    expect(view({}, 'SUPPRIMER', true)).toMatch(/disabled=""[^>]*>Suppression en cours/);
  });

  it('refuses over the limit: the sentence, no word field, no button', () => {
    const html = view({ counts: { rows: 1101, files: 3000, orphans: 0 }, tooMany: true });
    expect(html).toContain('1\u00A0101 images sélectionnées, plus que 1\u00A0100 : suppression refusée');
    expect(html).toContain('role="alert"');
    expect(html).not.toContain('nf-word');
    expect(html).not.toContain('Supprimer maintenant');
  });

  it('says so when there is nothing to delete', () => {
    const html = view({ counts: { rows: 0, files: 0, orphans: 0 }, examples: [] });
    expect(html).toContain('Rien à supprimer.');
    expect(html).not.toContain('nf-word');
  });
});

describe('the calls', () => {
  const json = (body: unknown, status = 200): Response => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

  it('posts the body as JSON, same origin, and answers the data', async () => {
    const fetcher = vi.fn(async () => json({ ok: true, counts: { rows: 2, files: 4, orphans: 1 } }));
    const res = await callNonFree({ action: 'preview' }, fetcher as unknown as typeof fetch);
    expect(res).toMatchObject({ ok: true, data: { counts: { rows: 2 } } });
    const [url, init] = (fetcher.mock.calls[0] ?? []) as unknown as [string, RequestInit];
    expect(url).toMatch(/\/api\/admin\/images\/non-free$/);
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('same-origin');
    expect(JSON.parse(String(init.body))).toEqual({ action: 'preview' });
  });

  it('carries the server\'s own words on a refusal, and a plain sentence when there are none', async () => {
    expect(await callNonFree({}, (async () => json({ error: 'La sélection a changé.', code: 'count_changed' }, 409)) as unknown as typeof fetch)).toEqual({ ok: false, error: 'La sélection a changé.' });
    expect(await callNonFree({}, (async () => json({ error: 'Not found.', code: 'not_found' }, 404)) as unknown as typeof fetch)).toMatchObject({ ok: false, error: 'Not found.' });
    expect(await callNonFree({}, (async () => new Response('', { status: 404 })) as unknown as typeof fetch)).toEqual({ ok: false, error: 'Réservé à l\'admin : reconnecte-toi.' });
    expect(await callNonFree({}, (async () => { throw new Error('offline'); }) as unknown as typeof fetch)).toEqual({ ok: false, error: 'Le réseau ne répond pas. Réessaie.' });
  });
});
