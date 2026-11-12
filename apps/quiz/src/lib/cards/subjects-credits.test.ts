// Bunnyverse Cards, lane DATA: docs/design/cards/data/subjects.json holds the 59 photos of the October run with a complete credit, and
// agrees with src/lib/ux-v1/a0/group-photo-credits.ts (same slugs, author, licence, licence url, Commons page).
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { GROUP_PHOTO_CREDITS } from '@/lib/ux-v1/a0/group-photo-credits';

import { CARDS_SQL } from './sql-harness';

interface S {
  slug: string; kind: string; focal: { x: number; y: number }; crop_width: number; small_2x: boolean;
  photo: { source: string; bucket: string; path: string; width: number; height: number; commons_page: string; author: string; licence: string; licence_url: string; share_alike: boolean };
}
const subjects = JSON.parse(readFileSync(path.join(CARDS_SQL, '../../design/cards/data/subjects.json'), 'utf8')) as S[];
const PEOPLE = ['bibi', 'chungha', 'heize', 'hwasa', 'hyuna', 'iu', 'jay-park', 'jennie', 'jeon-somi', 'jimin', 'jungkook', 'psy', 'rose', 'sunmi', 'taeyang', 'taeyeon', 'v-bts', 'zico'];

describe('subjects.json', () => {
  it('has the 59 subjects: 18 people and 41 groups', () => {
    expect(subjects.length).toBe(59);
    expect(new Set(subjects.map((s) => s.slug)).size).toBe(59);
    expect(subjects.filter((s) => s.kind === 'idol').map((s) => s.slug)).toEqual(PEOPLE);
    expect(subjects.filter((s) => s.kind === 'group').length).toBe(41);
  });

  it.each(subjects.map((s) => [s.slug, s] as const))('%s has a complete credit that matches the credits file', (slug, s) => {
    const c = GROUP_PHOTO_CREDITS[slug];
    expect(c).toBeDefined();
    expect(s.photo.author.trim().length).toBeGreaterThan(0);
    expect(s.photo.licence).toMatch(/^CC BY(-SA)? \d\.\d$/);
    expect(s.photo.licence_url).toMatch(/^https:\/\/creativecommons\.org\/licenses\/by(-sa)?\/\d\.\d$/);
    expect(s.photo.commons_page).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
    expect(s.photo.share_alike).toBe(s.photo.licence.includes('-SA'));
    expect(s.photo).toMatchObject({ source: 'commons', bucket: 'images', path: `group-photos/${slug}.jpg` });
    expect(c!.author).toBe(s.photo.author);
    expect(c!.license).toBe(s.photo.licence);
    expect(c!.licenseUrl).toBe(s.photo.licence_url);
    expect(c!.page).toBe(s.photo.commons_page);
    expect(s.focal).toEqual(s.kind === 'idol' ? { x: 50, y: 30 } : { x: 50, y: 50 });
    expect(s.small_2x).toBe(s.crop_width < 640);
  });

  it('flags 41 photos as too small for 2x', () => {
    expect(subjects.filter((s) => s.small_2x).length).toBe(41);
  });
});
