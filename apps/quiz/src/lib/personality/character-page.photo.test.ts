// Run O1 (ADM front): the result of a Which character are you quiz shows the owner's portrait of the character when there is one, and the
// same view as before (no photo) when there is none.
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { SeriesWmaData } from './data';
import type { Axes } from './engine';
import type { OwnerPicture } from '@/lib/anime/entity-images-rules';

const data = vi.hoisted(() => ({ series: null as unknown, pictures: {} as Record<string, unknown> }));
vi.mock('./data', () => ({
  getSeriesWmaData: async () => data.series,
  getWmaData: async () => null,
  getMemberCounts: async () => null,
  getBridgeCounts: async () => null,
  getBridgeGroups: async () => [],
}));
vi.mock('@/lib/anime/entity-images-read', () => ({ getOwnerCharacterPictures: async () => data.pictures }));
vi.mock('@/lib/ux-v1/p6/hub-data', () => ({ getPlayableGroups: async () => [] }));

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); data.series = null; data.pictures = {}; });

const AX = (energy: number): Axes => ({ energy, chaos: 50, care: 50, craft: 50, heart: 50, spotlight: 50 });
const Q = (n: number): { text: string; options: Array<{ text: string; weights: Record<string, number> }> } => ({
  text: `Question ${n}?`,
  options: [{ text: 'Quiet', weights: { energy: 0 } }, { text: 'Loud', weights: { energy: 5 } }, { text: 'Calm', weights: { chaos: 0 } }, { text: 'Wild', weights: { chaos: 5 } }],
});
const SERIES: SeriesWmaData = {
  group: { id: 7, slug: 'death-note', name: 'Death Note', fandom: null },
  questions: [1, 2, 3, 4, 5, 6, 7, 8].map(Q),
  profiles: ['light-yagami', 'l', 'ryuk', 'soichiro', 'matsuda', 'mogi'].map((id, i) => ({ id, name: id, axes: AX(10 + i * 15), lines: ['A line.'], role: 'main', affiliation: null })),
};
const PIC: OwnerPicture = { src: 'https://proj.supabase.co/storage/v1/object/public/entity-images/death-note/ryuk.webp', width: 552, height: 736, position: '30% 20%', credit: null };

describe('getCharacterPage with portraits', () => {
  it('puts the portrait of a character on its result, and no photo on the others', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_ID', 'anime');
    data.series = SERIES;
    data.pictures = { ryuk: PIC };
    const { getCharacterPage } = await import('./character-page');
    const page = await getCharacterPage('death-note');
    const photos = Object.fromEntries(page!.view.results.map((r) => [r.id, r.photo]));
    expect(photos.ryuk).toBe(PIC.src);
    expect(Object.values(photos).filter(Boolean)).toHaveLength(1);
  });

  it('keeps every photo empty when the owner has uploaded nothing', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_ID', 'anime');
    data.series = SERIES;
    const { getCharacterPage } = await import('./character-page');
    const page = await getCharacterPage('death-note');
    expect(page!.view.results.every((r) => r.photo === null)).toBe(true);
  });
});
