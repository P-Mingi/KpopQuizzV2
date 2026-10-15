import { describe, expect, it } from 'vitest';

import { levelFor, parseResultLevels, PERCENTILE_MIN_ATTEMPTS, percentileShown } from './result-levels';

// SEO Mission 2 part B point 8: a level-result quiz. Fail soft: no levels, nothing changes.

const LEVELS = [
  { min: 0, name: 'Trainee ARMY', blurb: 'The basics.' },
  { min: 40, name: 'Rookie ARMY', blurb: 'A solid start.' },
  { min: 80, name: 'Veteran ARMY', blurb: 'Very few fans score this high.' },
  { min: 100, name: 'Legendary ARMY', blurb: 'A perfect score.' },
];

describe('parseResultLevels', () => {
  it('reads valid levels, lowest first', () => {
    const shuffled = [LEVELS[2], LEVELS[0], LEVELS[3], LEVELS[1]];
    expect(parseResultLevels({ timer: true, result_levels: shuffled })!.map((l) => l.min)).toEqual([0, 40, 80, 100]);
  });

  it.each([
    ['no settings', null],
    ['no levels', { timer: true }],
    ['not an array', { result_levels: 'x' }],
    ['one level', { result_levels: [LEVELS[0]] }],
    ['no level at 0', { result_levels: [LEVELS[1], LEVELS[2]] }],
    ['two levels at the same threshold', { result_levels: [LEVELS[0], { ...LEVELS[1], min: 0 }] }],
    ['a threshold above 100', { result_levels: [LEVELS[0], { ...LEVELS[1], min: 101 }] }],
    ['a fractional threshold', { result_levels: [LEVELS[0], { ...LEVELS[1], min: 40.5 }] }],
    ['an empty name', { result_levels: [LEVELS[0], { ...LEVELS[1], name: '  ' }] }],
    ['a name too long', { result_levels: [LEVELS[0], { ...LEVELS[1], name: 'x'.repeat(41) }] }],
    ['too many levels', { result_levels: Array.from({ length: 9 }, (_, i) => ({ min: i * 10, name: `L${i}`, blurb: 'b' })) }],
  ])('null for %s', (_label, settings) => {
    expect(parseResultLevels(settings)).toBeNull();
  });

  it('strips markup from the texts', () => {
    const l = parseResultLevels({ result_levels: [{ min: 0, name: '<b>Trainee</b> ARMY', blurb: 'ok' }, LEVELS[1]] })!;
    expect(l[0]!.name).toBe('Trainee ARMY');
  });
});

describe('levelFor', () => {
  it('the highest level whose threshold the score meets', () => {
    expect(levelFor(0, LEVELS).name).toBe('Trainee ARMY');
    expect(levelFor(39, LEVELS).name).toBe('Trainee ARMY');
    expect(levelFor(40, LEVELS).name).toBe('Rookie ARMY');
    expect(levelFor(99, LEVELS).name).toBe('Veteran ARMY');
    expect(levelFor(100, LEVELS).name).toBe('Legendary ARMY');
    expect(levelFor(Number.NaN, LEVELS).name).toBe('Trainee ARMY');
  });
});

describe('percentileShown', () => {
  it('a quiz without levels keeps its percentile, whatever its attempts', () => {
    expect(percentileShown(63, { resultLevels: null, attempts: 3 })).toBe(63);
    expect(percentileShown(63, {})).toBe(63);
  });
  it('a level quiz shows it only from 200 attempts', () => {
    expect(percentileShown(63, { resultLevels: LEVELS, attempts: PERCENTILE_MIN_ATTEMPTS - 1 })).toBeNull();
    expect(percentileShown(63, { resultLevels: LEVELS, attempts: PERCENTILE_MIN_ATTEMPTS })).toBe(63);
    expect(percentileShown(null, { resultLevels: LEVELS, attempts: 500 })).toBeNull();
  });
});
