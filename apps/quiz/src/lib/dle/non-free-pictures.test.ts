// Lot 3 DLE (E2.3): the pictures that are not free never reach the public games. Rows shaped like the 1,012 official artworks of 2026-11-11 and the
// 56 cc0 rows of Fandom (never verified, no 96 px file, as the import left them) stay out of dle_entities (the nightly refresh reads the source view of
// 023) and out of entity_images_public (022), on PGlite with the real files. A verified, licensed row is the control that does enter. No SQL change is
// needed: license_verified defaults to false, both views and the refresh filter on it, and 022's trigger drops the check of any row whose licence or file changes.
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { NON_FREE_SQL } from '@/lib/entity-images/non-free';

import { afterJ4, afterSessionG, seedOtakudle } from './otakudle-fixture';
import { failure, one, readMigration, rows } from './pglite-harness';

import type { PGlite } from '@electric-sql/pglite';

vi.setConfig({ testTimeout: 90_000, hookTimeout: 90_000 });

const OFFICIAL = 'Official artwork, rights belong to the original creators and studio';
const WIKI = 'Creative Commons Zero';

let db: PGlite;

const insert = (slug: string, o: { license: string; note?: string | null; source?: string | null; at?: string; verified?: boolean; thumb?: string | null }): Promise<unknown> =>
  db.query(
    `insert into public.entity_images (site_id, kind, slug, path, width, height, license, license_note, source_url, created_at, license_verified, thumb_path)
     values ('anime', 'character', $1, $2, 360, 480, $3, $4, $5, $6::timestamptz, $7, $8)`,
    [slug, `anime/character/${slug}/h.webp`, o.license, o.note ?? null, o.source ?? null, o.at ?? '2026-11-11T21:10:00+00:00', o.verified ?? false, o.thumb ?? null],
  );

beforeAll(async () => {
  db = await afterSessionG();
  await db.exec(readMigration('022-photos-admin.sql'));
  await afterJ4(db);
  await seedOtakudle(db);
  // the shapes of the import: official artwork (licence other), cc0 from Fandom, a cc0 from Commons, and the control: licensed and verified, with its 96 px file
  await insert('one-piece/luffy', { license: 'other', note: OFFICIAL });
  await insert('one-piece/zoro', { license: 'cc0', note: WIKI, source: 'https://onepiece.fandom.com/wiki/Roronoa_Zoro', at: '2026-10-02T08:00:00+00:00' });
  await insert('naruto/naruto', { license: 'cc0', source: 'https://static.wikia.nocookie.net/naruto/images/a/a1/Naruto.png', at: '2026-10-02T08:00:00+00:00' });
  await insert('bleach/ichigo', { license: 'cc0', source: 'https://commons.wikimedia.org/wiki/File:Ichigo.png', at: '2026-10-02T08:00:00+00:00', verified: true, thumb: 'anime/character/bleach/ichigo/t.webp' });
  await db.exec(`select public.dle_refresh_entities('otakudle')`);
});

describe('rows shaped like the non-free import', () => {
  it('are selected by the one selection: Luffy, Zoro and Naruto, not the verified Commons row', async () => {
    expect(Number(await one(db, NON_FREE_SQL))).toBe(3);
  });

  it('never enter dle_entities with a picture: the pool has them, with no thumb (the entity id is the character id)', async () => {
    const r = await rows<{ slug: string; thumb_path: string | null }>(db, `
      select g.slug || '/' || c.slug as slug, e.thumb_path from public.dle_entities e
      join public.characters c on c.id::text = e.entity_id join public.groups g on g.id = c.group_id
      where e.game_id = 'otakudle' and g.slug || '/' || c.slug in ('one-piece/luffy', 'one-piece/zoro', 'naruto/naruto', 'bleach/ichigo') order by 1`);
    expect(r).toEqual([
      { slug: 'bleach/ichigo', thumb_path: 'anime/character/bleach/ichigo/t.webp' },
      { slug: 'naruto/naruto', thumb_path: null },
      { slug: 'one-piece/luffy', thumb_path: null },
      { slug: 'one-piece/zoro', thumb_path: null },
    ]);
    // and nothing in the pool points at a file of the import
    expect(await one(db, `select count(*)::int from public.dle_entities where thumb_path like '%/h.webp'`)).toBe(0);
  });

  it('never appear in entity_images_public, and the dle source view carries no picture of theirs', async () => {
    expect(await rows(db, `select slug from public.entity_images_public where kind = 'character' order by slug`)).toEqual([{ slug: 'bleach/ichigo' }]);
    expect(await rows(db, `select c.slug from public.dle_src_anime_character v join public.characters c on c.id::text = v.entity_id where v.thumb_path is not null`)).toEqual([{ slug: 'ichigo' }]);
  });

  it('cannot be marked verified without a 96 px file (the check of 022): the import leaves them unverified', async () => {
    expect(await failure(db, `update public.entity_images set license_verified = true where slug = 'one-piece/luffy'`)).toMatch(/entity_images_verified_thumb_check/);
    expect(await failure(db, `insert into public.entity_images (site_id, kind, slug, path, width, height, license, license_note, license_verified) values ('anime', 'character', 'one-piece/nami', 'anime/character/one-piece/nami/h.webp', 360, 480, 'other', 'Official artwork', true)`)).toMatch(/entity_images_verified_thumb_check/);
  });

  it('lose any check the day their licence or file changes (022 trigger), so a verified row cannot keep a verified flag through a swap into the selection', async () => {
    await db.exec(`update public.entity_images set license = 'other', license_note = 'Official artwork, rights belong to the original creators and studio', created_at = created_at where slug = 'bleach/ichigo'`);
    expect(await one(db, `select license_verified from public.entity_images where slug = 'bleach/ichigo'`)).toBe(false);
    await db.exec(`select public.dle_refresh_entities('otakudle')`);
    expect(await rows(db, `select slug from public.entity_images_public where kind = 'character'`)).toEqual([]);
  });
});
