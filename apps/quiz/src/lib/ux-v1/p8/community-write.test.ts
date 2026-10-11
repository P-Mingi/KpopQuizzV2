import { afterEach, describe, expect, it, vi } from 'vitest';

import { isNsfw } from '@/lib/moderation/nsfw';

// Community posts (owner, 2026-10-06): which writes the /api/verse gate lets through, which
// photo a post may carry, and the NSFW verdict. No database: the branches that would read
// a row are not reached here.

const USER = '0b8f6b8e-1111-4c4c-8d8d-123456789abc';
const OTHER = '9d9d9d9d-2222-4c4c-8d8d-cba987654321';
const PHOTO = `community/${USER}/5f3c2b1a-0000-4000-8000-000000000001.jpg`;

async function load(v12: boolean): Promise<typeof import('./community-write')> {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_UX_V1', v12 ? '1' : '');
  vi.stubEnv('NEXT_PUBLIC_UX_V12', v12 ? '1' : '');
  return import('./community-write');
}

afterEach(() => { vi.unstubAllEnvs(); });

describe('community writes through the Verse gate', () => {
  it('creating a community thread or blog passes (POST, v12 on, origin community)', async () => {
    const m = await load(true);
    expect(await m.communityWriteAllowed('POST', '/api/verse/threads', { origin: 'community', group_id: 30 })).toBe(true);
    expect(await m.communityWriteAllowed('POST', '/api/verse/essays', { origin: 'community', group_id: 1 })).toBe(true);
  });
  it('origin community opens nothing else of the Verse', async () => {
    const m = await load(true);
    expect(await m.communityWriteAllowed('POST', '/api/verse/pages/save', { origin: 'community' })).toBe(false);
    expect(await m.communityWriteAllowed('PATCH', '/api/verse/essays', { origin: 'community', id: 2, action: 'feature' })).toBe(false);
    expect(await m.communityWriteAllowed('POST', '/api/verse/threads', { group_id: 1 })).toBe(false);
    expect(await m.communityWriteAllowed('POST', '/api/verse/threads', null)).toBe(false);
  });
  it('nothing passes with the v12 flag off', async () => {
    const m = await load(false);
    expect(await m.communityWriteAllowed('POST', '/api/verse/threads', { origin: 'community', group_id: 30 })).toBe(false);
    expect(m.wantsCommunity({ origin: 'community' })).toBe(false);
    expect(await m.reportIsCommunity('debate', 4)).toBe(false);
  });
  it('fan debates, challenges and their replies are community content', async () => {
    const m = await load(true);
    expect(await m.reportIsCommunity('debate', 4)).toBe(true);
    expect(await m.reportIsCommunity('challenge', 4)).toBe(true);
    expect(await m.reportIsCommunity('reply', 4)).toBe(true);
    expect(await m.reportIsCommunity('revision', 4)).toBe(false);
  });
});

describe('a post carries only a photo the photo route stored for the same account', () => {
  it('own checked photo: accepted; none asked for: undefined', async () => {
    const m = await load(true);
    expect(m.ownPhotoPath(USER, { assetPath: PHOTO })).toBe(PHOTO);
    expect(m.ownPhotoPath(USER, undefined)).toBeUndefined();
    expect(m.ownPhotoPath(USER, null)).toBeUndefined();
  });
  it("another account's photo, a space asset or a made-up path: refused", async () => {
    const m = await load(true);
    expect(m.ownPhotoPath(OTHER, { assetPath: PHOTO })).toBeNull();
    expect(m.ownPhotoPath(USER, { assetPath: 'groups/1/hero.jpg' })).toBeNull();
    expect(m.ownPhotoPath(USER, { assetPath: `community/${USER}/../x.jpg` })).toBeNull();
    expect(m.ownPhotoPath(USER, { mbid: 'x' })).toBeNull();
  });
});

describe('NSFW verdict: Porn and Hentai block, Sexy alone never does', () => {
  const s = (o: Partial<Record<'Porn' | 'Hentai' | 'Sexy' | 'Neutral' | 'Drawing', number>>) => ({ Porn: 0, Hentai: 0, Sexy: 0, Neutral: 0, Drawing: 0, ...o });
  it('an idol concert photo (Sexy 0.73) passes', () => { expect(isNsfw(s({ Sexy: 0.73, Drawing: 0.16 }))).toBe(false); });
  it('a very "sexy" score alone passes', () => { expect(isNsfw(s({ Sexy: 0.97 }))).toBe(false); });
  it('a neutral or drawn picture passes', () => { expect(isNsfw(s({ Neutral: 0.9 }))).toBe(false); expect(isNsfw(s({ Drawing: 0.85 }))).toBe(false); });
  it('Porn 0.6 or Hentai 0.6 blocks', () => { expect(isNsfw(s({ Porn: 0.6 }))).toBe(true); expect(isNsfw(s({ Hentai: 0.65 }))).toBe(true); });
  it('Porn + Hentai 0.7 blocks', () => { expect(isNsfw(s({ Porn: 0.4, Hentai: 0.3 }))).toBe(true); expect(isNsfw(s({ Porn: 0.35, Hentai: 0.3 }))).toBe(false); });
});
