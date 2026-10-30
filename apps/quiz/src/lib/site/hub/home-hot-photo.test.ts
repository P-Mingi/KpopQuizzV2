// Hub, Hot right now (owner decision 2026-10-30): the loader gives each quiz the photo of its group or series (home-photo.ts) next to its
// own cover, reading the owner's series pictures first as the OtakuQuiz layout does; the page shows the cover, else that photo.
import { afterEach, describe, expect, it, vi } from 'vitest';

import { setOwnerSeriesPictures } from '@/lib/anime/entity-images-store';

import { SAMPLE_COVER } from './home-samples.test-support';

const UPLOAD = 'https://sb.example.supabase.co/storage/v1/object/public/entity-images/series/frieren.webp?v=3';
const primed = vi.hoisted(() => ({ calls: 0 }));
vi.mock('./data', async () => {
  const s = await import('./home-samples.test-support');
  return { getHot: async () => s.sampleHot() };
});
// What the read does: set the owner's pictures for the server render (here one upload for Frieren, no credit asked).
vi.mock('@/lib/anime/entity-images-read', () => ({
  primeOwnerSeriesPictures: async () => {
    primed.calls += 1;
    const map = { frieren: { src: UPLOAD, src2x: null, width: 736, height: 981, position: '50% 50%', credit: null } };
    setOwnerSeriesPictures(map);
    return map;
  },
}));

afterEach(() => { setOwnerSeriesPictures({}); primed.calls = 0; });

describe('the photos of Hot right now', () => {
  it('keep the own cover as it was, and add the photo of the group or series to a quiz without one', async () => {
    const { loadHomeHot } = await import('./home-hot');
    const hot = (await loadHomeHot())!;
    expect(primed.calls).toBe(1);
    const byGroup = (list: typeof hot.kpop, group: string) => list.find((q) => q.group === group)!;
    // BTS has its own cover: the cover stays, no photo.
    expect(byGroup(hot.kpop, 'BTS')).toMatchObject({ cover: SAMPLE_COVER, photo: null });
    // BLACKPINK: no cover; the group photo of kpopquiz.org.
    expect(byGroup(hot.kpop, 'BLACKPINK')).toMatchObject({ cover: null, photo: '/idols/BLACKPINK.jpg' });
    // No photo under these group keys of the samples: none (the initials).
    expect(byGroup(hot.kpop, 'Stray Kids')).toMatchObject({ cover: null, photo: null });
    // Anime: the owner's upload, read before the photos are picked, as OtakuQuiz shows it.
    expect(byGroup(hot.anime, 'Frieren')).toMatchObject({ cover: null, photo: UPLOAD });
    expect(byGroup(hot.anime, 'Death Note')).toMatchObject({ cover: null, photo: null });
    // Every list carries it, Start easy included.
    expect(hot.easy.find((q) => q.group === 'Frieren')?.photo).toBe(UPLOAD);
    expect(hot.all.every((q) => 'photo' in q)).toBe(true);
  });
});
