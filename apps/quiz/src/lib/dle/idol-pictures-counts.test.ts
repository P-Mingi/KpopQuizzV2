// The count of the Kpopdle idols by picture source, from the data the repository holds (not production). Which data:
//   - the idols: the 218 people of docs/design/cards/data/lot6/subjects.json that carry a public.idols id (the integrator's export of the Kpopdle idols; the game holds 216 in production);
//   - the KpopCards photos: docs/design/cards/data/lot6/photos.json, the "auto" ones (live when file 116 is applied), and the October photos of docs/design/cards/data/subjects.json (live since file 101);
//   - the trivia pictures: none can be read here (entity_images is production data). What the site's member pages show are the files of apps/quiz/public/idols, with no licence and no
//     credit on record: they never resolve by themselves. The second scenario counts them as if the owner's script (scripts/cards/kpopdle-photos) had published them as verified rows.
// The numbers are pinned: they move only with the data.
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { resolveIdolPictures } from './idol-pictures';

import type { CardsEntityRow, CardsPhotoRow, PoolIdol } from './idol-pictures';
import type { PublicPicture } from '@/lib/photos/public-read';

const REPO = path.resolve(__dirname, '../../../../..');
const json = <T,>(f: string): T => JSON.parse(readFileSync(path.join(REPO, f), 'utf8')) as T;

interface Subject { slug: string; kind: string; name: string; qid: string | null; group: string | null; idol_id: number | null; locked?: boolean }
interface HarvestPhoto { author: string; licence: string; licence_url: string; share_alike: boolean; page: string; slot: number; status: string; focal: { x: number; y: number } }
interface OctoberSubject { slug: string; kind: string; photo: { bucket: string; path: string; author: string; licence: string; licence_url: string; share_alike: boolean; commons_page: string }; focal: { x: number; y: number } }

const subjects = json<Subject[]>('docs/design/cards/data/lot6/subjects.json');
const harvest = json<{ subjects: (Subject & { photos: HarvestPhoto[] })[] }>('docs/design/cards/data/lot6/photos.json').subjects;
const october = json<OctoberSubject[]>('docs/design/cards/data/subjects.json');
const idolsOf = subjects.filter((s) => s.kind === 'idol' && s.idol_id !== null);
const groupName = new Map(subjects.filter((s) => s.kind === 'group').map((s) => [s.slug, s.name]));

function build(opts: { cutFilesPublished: boolean }): { entities: CardsEntityRow[]; photos: CardsPhotoRow[] } {
  const entities: CardsEntityRow[] = [];
  const photos: CardsPhotoRow[] = [];
  let id = 0;
  for (const s of harvest.filter((x) => x.kind === 'idol' && x.idol_id !== null)) {
    const eid = `idol:${s.slug}`;
    entities.push({ id: eid, kind: 'idol', name: s.name, qid: s.qid, active: true, age_lock: s.locked === true });
    const oct = october.find((o) => o.kind === 'idol' && o.slug === s.slug);
    if (oct) {
      // The October photo: approved since file 101, its source in the public bucket (images/group-photos/<slug>.jpg), no card file needed.
      photos.push({ id: ++id, entity_id: eid, slot: 1, status: 'approved', source_page: oct.photo.commons_page, author: oct.photo.author, author_url: null, licence: oct.photo.licence, licence_url: oct.photo.licence_url,
        share_alike: oct.photo.share_alike, focal_x: oct.focal.x, focal_y: oct.focal.y, storage_path: null, source_path: `${oct.photo.bucket}/${oct.photo.path}`, file_focal_x: null, file_focal_y: null, small_2x: false });
    }
    for (const p of s.photos) {
      if (p.status !== 'auto') continue; // pending photos open nothing until the owner approves them
      photos.push({ id: ++id, entity_id: eid, slot: p.slot + 1, status: 'auto', source_page: p.page, author: p.author, author_url: null, licence: p.licence, licence_url: p.licence_url, share_alike: p.share_alike,
        focal_x: p.focal.x, focal_y: p.focal.y, storage_path: opts.cutFilesPublished ? `idol/${s.slug}-${p.slot}` : null, source_path: null,
        file_focal_x: opts.cutFilesPublished ? p.focal.x : null, file_focal_y: opts.cutFilesPublished ? p.focal.y : null, small_2x: false });
    }
  }
  return { entities, photos };
}

