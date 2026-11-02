// CR-021 (owner decision of 2026-11-02): the public reads carry a credit for the pictures that need one (CC BY, CC BY-SA) and none for the others;
// the games draw both without any credit; the form offers the five free licences and asks for an author only where the licence needs one.
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }));

import { photoMetaProblem } from '@/components/admin/photos/ui';
import { imagesOf, picturesOf } from '@/lib/dle/read';

import { toLiveAsset, toPublicPicture } from './public-read';
import { PHOTO_LICENSE_OPTIONS, isFreeLicense } from './slots';

const pic = {
  site_id: 'kpop', kind: 'idol', slug: '5', path: 'kpop/idol/5/a.webp', thumb_path: 'kpop/idol/5/a-96.webp', focal_x: 40, focal_y: 30, needs_credit: true,
  source_url: 'https://commons.wikimedia.org/wiki/File:A.jpg', author: 'Jane', license: 'cc_by', license_note: null, license_url: 'https://creativecommons.org/licenses/by/4.0',
  commons_file: 'File:A.jpg', updated_at: '2026-11-02T00:00:00Z', name: 'Idol',
};
const none = { ...pic, needs_credit: false, source_url: null, author: null, license: null, license_note: null, license_url: null, commons_file: null };

describe('toPublicPicture', () => {
  it('carries the credit of a picture that needs one', () => {
    expect(toPublicPicture(pic)).toMatchObject({
      needsCredit: true, author: 'Jane', license: 'cc_by', sourceUrl: 'https://commons.wikimedia.org/wiki/File:A.jpg', licenseUrl: 'https://creativecommons.org/licenses/by/4.0', commonsFile: 'File:A.jpg',
    });
  });

  it('draws a picture that needs none, with no credit at all', () => {
    expect(toPublicPicture(none)).toMatchObject({ kind: 'idol', name: 'Idol', thumb: expect.stringContaining('a-96.webp'), needsCredit: false, author: null, license: null, sourceUrl: null, licenseUrl: null });
  });

  it('a picture that needs a credit and has no author or licence is dropped, a source page that is not https too, a missing one is fine', () => {
    expect(toPublicPicture({ ...pic, author: null })).toBeNull();
    expect(toPublicPicture({ ...pic, license: 'stolen' })).toBeNull();
    expect(toPublicPicture({ ...pic, source_url: 'http://insecure.org' })).toBeNull();
    expect(toPublicPicture({ ...pic, source_url: null })).toMatchObject({ sourceUrl: null, author: 'Jane' });
    expect(toPublicPicture({ ...pic, license_url: 'javascript:alert(1)' })?.licenseUrl).toBeNull();
    expect(toPublicPicture({ ...pic, path: 'javascript:alert(1)' })).toBeNull();
  });
});

describe('toLiveAsset', () => {
  const live = {
    key: 'banner:kpopdle', type: 'banner', page: 'kpopdle', settings: {}, path: 'hub/b/a-1920.webp', mid_path: null, thumb_path: null, width: 1920, height: 600,
    needs_credit: true, source_url: 'https://commons.wikimedia.org/x', author: 'A', license: 'cc_by', license_note: null, published_at: '2026-11-02T00:00:00Z',
  };
  it('keeps the credit of a CC BY banner and draws a banner that needs none', () => {
    expect(toLiveAsset(live)).toMatchObject({ needsCredit: true, author: 'A', license: 'cc_by' });
    expect(toLiveAsset({ ...live, needs_credit: false, author: null, license: null, source_url: null })).toMatchObject({ needsCredit: false, author: null, license: null, large: expect.stringContaining('a-1920.webp') });
    expect(toLiveAsset({ ...live, author: null })).toBeNull();
  });
});

describe('the games draw no credit', () => {
  it('imagesOf and picturesOf carry the files and the focal point only', () => {
    const asset = toLiveAsset({
      key: 'banner:kpopdle', type: 'banner', page: 'kpopdle', settings: {}, path: 'hub/b/a-1920.webp', mid_path: null, thumb_path: null, width: 1920, height: 600,
      needs_credit: true, source_url: 'https://commons.wikimedia.org/x', author: 'A', license: 'cc_by', license_note: null, published_at: '2026-11-02T00:00:00Z',
    })!;
    const noCredit = toLiveAsset({ ...{ key: 'home:kpopdle', type: 'card_image', page: 'home', settings: {}, path: 'hub/h/a-1920.webp', mid_path: null, thumb_path: null, width: 1, height: 1 }, needs_credit: false, source_url: null, author: null, license: null, license_note: null, published_at: null })!;
    const images = imagesOf([asset, noCredit]);
    expect(Object.keys(images).sort()).toEqual(['banner:kpopdle', 'home:kpopdle']);
    for (const i of Object.values(images)) expect(Object.keys(i).sort()).toEqual(['mid', 'position', 'small', 'src']);
    const pictures = picturesOf([toPublicPicture(pic)!, toPublicPicture(none)!], 'idol');
    expect(Object.keys(pictures)).toEqual(['5']);
    expect(Object.keys(pictures['5']!).sort()).toEqual(['position', 'url']);
  });
});

describe('the form', () => {
  it('offers the five free licences, in this order', () => {
    expect(PHOTO_LICENSE_OPTIONS.map((o) => o.value)).toEqual(['cc0', 'public_domain', 'cc_by', 'cc_by_sa', 'other']);
    expect(['cc0', 'public_domain', 'cc_by', 'cc_by_sa', 'other'].every(isFreeLicense)).toBe(true);
    expect(['own_photo', 'licensed', '', undefined].some(isFreeLicense)).toBe(false);
  });

  it('asks for an author only for CC BY and CC BY-SA, for the licence\'s name for other, and for an https source page when one is given', () => {
    const m = (over: Record<string, string>) => ({ source: '', author: '', license: 'cc0' as const, note: '', ...over }) as Parameters<typeof photoMetaProblem>[0];
    expect(photoMetaProblem(m({}))).toBeNull();
    expect(photoMetaProblem(m({ license: 'public_domain' }))).toBeNull();
    expect(photoMetaProblem(m({ license: 'cc_by' }))).toMatch(/auteur/);
    expect(photoMetaProblem(m({ license: 'cc_by_sa', author: 'Jane' }))).toBeNull();
    expect(photoMetaProblem(m({ license: 'other' }))).toMatch(/licence/i);
    expect(photoMetaProblem(m({ license: 'other', note: 'GFDL' }))).toBeNull();
    expect(photoMetaProblem(m({ license: '' }))).toMatch(/licence/i);
    expect(photoMetaProblem(m({ license: 'own_photo' }))).toMatch(/licence/i);
    expect(photoMetaProblem(m({ source: 'http://x.org' }))).toMatch(/https/);
    expect(photoMetaProblem(m({ source: 'not a url' }))).toMatch(/https/);
    expect(photoMetaProblem(m({ source: 'https://example.org/p' }))).toBeNull();
  });
});
