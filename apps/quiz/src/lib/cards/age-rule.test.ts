// Bunnyverse Cards lot 2: the age rule (integrator, 2026-11-12). A card exists only when every person in the photo is 18 or older today and
// was 18 or older on the photo date; for a group the people in the photo are the lineup on that date; current members must be adults today.
// Synthetic people only: no real person's data in the repository.
import { describe, expect, it } from 'vitest';

import { ageVerdict, dateRange, eighteenthBirthday, inLineupOn, type AgeInput, type LineupPerson } from './age-rule';

const TODAY = '2026-11-12';
const person = (birth: string | null, extra: Partial<LineupPerson> = {}): LineupPerson => ({
  birth_date: birth, birth_precision: birth ? 'day' : null, joined: null, left: null, current: true, ...extra,
});
const solo = (birth: string | null, photo: string, extra: Partial<LineupPerson> = {}): AgeInput => ({
  kind: 'idol', photo_date: photo, lineup_complete: true, people: [person(birth, extra)],
});
const group = (photo: string, people: LineupPerson[], complete = true): AgeInput => ({ kind: 'group', photo_date: photo, lineup_complete: complete, people });
const day = (iso: string): number => (dateRange(iso, 'day') as [number, number])[0];

describe('the age rule: today and the photo date', () => {
  it('keeps a soloist who was an adult on the photo date', () => {
    expect(ageVerdict(solo('1993-05-16', '2025-07-18'), TODAY)).toEqual({ ok: true });
  });

  it('leaves out a soloist who is an adult today but was a minor on the photo date', () => {
    expect(ageVerdict(solo('2001-03-09', '2017-07-01'), TODAY)).toEqual({ ok: false, reason: 'minor_at_photo' });
  });

  it('leaves out a person under 18 today (and so on the photo date)', () => {
    expect(ageVerdict(solo('2009-01-01', '2026-01-07'), TODAY)).toEqual({ ok: false, reason: 'minor_today' });
  });

  it('counts the 18th birthday itself as adult, the day before as minor', () => {
    expect(ageVerdict(solo('2000-04-20', '2018-04-20'), TODAY)).toEqual({ ok: true });
    expect(ageVerdict(solo('2000-04-21', '2018-04-20'), TODAY)).toEqual({ ok: false, reason: 'minor_at_photo' });
    expect(ageVerdict(solo('2008-11-12', '2026-11-12'), TODAY)).toEqual({ ok: true });
    expect(ageVerdict(solo('2008-11-13', '2026-11-12'), TODAY)).toEqual({ ok: false, reason: 'minor_today' });
  });

  it('turns a 29 February birthday 18 on 1 March of a common year', () => {
    expect(eighteenthBirthday(day('2004-02-29'))).toBe(day('2022-03-01'));
    expect(ageVerdict(solo('2004-02-29', '2022-02-28'), TODAY)).toEqual({ ok: false, reason: 'minor_at_photo' });
    expect(ageVerdict(solo('2004-02-29', '2022-03-01'), TODAY)).toEqual({ ok: true });
  });

  it('reads an unsure birth date as the latest day it can mean (the youngest)', () => {
    // born some day of June 2000: 18 for sure only from 30 June 2018
    expect(ageVerdict(solo('2000-06-01', '2018-06-15', { birth_precision: 'month' }), TODAY)).toEqual({ ok: false, reason: 'minor_at_photo' });
    expect(ageVerdict(solo('2000-06-01', '2018-06-30', { birth_precision: 'month' }), TODAY)).toEqual({ ok: true });
    expect(ageVerdict(solo('2000-01-01', '2018-12-30', { birth_precision: 'year' }), TODAY)).toEqual({ ok: false, reason: 'minor_at_photo' });
    expect(ageVerdict(solo('2000-01-01', '2018-12-31', { birth_precision: 'year' }), TODAY)).toEqual({ ok: true });
  });

  it('leaves out a subject with an unknown birth date, lineup or photo date', () => {
    expect(ageVerdict(solo(null, '2020-01-01'), TODAY)).toEqual({ ok: false, reason: 'unknown_birth_date' });
    expect(ageVerdict(solo('2000-02-30', '2020-01-01'), TODAY)).toEqual({ ok: false, reason: 'unknown_birth_date' });
    expect(ageVerdict({ ...solo('1990-01-01', '2020-01-01'), photo_date: null }, TODAY)).toEqual({ ok: false, reason: 'unknown_photo_date' });
    expect(ageVerdict(solo('1990-01-01', '2027-01-01'), TODAY)).toEqual({ ok: false, reason: 'unknown_photo_date' });
    expect(ageVerdict(group('2020-01-01', [person('1990-01-01')], false), TODAY)).toEqual({ ok: false, reason: 'unknown_lineup' });
    expect(ageVerdict(group('2020-01-01', []), TODAY)).toEqual({ ok: false, reason: 'unknown_lineup' });
    expect(ageVerdict({ ...solo('1990-01-01', '2020-01-01'), people: [person('1990-01-01'), person('1991-01-01')] }, TODAY)).toEqual({ ok: false, reason: 'unknown_lineup' });
  });

  it('refuses a malformed today', () => {
    expect(() => ageVerdict(solo('1990-01-01', '2020-01-01'), '12/11/2026')).toThrow();
  });
});

