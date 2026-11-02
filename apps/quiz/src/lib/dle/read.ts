// Daily games step 4: the server's reads for the pages of the Terrier. dle_day (without a token: never a play) and dle_pool through the public client, cached one minute; the slots of site_assets through
// lib/photos/public-read.ts. Fail closed: until 019 and 020 are applied, while a game is off, or with no Supabase settings at build time, a read answers null and the page keeps its fallback. The target
// of the day is never read here: dle_day gives it only inside a finished play, and these calls have no token.
import { unstable_cache } from 'next/cache';

import { ROUND_SIZE } from '@/lib/blind-test-playlists';
import { fetchAllRows } from '@/lib/db/fetch-all';
import { publicUrl } from '@/lib/entity-images/store';
import { assetPosition, getLiveAssets, getPublicPictures, safePath } from '@/lib/photos/public-read';
import { homeUrl } from '@/lib/site/hub/home-types';
import { createPublicReadClient } from '@/lib/supabase/server';

import type { LiveAsset, PublicPicture } from '@/lib/photos/public-read';

import type { DleGameId } from './games';
import type { DleDay, DlePool, DlePoolEntity, DlePublicEntity } from './types';

/** The cache of the reads, in seconds, and the period of the pages. */
export const DLE_TTL = 60;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the app's clients are untyped
type Db = any;

/** A stored picture path to its public URL, or null when it is not a safe path of the bucket. */
function thumbUrl(path: unknown): string | null {
  const p = safePath(path);
  return p ? publicUrl(p) : null;
}

export function withThumbUrl<T extends DlePublicEntity>(e: T): T {
  return { ...e, thumb: thumbUrl(e.thumb) };
}

/** dle_day's answer, its pictures as URLs; null for anything else. */
export function parseDay(raw: unknown): DleDay | null {
  const d = raw as DleDay | null;
  if (!d || typeof d !== 'object' || typeof d.date !== 'string' || typeof d.game_no !== 'number') return null;
  return { ...d, yesterday: d.yesterday ? { ...d.yesterday, answer: withThumbUrl(d.yesterday.answer) } : null };
}

/** dle_pool's answer, its pictures as URLs; null for anything else. */
export function parsePool(raw: unknown): DlePool | null {
  const p = raw as DlePool | null;
  if (!p || typeof p !== 'object' || !Array.isArray(p.entities) || !Array.isArray(p.attributes)) return null;
  return { ...p, entities: p.entities.map((e: DlePoolEntity) => withThumbUrl(e)) };
}

async function rpcOrThrow(db: Db, fn: string, args: Record<string, unknown>): Promise<unknown> {
  const { data, error } = await db.rpc(fn, args);
  if (error) throw new Error(error.message ?? fn);
  return data;
}

export async function readDay(db: Db, game: string): Promise<DleDay | null> {
  return parseDay(await rpcOrThrow(db, 'dle_day', { p_game: game }));
}

export async function readPool(db: Db, game: string): Promise<DlePool | null> {
  return parsePool(await rpcOrThrow(db, 'dle_pool', { p_game: game }));
}

const dayCached = unstable_cache(async (game: string) => readDay(createPublicReadClient(), game), ['db:hub:dle-day:v1'], { revalidate: DLE_TTL, tags: ['dle'] });
const poolCached = unstable_cache(async (game: string) => readPool(createPublicReadClient(), game), ['db:hub:dle-pool:v1'], { revalidate: DLE_TTL * 5, tags: ['dle'] });

/** The public facts of today's game, or null. A failed read is never kept by the cache: the next render tries again. */
export async function getDleDay(game: DleGameId): Promise<DleDay | null> {
  try {
    return await dayCached(game);
  } catch (err) {
    console.error('[dle] dle_day read failed:', (err as Error)?.message ?? err);
    return null;
  }
}

export async function getDlePool(game: DleGameId): Promise<DlePool | null> {
  try {
    return await poolCached(game);
  } catch (err) {
    console.error('[dle] dle_pool read failed:', (err as Error)?.message ?? err);
    return null;
  }
}

// ---- the images of the pages (site_assets) ------------------------------------------------------------------------------------------

/** One image of a slot: its files by size and its focal point. No credit: it is never printed on a page or in a game (CR-021), /credits lists it. */
export interface DleImage {
  readonly src: string;
  readonly small: string;
  readonly mid: string | null;
  readonly position: string;
}

export type DleImages = Readonly<Record<string, DleImage>>;

/** The live banners and card images by key. Empty until step 2's 022 is applied: every slot keeps its background in the game's colours. */
export function imagesOf(live: readonly LiveAsset[]): DleImages {
  const out: Record<string, DleImage> = {};
  for (const a of live) {
    if ((a.type !== 'banner' && a.type !== 'card_image') || !a.large) continue;
    out[a.key] = { src: a.large, small: a.thumb ?? a.mid ?? a.large, mid: a.mid, position: assetPosition(a) };
  }
  return out;
}

export async function getDleImages(): Promise<DleImages> {
  return imagesOf(await getLiveAssets());
}

// ---- the licensed photos of the entities --------------------------------------------------------------------------------------------

export interface DlePicture { readonly url: string; readonly position: string }

