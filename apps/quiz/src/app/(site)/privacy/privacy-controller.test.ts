import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import Page from './page';

// The data controller of kpopquiz.org (owner, 2026-10-25): the register names Louis Pecchia, entrepreneur individuel.
describe('privacy: who is responsible', () => {
  const html = renderToStaticMarkup(Page());
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

  it('names the controller, the address, the SIREN, the mailbox and links the legal notice', () => {
    expect(html).toContain('>Who is responsible</h2>');
    expect(text).toContain('Louis Pecchia, entrepreneur individuel, 3560 chemin des Lauves, 13100 Aix-en-Provence, France, SIREN 109 686 634');
    expect(html).toContain('href="mailto:hello@kpopquiz.org"');
    expect(html).toContain('href="/legal"');
  });

  it('names no trade name, no Paris address and no Gmail', () => {
    expect(text).not.toMatch(/Nuri|Rémusat|75016|gmail/i);
  });

  it('keeps the minimum age at 15', () => {
    expect(text).toContain('children under 15');
    expect(text).not.toContain('under 13');
  });
});