describe('the age rule: a group photo is its lineup on the photo date', () => {
  it('leaves out a group whose lineup on the photo date had a minor, even when everyone is an adult today', () => {
    const lineup = [person('1995-02-01'), person('2002-02-05'), person('1996-08-01')];
    expect(ageVerdict(group('2018-04-20', lineup), TODAY)).toEqual({ ok: false, reason: 'minor_at_photo' });
  });

  it('ignores a member who had left before the photo, and one who joined after it', () => {
    const lineup = [
      person('1995-02-01'),
      person('2003-01-01', { left: '2017-12-31', current: false }),
      person('2005-01-01', { joined: '2024-06-01' }),
    ];
    expect(ageVerdict(group('2019-01-06', lineup), TODAY)).toEqual({ ok: true });
  });

  it('counts a member who left after the photo, or on its day, as in the photo', () => {
    const left = person('2003-01-01', { left: '2019-01-06', current: false });
    expect(inLineupOn(left, dateRange('2019-01-06', 'day') as [number, number])).toBe(true);
    expect(ageVerdict(group('2019-01-06', [person('1995-02-01'), left]), TODAY)).toEqual({ ok: false, reason: 'minor_at_photo' });
  });

  it('counts a member whose join or leave date is unsure as in the photo', () => {
    // joined some day of January 2019: maybe before a photo of 6 January
    const unsure = person('2003-01-01', { joined: '2019-01-01', joined_precision: 'month' });
    expect(ageVerdict(group('2019-01-06', [person('1995-02-01'), unsure]), TODAY)).toEqual({ ok: false, reason: 'minor_at_photo' });
    const unreadable = person('2003-01-01', { joined: 'early 2019' });
    expect(inLineupOn(unreadable, dateRange('2010-01-01', 'day') as [number, number])).toBe(true);
  });

  it('leaves out a group with a current member under 18 today, even one who is not in the photo', () => {
    const lineup = [person('1995-02-01'), person('2010-03-03', { joined: '2025-01-01' })];
    expect(ageVerdict(group('2019-01-06', lineup), TODAY)).toEqual({ ok: false, reason: 'minor_today' });
  });

  it('leaves out a group with an unknown birth date in the photo or among the current members, not among former members', () => {
    expect(ageVerdict(group('2019-01-06', [person('1995-02-01'), person(null)]), TODAY)).toEqual({ ok: false, reason: 'unknown_birth_date' });
    const formerUnknown = person(null, { left: '2015-01-01', current: false });
    expect(ageVerdict(group('2019-01-06', [person('1995-02-01'), formerUnknown]), TODAY)).toEqual({ ok: true });
  });

  it('leaves out a group whose photo predates every member (the lineup cannot be read)', () => {
    expect(ageVerdict(group('2010-01-01', [person('1990-01-01', { joined: '2015-01-01' })]), TODAY)).toEqual({ ok: false, reason: 'unknown_lineup' });
  });
});
