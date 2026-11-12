import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({ createServiceRoleClient: () => ({}) }));

import { cardImage } from './catalog';

const base = 'https://x.supabase.co';
const photo = {
  id: 1, slot: 1, source: 'commons' as const, source_page: 'p', author: 'A', author_url: null, licence: 'CC BY 4.0', licence_url: 'l',
  share_alike: false, modified: 'm', focal_x: 50, focal_y: 30, storage_path: 'jennie', source_path: 'images/group-photos/jennie.jpg',
  file_focal_x: 50 as number | null, file_focal_y: 30 as number | null, small_2x: false,
};

describe('the art of a card', () => {
  it('uses the published WebP files while they were cut at the current focal point', () => {
    expect(cardImage(photo, base)).toEqual({
      url: `${base}/storage/v1/object/public/cards/jennie-1x.webp`, url2x: `${base}/storage/v1/object/public/cards/jennie-2x.webp`,
      css: false, small2x: false, focalX: 50, focalY: 30,
    });
  });
  it('falls back to the source photo cropped in CSS as soon as the focal point moved, so nothing is ever broken', () => {
    expect(cardImage({ ...photo, focal_x: 60 }, base)).toEqual({
      url: `${base}/storage/v1/object/public/images/group-photos/jennie.jpg`, url2x: null, css: true, small2x: false, focalX: 60, focalY: 30,
    });
  });
  it('falls back too when no file was published or its focal point is unknown', () => {
    expect(cardImage({ ...photo, storage_path: null }, base).css).toBe(true);
    expect(cardImage({ ...photo, file_focal_x: null, file_focal_y: null }, base).css).toBe(true);
  });
  it('a photo too small for 2x offers no 2x file', () => {
    const i = cardImage({ ...photo, small_2x: true }, base);
    expect(i.url2x).toBeNull();
    expect(i.small2x).toBe(true);
    expect(i.url).toMatch(/jennie-1x\.webp$/);
  });
  it('with neither a file nor a source the url is null (the page shows its placeholder)', () => {
    expect(cardImage({ ...photo, storage_path: null, source_path: null }, base).url).toBeNull();
  });
});
