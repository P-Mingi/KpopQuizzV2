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

// Lot 7: the choice 2 or 3 cards of a group photo, the previews and the warning.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { PartsChoice, PartsPreview, halfImgStyle, partCropWidth, partsOf, partsTooSmall, partsWarningFor, windowRatio } from './cards-panel';

describe('the thirds of a group photo in the preview', () => {
  it('part 1 at 0, part 2 at -100 %, part 3 at -200 %, the picture parts x 100 % wide and never shrunk by the reset', () => {
    expect(([1, 2, 3] as const).map((p) => halfImgStyle(p, [50, 30], 3).left)).toEqual([0, '-100%', '-200%']);
    expect(halfImgStyle(2, [50, 30], 3)).toMatchObject({ width: '300%', maxWidth: 'none', objectPosition: '50% 30%' });
  });
  it('a pair keeps its halves exactly as before', () => {
    expect(halfImgStyle(1, [10, 20])).toMatchObject({ left: 0, width: '200%', maxWidth: 'none' });
    expect(halfImgStyle(2, [10, 20])).toMatchObject({ left: '-100%', width: '200%' });
  });
  it('the window is 11:8.5 for 2 cards and 16.5:8.5 for 3, and each card is a share of it', () => {
    expect([windowRatio(2), windowRatio(3)]).toEqual([110 / 85, 165 / 85]);
    expect(partCropWidth(1650, 850, 3)).toBe(550);
    expect(partCropWidth(1200, 675, 2)).toBe(436);
    expect(partsOf({ parts: null })).toBe(2);
    expect(partsOf({ parts: 3 })).toBe(3);
  });
  it('flags every card too narrow for the 2x, from the picture for the chosen number', () => {
    expect(partsTooSmall({ parts: 2 }, [1200, 675], 3)).toEqual([true, true, true]);
    expect(partsTooSmall({ parts: 2 }, [4000, 2000], 3)).toEqual([false, false, false]);
  });
});

describe('the choice and its previews', () => {
  it('offers 2 and 3 cards, the one chosen pressed, the note and the warning shown', () => {
    const html = renderToStaticMarkup(h(PartsChoice, { parts: 3, busy: false, note: 'La règle : 3 cartes.', warning: 'Quelqu\'un serait coupé.', onChoose: () => undefined }));
    expect(html).toMatch(/aria-pressed="false"[^>]*>2 cartes/);
    expect(html).toMatch(/aria-pressed="true"[^>]*>3 cartes/);
    expect(html).toContain('La règle : 3 cartes.');
    expect(html).toContain('Quelqu&#x27;un serait coupé.');
  });
  it('the preview shows the window, one slice per card and the panorama', () => {
    const three = renderToStaticMarkup(h(PartsPreview, { src: 'https://p/x.jpg', pos: [50, 30], parts: 3, small: [false, true, false] }));
    expect(three.match(/aria-label="Carte \d\/3"/g)?.length).toBe(3);
    expect(three).toContain('left:-200%');
    expect(three).toContain('aspect-ratio:165 / 85');
    expect(three).toContain('aria-label="Panorama"');
    expect(three.match(/trop petite pour le 2x/g)?.length).toBe(1);
    const two = renderToStaticMarkup(h(PartsPreview, { src: 'https://p/x.jpg', pos: [50, 30], parts: 2, small: [false, false] }));
    expect(two.match(/aria-label="Carte \d\/2"/g)?.length).toBe(2);
    expect(two).toContain('aspect-ratio:110 / 85');
  });
  it('warns when the chosen window cuts someone at the focal point on screen, and not when it keeps everyone', () => {
    const box = { x0: 6, x1: 94, y0: 20, y1: 85, hw: 7 };
    expect(partsWarningFor({ heads_box: box }, [1200, 675], 2, [50, 50])).toContain('coupe quelqu');
    expect(partsWarningFor({ heads_box: box }, [1650, 850], 3, [50, 50])).toBeNull();
    expect(partsWarningFor({ heads_box: null }, [1200, 675], 2, [50, 50])).toBeNull();
  });
  it('the admin copy holds no em or en dash', () => {
    const src = readFileSync(join(__dirname, 'cards-panel.tsx'), 'utf8');
    expect(new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`).test(src)).toBe(false);
  });
});
