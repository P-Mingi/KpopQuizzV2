// Bunnyverse Cards lot 3: the pure rules of scripts/cards/verify-photos.mts (owner decision "one edition, one photo", integrator brief part A):
// the licences, the author, the deletion requests, the open licence reviews, the dates, the repeated occasions, the age rule on each photo's
// date, the review reasons, the slots. No network: the Commons answers are written here. No real birth date: the people are made up.
import { describe, expect, it } from 'vitest';

import {
  artistOf, checkSubject, dayOf, deletionFlag, licenceOk, peopleOf, reviewOpen, sameOccasion, shareAlike,
  type Candidate, type CommonsInfo,
} from './photo-checks';

const info = (title: string, o: Partial<CommonsInfo> = {}): CommonsInfo => ({
  title, missing: false, url: `https://upload.wikimedia.org/x/${encodeURIComponent(title)}`, width: 3000, height: 4000, sha1: `sha-${title}`,
  mime: 'image/jpeg', artist: '<a href="//commons.wikimedia.org/wiki/User:Lens">Lens Person</a>', artistUrl: null, licence: 'CC BY-SA 4.0',
  licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0', dateOriginal: null, categories: [], templates: [], ...o,
});
const cand = (file: string, o: Partial<Candidate> = {}): Candidate => ({
  source: 'commons', page: `https://commons.wikimedia.org/wiki/File:${file.replace(/ /g, '_')}`, file, width: 3000, height: 4000,
  date: '2024-05-10', event: `Event of ${file}`, stage: false, focal: { x: 50, y: 30 }, quality: 4, ...o,
});
const ADULT = { birth_date: '1990-01-01', birth_precision: 'day' as const, joined: null, left: null, current: true };
const soloist = { slug: 'solo', kind: 'idol' as const, lineup_complete: true, people: [ADULT] };
// A group whose youngest member turns 18 on 2024-03-01 (a made-up date).
const group = { slug: 'grp', kind: 'group' as const, lineup_complete: true, people: [ADULT, { ...ADULT, birth_date: '2006-03-01' }] };

describe('verify-photos: the licence and the credit', () => {
  it('accepts CC0, public domain, CC BY, CC BY-SA and KOGL Type 1, never NC or ND', () => {
    for (const l of ['CC0', 'CC0 1.0', 'Public domain', 'CC BY 2.0', 'CC BY-SA 4.0', 'CC BY-SA 3.0 igo', 'KOGL Type 1']) expect(licenceOk(l)).toBe(true);
    for (const l of [null, '', 'CC BY-NC 2.0', 'CC BY-ND 4.0', 'CC BY-NC-SA 2.0', 'GFDL', 'All rights reserved']) expect(licenceOk(l)).toBe(false);
    expect(shareAlike('CC BY-SA 4.0')).toBe(true);
    expect(shareAlike('CC BY 4.0')).toBe(false);
  });
  it('reads the author from the Artist HTML, and refuses an unknown one', () => {
    expect(artistOf('<a href="//commons.wikimedia.org/wiki/User:Lens">Lens Person</a>')).toEqual({ name: 'Lens Person', url: 'https://commons.wikimedia.org/wiki/User:Lens' });
    expect(artistOf('Unknown').name).toBeNull();
    expect(artistOf(null).name).toBeNull();
  });
  it('finds a deletion request or a missing permission, and an open licence review', () => {
    expect(deletionFlag(['Category:Deletion requests November 2026'], [])).toMatch(/Deletion requests/);
    expect(deletionFlag([], ['Template:Copyvio'])).toBe('Template:Copyvio');
    expect(deletionFlag(['Category:Media missing permission as of 1 November 2026'], [])).toBeTruthy();
    expect(deletionFlag(['Category:IU in 2024'], ['Template:Information'])).toBeNull();
    expect(reviewOpen(['Category:License review needed'])).toBe(true);
    expect(reviewOpen(['Category:Flickr images needing human review'])).toBe(true);
    expect(reviewOpen(['Category:Flickr images reviewed by FlickreviewR 2'])).toBe(false);
  });
});

describe('verify-photos: dates and occasions', () => {
  it('reads a day or a month at the start of a date', () => {
    expect(dayOf('2023-05-12 19:22:01')).toEqual({ date: '2023-05-12', precision: 'day' });
    expect(dayOf('<time>2023-05-12</time>')).toEqual({ date: '2023-05-12', precision: 'day' });
    expect(dayOf('2023-05')).toEqual({ date: '2023-05', precision: 'month' });
    expect(dayOf('May 2023')).toBeNull();
  });
  it('treats the same day as the same occasion unless two different events are named, and the same file always', () => {
    const a = { date: '2024-05-10', event: 'Dream Concert, Busan', sha1: 'x' };
    expect(sameOccasion(a, { date: '2024-05-10', event: 'Dream Concert Busan', sha1: 'y' })).toBe(true);
    expect(sameOccasion(a, { date: '2024-05-10', event: null, sha1: 'y' })).toBe(true);
    expect(sameOccasion(a, { date: '2024-05-10', event: 'Airport, Incheon', sha1: 'y' })).toBe(false);
    expect(sameOccasion(a, { date: '2024-05-11', event: 'Dream Concert, Busan', sha1: 'y' })).toBe(false);
    expect(sameOccasion(a, { date: '2019-01-01', event: 'Other', sha1: 'x' })).toBe(true);
  });
  it('confirms a birth date with a second agreeing source, and gives a former member her leaving date', () => {
    const row = { slug: 'grp', kind: 'group' as const, lineup_complete: true, people: [
      { ...ADULT, name: 'One', qid: 'Q1', agree: false }, { ...ADULT, name: 'Two', qid: 'Q2', agree: false }, { ...ADULT, name: 'Three', birth_date: null, current: true }] };
    const out = peopleOf(row, [{ slug: 'grp', name: 'One', qid: 'Q1', agrees: true }, { slug: 'grp', name: 'Two', qid: 'Q2', agrees: false }, { slug: 'grp', name: 'Three', left: '2009' }]);
    expect(out.map((p) => p.birth_confirmed)).toEqual([true, false, true]);
    expect(out[2]).toMatchObject({ left: '2009-12-31', left_precision: 'year', current: false });
  });
});