const pool = (): PoolIdol[] => idolsOf.map((s) => ({ id: String(s.idol_id), name: s.name, thumb: null, qid: s.qid }));
const locked = new Set(subjects.filter((s) => s.locked === true).map((s) => `idol:${s.slug}`));

/** The idols that public/idols has a member photo for, by the owner's own matcher (scripts/cards/kpopdle-photos). */
async function filesMatched(): Promise<Set<string>> {
  const dir = '../../../scripts/cards/kpopdle-photos';
  const kp = (await import(/* @vite-ignore */ `${dir}/kpopdle-photos.mjs`)) as unknown as { matchPhotos: (i: unknown[], f: string[]) => { idol: { id: number }; file?: string }[] };
  const files = readdirSync(path.join(REPO, 'apps/quiz/public/idols')).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
  const idols = idolsOf.map((s) => ({ id: s.idol_id, name: s.name, group: groupName.get(s.group ?? '') ?? '', photo_url: null }));
  return new Set(kp.matchPhotos(idols, files).filter((m) => m.file).map((m) => String(m.idol.id)));
}

const triviaRow = (id: string): PublicPicture => ({ site: 'kpop', kind: 'idol', slug: id, url: `https://s/${id}.webp`, thumb: `https://s/${id}-96.webp`, position: '50% 50%', name: null, needsCredit: false, sourceUrl: null, author: null, license: null, licenseNote: null, updatedAt: '' });

describe('Kpopdle idols by picture source, from the repository data', () => {
  it('today: no verified trivia row is readable here, the October KpopCards photos have files, the harvest has none until the owner publishes its card files', () => {
    const { entities, photos } = build({ cutFilesPublished: false });
    const r = resolveIdolPictures({ idols: pool(), trivia: [], entities, photos, locked, base: 'https://p.supabase.co' });
    console.info(`[count] today: ${idolsOf.length} idols, trivia ${r.counts.trivia}, KpopCards ${r.counts.cards}, initials ${r.counts.none}`);
    expect(idolsOf).toHaveLength(218);
    expect(r.counts).toEqual({ trivia: 0, cards: 8, none: 210 });
  });

  it('once the owner has published the card files of the harvest (pnpm owner:cards): KpopCards alone', () => {
    const { entities, photos } = build({ cutFilesPublished: true });
    const r = resolveIdolPictures({ idols: pool(), trivia: [], entities, photos, locked, base: 'https://p.supabase.co' });
    console.info(`[count] harvest published: trivia ${r.counts.trivia}, KpopCards ${r.counts.cards}, initials ${r.counts.none}`);
    expect(r.counts.trivia + r.counts.cards + r.counts.none).toBe(218);
    expect(r.counts).toEqual({ trivia: 0, cards: 199, none: 19 });
  });

  it('and with the member photos of public/idols published as verified rows by the owner\'s script: trivia first, KpopCards for the rest', async () => {
    const matched = await filesMatched();
    const { entities, photos } = build({ cutFilesPublished: true });
    const r = resolveIdolPictures({ idols: pool(), trivia: [...matched].map(triviaRow), entities, photos, locked, base: 'https://p.supabase.co' });
    console.info(`[count] member photos published too: trivia ${r.counts.trivia}, KpopCards ${r.counts.cards}, initials ${r.counts.none} (files matched ${matched.size})`);
    expect(r.counts.trivia).toBe(matched.size);
    expect(r.counts.trivia + r.counts.cards + r.counts.none).toBe(218);
    expect(r.counts).toEqual(expect.objectContaining({ trivia: matched.size }));
  });

  it('no locked subject and no pending photo ever resolves, whatever the data says', () => {
    const { entities, photos } = build({ cutFilesPublished: true });
    const r = resolveIdolPictures({ idols: pool(), trivia: [], entities, photos, locked, base: 'https://p.supabase.co' });
    const lockedIds = new Set(subjects.filter((s) => locked.has(`idol:${s.slug}`)).map((s) => String(s.idol_id)));
    for (const id of lockedIds) expect(r.thumbs[id]).toBeUndefined();
    expect(photos.every((p) => p.status === 'auto' || p.status === 'approved')).toBe(true);
  });
});
