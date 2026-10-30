// Hub, Hot right now (owner decision 2026-10-30): a quiz without its own cover shows the photo of its group (K-pop) or series (anime) as
// its own site shows it, else the initials. The photo is the one the site's own function gives (groupPhotoUrl for kpopquiz.org,
// seriesPhotoOf for OtakuQuiz), never another; an anime photo that asks for a credit line keeps the initials. kpopquiz.org is untouched.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setOwnerSeriesPictures } from '@/lib/anime/entity-images-store';
import { seriesImageOf } from '@/lib/anime/series-images';
import { GROUP_PHOTO_SLUGS, groupPhotoUrl } from '@/lib/ux-v1/a0/group-photos';

import { groupPhotoOf } from './home-photo';

import type { OwnerPicture } from '@/lib/anime/entity-images-rules';

const owner = (over: Partial<OwnerPicture> = {}): OwnerPicture => ({
  src: 'https://sb.example.supabase.co/storage/v1/object/public/entity-images/series/naruto.webp?v=1', src2x: null, width: 736, height: 981,
  position: '50% 50%', credit: null, ...over,
});

afterEach(() => { setOwnerSeriesPictures({}); vi.unstubAllEnvs(); });

describe('a K-pop quiz', () => {
  it('shows the group photo kpopquiz.org shows: the same function, for every group that has a file', () => {
    for (const slug of GROUP_PHOTO_SLUGS) expect(groupPhotoOf('kpop', slug)).toBe(groupPhotoUrl(slug));
    expect(groupPhotoOf('kpop', 'bts')).toBe('/idols/BTS.jpg');
    expect(groupPhotoOf('kpop', 'stray-kids')).toBe('/idols/Stray%20Kids.jpg');
  });

  it('else the Commons photo in Storage, in the same order as kpopquiz.org; else none', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://sb.example.supabase.co');
    expect(groupPhotoOf('kpop', 'akmu')).toBe('https://sb.example.supabase.co/storage/v1/object/public/images/group-photos/akmu.jpg');
    expect(groupPhotoOf('kpop', 'akmu')).toBe(groupPhotoUrl('akmu'));
    expect(groupPhotoOf('kpop', 'no-such-group')).toBeNull();
    expect(groupPhotoOf('kpop', '')).toBeNull();
    expect(groupPhotoOf('kpop', null)).toBeNull();
  });
});

describe('an anime quiz', () => {
  beforeEach(() => { setOwnerSeriesPictures({}); });

  it('shows the free photo OtakuQuiz shows for its series (same file; no credit asked)', () => {
    const bundled = seriesImageOf('frieren');
    expect(bundled?.attribution ?? null).toBeNull();
    expect(groupPhotoOf('anime', 'frieren')).toBe(bundled!.file);
    expect(groupPhotoOf('anime', 'frieren')).toBe('/series/frieren.webp');
  });

  it('shows the owner\'s upload first, as OtakuQuiz does, when its licence asks for no credit line', () => {
    setOwnerSeriesPictures({ frieren: owner({ src: 'https://sb.example.supabase.co/storage/v1/object/public/entity-images/series/frieren.webp?v=2' }) });
    expect(groupPhotoOf('anime', 'frieren')).toBe('https://sb.example.supabase.co/storage/v1/object/public/entity-images/series/frieren.webp?v=2');
  });

  it('keeps the initials for a photo OtakuQuiz shows with a credit line (CC BY, CC BY-SA): a row has no room for the credit', () => {
    setOwnerSeriesPictures({ frieren: owner({ credit: { author: 'A. Photographer', license: 'CC BY', licenseUrl: 'https://creativecommons.org/share-your-work/cclicenses/', sourceUrl: 'https://example.org/p' } }) });
    expect(groupPhotoOf('anime', 'frieren')).toBeNull();
  });

  it('keeps the initials for a series with no photo, and never reads a K-pop group photo', () => {
    expect(groupPhotoOf('anime', 'no-such-series')).toBeNull();
    expect(groupPhotoOf('anime', 'bts')).toBeNull();
    expect(groupPhotoOf('anime', '')).toBeNull();
  });
});