/** The result screen's photos of a game's pool, by entity id: only what entity_images_public gives (a verified licence), with no credit (CR-021). */
export function picturesOf(pictures: readonly PublicPicture[], kind: string | null): Readonly<Record<string, DlePicture>> {
  const out: Record<string, DlePicture> = {};
  if (!kind) return out;
  for (const p of pictures) {
    if (p.kind !== kind) continue;
    out[p.slug] = { url: p.url, position: p.position };
  }
  return out;
}

export async function getDlePictures(kind: string | null): Promise<Readonly<Record<string, DlePicture>>> {
  return picturesOf(await getPublicPictures(), kind);
}

// ---- the links to KpopQuiz ---------------------------------------------------------------------------------------------------------

export async function readKpopGroupSlugs(db: Db): Promise<Readonly<Record<string, string>>> {
  const rows = await fetchAllRows<{ name: string; slug: string }>(() => db.from('groups').select('name, slug').eq('site_id', 'kpop').order('slug', { ascending: true }));
  return Object.fromEntries(rows.map((r) => [r.name, r.slug]));
}

export async function readAnimeSeriesSlugs(db: Db): Promise<Readonly<Record<string, string>>> {
  const rows = await fetchAllRows<{ name: string; slug: string }>(() => db.from('groups').select('name, slug').eq('site_id', 'anime').order('slug', { ascending: true }));
  return Object.fromEntries(rows.map((r) => [r.name, r.slug]));
}

const animeSlugsCached = unstable_cache(async () => readAnimeSeriesSlugs(createPublicReadClient()), ['db:hub:dle-series-slugs:v1'], { revalidate: 3600, tags: ['dle'] });

/** Series title to its slug on OtakuQuiz, for "Quiz One Piece"; {} on any failure, and a title it does not know gets no link. */
export async function getAnimeSeriesSlugs(): Promise<Readonly<Record<string, string>>> {
  try {
    return await animeSlugsCached();
  } catch (err) {
    console.error('[dle] series read failed:', (err as Error)?.message ?? err);
    return {};
  }
}

/** Name to the address of its quiz, on the site of the game (kpopquiz.org or OtakuQuiz). */
export function quizLinksOf(universe: 'kpop' | 'anime', names: readonly string[], slugs: Readonly<Record<string, string>>): Readonly<Record<string, string>> {
  return Object.fromEntries(names.flatMap((n) => (slugs[n] ? [[n, homeUrl({ site: universe, path: `/${slugs[n]}-quiz` })]] : [])));
}

const slugsCached = unstable_cache(async () => readKpopGroupSlugs(createPublicReadClient()), ['db:hub:dle-group-slugs:v1'], { revalidate: 3600, tags: ['dle'] });

/** Group name to its slug on KpopQuiz, for "Quiz TWICE"; {} on any failure, and a name it does not know gets no link (no dead door). */
export async function getKpopGroupSlugs(): Promise<Readonly<Record<string, string>>> {
  try {
    return await slugsCached();
  } catch (err) {
    console.error('[dle] groups read failed:', (err as Error)?.message ?? err);
    return {};
  }
}

// ---- the blind test of a group (P5, CR-025, link 3) ---------------------------------------------------------------------------------

/**
 * Group name to its slug, for the groups of KpopQuiz whose blind test can be played: the rule of /blindtest/group-{slug} (lib/blind-test-playlists.ts, THE rule), a group with at least ROUND_SIZE clean
 * active songs. Paged past the 1000-row cap. A group under the floor gets no entry, so the result screen never links a page that answers 404.
 */
export async function readBlindtestSlugs(db: Db): Promise<Readonly<Record<string, string>>> {
  const [songs, groups] = await Promise.all([
    fetchAllRows<{ group_id: number }>(() => db.from('songs').select('id, group_id').eq('site_id', 'kpop').eq('status', 'active').not('group_id', 'is', null)
      .not('title', 'ilike', '%remix%').not('title', 'ilike', '%instrumental%').not('title', 'ilike', '%inst.%').not('title', 'ilike', '%karaoke%').order('id', { ascending: true })),
    fetchAllRows<{ id: number; name: string; slug: string }>(() => db.from('groups').select('id, name, slug').eq('site_id', 'kpop').order('slug', { ascending: true })),
  ]);
  const playable = new Map<number, number>();
  for (const r of songs) playable.set(r.group_id, (playable.get(r.group_id) ?? 0) + 1);
  return Object.fromEntries(groups.filter((g) => (playable.get(g.id) ?? 0) >= ROUND_SIZE).map((g) => [g.name, g.slug]));
}

const blindSlugsCached = unstable_cache(async () => readBlindtestSlugs(createPublicReadClient()), ['db:hub:dle-blindtest-slugs:v1'], { revalidate: 3600, tags: ['dle'] });

/** Group name to its slug when its blind test is playable, for "Blind test TWICE"; {} on any failure (a name it does not know gets no link, no dead door). */
export async function getBlindtestSlugs(): Promise<Readonly<Record<string, string>>> {
  try {
    return await blindSlugsCached();
  } catch (err) {
    console.error('[dle] blind test groups read failed:', (err as Error)?.message ?? err);
    return {};
  }
}

/** Name to the address of its blind test on KpopQuiz. */
export function blindLinksOf(names: readonly string[], slugs: Readonly<Record<string, string>>): Readonly<Record<string, string>> {
  return Object.fromEntries(names.flatMap((n) => (slugs[n] ? [[n, homeUrl({ site: 'kpop', path: `/blindtest/group-${slugs[n]}` })]] : [])));
}
