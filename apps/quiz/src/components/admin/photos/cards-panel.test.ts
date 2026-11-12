// Bunnyverse Cards, review 1 finding 6: the Cartes tab of the photos admin (bunnyverse.org/anime) holds the reports inbox, the removal of a
// photo and the lock reason of the missing editions. Static renders of the pieces (the tab loads its rows after hydration).
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { LOCK_SENTENCES } from '@/lib/cards/rules';

import { LOCK_CHOICES, LockEditor, RemovePhoto, ReportsInbox, entityOf } from './cards-panel';

import type { CardReportRow } from './cards-panel';

const REPORTS: CardReportRow[] = [
  {
    id: 7, role: 'person', message: 'Please remove this photo of me.', contact: 'me@example.org', created_at: '2026-11-12T08:00:00Z', status: 'open',
    card: { n: 42, num: 'BV1-0042', entity: 'idol:jennie', name: 'Jennie' },
    photo: { id: 12, entity: 'idol:jennie', url: 'https://x.supabase.co/storage/v1/object/public/images/group-photos/jennie.jpg', author: 'K-POPIT', licence: 'CC BY 3.0', status: 'approved' },
  },
  { id: 8, role: 'other', message: 'A credit is wrong.', contact: null, created_at: '2026-11-12T09:00:00Z', status: 'open', card: null, photo: null },
];

describe('the reports inbox', () => {
  it('shows each open report with its card, its photo, the message, the contact and a close button', () => {
    const html = renderToStaticMarkup(h(ReportsInbox, { rows: REPORTS, busy: null, onClose: () => undefined }));
    expect(html).toContain('BV1-0042 · Jennie');
    expect(html).toContain('src="https://x.supabase.co/storage/v1/object/public/images/group-photos/jennie.jpg"');
    expect(html).toContain('Please remove this photo of me.');
    expect(html).toContain('Contact : me@example.org');
    expect(html).toContain('K-POPIT (CC BY 3.0)');
    expect(html).toContain('Signalement général');
    expect(html.match(/Clore le signalement/g)?.length).toBe(2);
  });
  it('says when nothing is open, and the button of the report being closed is disabled', () => {
    expect(renderToStaticMarkup(h(ReportsInbox, { rows: [], busy: null, onClose: () => undefined }))).toContain('Aucun signalement ouvert.');
    expect(renderToStaticMarkup(h(ReportsInbox, { rows: REPORTS, busy: 7, onClose: () => undefined }))).toMatch(/<button[^>]*disabled=""[^>]*>Fermeture<\/button>/);
  });
});

describe('the lock reason of Era and Full Art', () => {
  it('offers the five reasons, hiatus included, shows the stored one and the sentence the player reads', () => {
    const html = renderToStaticMarkup(h(LockEditor, { lockReasons: { L: 'hiatus' }, busy: false, onSet: () => undefined }));
    expect(LOCK_CHOICES.map((c) => c.value)).toEqual(['one', 'sameday', 'newg', 'hiatus', 'crop']);
    expect(html).toContain('Era (SR)');
    expect(html).toContain('Full Art (L)');
    expect(html).toMatch(/<option value="hiatus" selected="">En pause \(hiatus\)<\/option>/);
    expect(html).toContain(LOCK_SENTENCES.hiatus.replace(/'/g, '&#x27;'));
    expect(html).toContain(LOCK_SENTENCES.one);
  });
  it('reads the lock reasons of an embedded entity, object or one-row array', () => {
    expect(entityOf({ cards_entities: { name: 'BTOB', lock_reasons: { SR: 'one' } } })?.lock_reasons).toEqual({ SR: 'one' });
    expect(entityOf({ cards_entities: [{ name: 'BTOB' }] })?.name).toBe('BTOB');
    expect(entityOf({ cards_entities: null })).toBeNull();
  });
});

describe('removing a photo', () => {
  it('starts with one button; the removal itself needs a second click', () => {
    const html = renderToStaticMarkup(h(RemovePhoto, { busy: false, onRemove: () => undefined }));
    expect(html).toContain('Retirer la photo');
    expect(html).not.toContain('Confirmer le retrait');
  });
});