describe('verify-photos: one subject', () => {
  const titles = (cs: Candidate[]) => new Map(cs.map((c) => [`File:${c.file}`, info(`File:${c.file}`)]));
  it('auto approves a clean Commons photo, sends the doubtful ones to the owner, and leaves the bad ones out', () => {
    const cs = [
      cand('Clean.jpg'),
      cand('Review.jpg', { date: '2024-06-01', licence_review_pending: true }),
      cand('Month.jpg', { date: '2024-07' }),
      cand('Nc.jpg', { date: '2024-08-01' }),
      cand('Gone.jpg', { date: '2024-09-01' }),
      cand('Same day.jpg', { date: '2024-05-10', event: 'Event of Clean.jpg' }),
      cand('Flickr', { source: 'flickr', file: null, page: 'https://www.flickr.com/photos/x/1', date: '2024-10-01' }),
    ];
    const map = titles(cs);
    map.set('File:Nc.jpg', info('File:Nc.jpg', { licence: 'CC BY-NC 2.0' }));
    map.set('File:Gone.jpg', info('File:Gone.jpg', { missing: true, url: null }));
    const out = checkSubject({ slug: 'solo', kind: 'idol', existing: null, candidates: cs, info: map, research: soloist, confirm: [], today: '2026-11-13' });
    const st = Object.fromEntries(out.map((p) => [p.file ?? p.page, p.status]));
    expect(st).toEqual({ 'Clean.jpg': 'auto', 'Review.jpg': 'pending', 'Month.jpg': 'pending', 'Nc.jpg': 'out', 'Gone.jpg': 'out', 'Same day.jpg': 'out', 'https://www.flickr.com/photos/x/1': 'out' });
    expect(out.find((p) => p.file === 'Review.jpg')!.review).toEqual(['the licence review is still open on Commons']);
    expect(out.find((p) => p.file === 'Same day.jpg')!.reasons[0]).toMatch(/same photo occasion as slot 1/);
    expect(out.filter((p) => p.status !== 'out').map((p) => p.slot)).toEqual([1, 2, 3]);
    expect(out.find((p) => p.file === 'Clean.jpg')).toMatchObject({ author: 'Lens Person', sha1: 'sha-File:Clean.jpg', width: 3000, full_ok: true });
  });
  it('applies the age rule on each photo date: a group photo from before its youngest member turned 18 is out', () => {
    const cs = [cand('Old.jpg', { date: '2024-02-28' }), cand('New.jpg', { date: '2024-03-01' })];
    const out = checkSubject({ slug: 'grp', kind: 'group', existing: null, candidates: cs, info: titles(cs), research: group, confirm: [], today: '2026-11-13' });
    expect(out.map((p) => [p.file, p.status, p.age.reason])).toEqual([['Old.jpg', 'out', 'minor_at_photo'], ['New.jpg', 'auto', null]]);
  });
  it('sends a group photo without the whole lineup to the owner, and computes the pair halves', () => {
    const cs = [cand('Part.jpg', { lineup_full: false, width: 3000, height: 2000 })];
    const out = checkSubject({ slug: 'grp', kind: 'group', existing: null, candidates: cs, info: new Map([['File:Part.jpg', info('File:Part.jpg', { width: 3000, height: 2000 })]]), research: group, confirm: [], today: '2026-11-13' });
    expect(out[0]).toMatchObject({ status: 'pending', review: ['not the whole lineup of that date'], window_width: 2588, full_ok: true });
    expect(out[0]!.halves).toEqual([{ part: 1, width: 1294, small_2x: false }, { part: 2, width: 1294, small_2x: false }]);
  });
  it('keeps at most six photos a subject', () => {
    const cs = Array.from({ length: 8 }, (_, i) => cand(`P${i}.jpg`, { date: `2024-0${i + 1}-10` }));
    const out = checkSubject({ slug: 'solo', kind: 'idol', existing: null, candidates: cs, info: titles(cs), research: soloist, confirm: [], today: '2026-11-13' });
    expect(out.filter((p) => p.status !== 'out')).toHaveLength(6);
    expect(out.filter((p) => p.reasons.includes('six photos already'))).toHaveLength(2);
  });
  it('without a lineup row, every photo is out (fails closed)', () => {
    const cs = [cand('X.jpg')];
    const out = checkSubject({ slug: 'solo', kind: 'idol', existing: null, candidates: cs, info: titles(cs), research: null, confirm: [], today: '2026-11-13' });
    expect(out[0]).toMatchObject({ status: 'out', age: { ok: false, reason: 'unknown_lineup' } });
  });
});
