// Run O1 (ADM back): the answer of GET /api/admin/images/list: every series of the anime site with its character list, the current
// state of each image and the counts. Server only. Paged past the 1000-row cap (the characters alone are 1000).
import { fetchAllRows } from '@/lib/db/fetch-all';
import { seriesImageOf } from '@/lib/anime/series-images';

import { IMAGE_SITE } from './constants';
import { ImageError } from './errors';
import { allRows, toDto } from './store';

import type { Db } from './store';
import type { EntityImageDto } from './types';

export interface ListedCharacter {
  /** '<series slug>/<character slug>': the slug the other routes take. */
  readonly slug: string;
  readonly name: string;
  readonly role: string;
  readonly status: string;
  readonly image: EntityImageDto | null;
}

export interface ListedSeries {
  readonly slug: string;
  readonly name: string;
  readonly published: boolean;
  /** The owner's uploaded cover, or null. */
  readonly image: EntityImageDto | null;
  /** The bundled photo the page shows when there is no upload, or null (the placeholder). */
  readonly bundled: { readonly url: string; readonly alt: string } | null;
  /** 'upload' | 'bundled' | 'none': what the page shows now. */
  readonly source: 'upload' | 'bundled' | 'none';
  readonly characterCount: number;
  readonly characterImageCount: number;
  readonly characters: readonly ListedCharacter[];
}

export interface ImageList {
  readonly site: typeof IMAGE_SITE;
  readonly counts: {
    readonly series: number;
    /** Series that show a picture: an upload or the bundled photo. */
    readonly seriesWithImage: number;
    readonly seriesWithUpload: number;
    readonly characters: number;
    readonly charactersWithImage: number;
  };
  readonly series: readonly ListedSeries[];
}

interface GroupRow { id: number; slug: string; name: string }
interface SeriesRow { group_id: number; published: boolean }
interface CharRow { group_id: number; slug: string; name: string; role: string; status: string }

export async function listImages(db: Db): Promise<ImageList> {
  const fail = (): never => { throw new ImageError('db_failed', 500, 'The list could not be read.'); };
  const [groups, seriesRows, chars, images] = await Promise.all([
    fetchAllRows<GroupRow>(() => db.from('groups').select('id, slug, name').eq('site_id', IMAGE_SITE).order('id', { ascending: true })).catch(fail),
    fetchAllRows<SeriesRow>(() => db.from('series').select('group_id, published').order('group_id', { ascending: true })).catch(fail),
    fetchAllRows<CharRow>(() => db.from('characters').select('group_id, slug, name, role, status, ord, id').order('group_id', { ascending: true }).order('ord', { ascending: true }).order('id', { ascending: true })).catch(fail),
    allRows(db),
  ]);
  const byGroup = new Map(groups.map((g) => [g.id, g]));
  const imageOf = new Map(images.map((r) => [`${r.kind}|${r.slug}`, toDto(r)]));
  const charsOf = new Map<number, CharRow[]>();
  for (const c of chars) {
    const list = charsOf.get(c.group_id) ?? [];
    list.push(c);
    charsOf.set(c.group_id, list);
  }
  const series: ListedSeries[] = [];
  for (const s of seriesRows) {
    const g = byGroup.get(s.group_id);
    if (!g) continue; // a series of another site
    const characters: ListedCharacter[] = (charsOf.get(g.id) ?? []).map((c) => ({
      slug: `${g.slug}/${c.slug}`, name: c.name, role: c.role, status: c.status, image: imageOf.get(`character|${g.slug}/${c.slug}`) ?? null,
    }));
    const upload = imageOf.get(`series|${g.slug}`) ?? null;
    const photo = seriesImageOf(g.slug);
    series.push({
      slug: g.slug, name: g.name, published: s.published, image: upload,
      bundled: photo ? { url: photo.file, alt: photo.alt } : null,
      source: upload ? 'upload' : photo ? 'bundled' : 'none',
      characterCount: characters.length,
      characterImageCount: characters.filter((c) => c.image).length,
      characters,
    });
  }
  series.sort((a, b) => a.name.localeCompare(b.name, 'en'));
  return {
    site: IMAGE_SITE,
    counts: {
      series: series.length,
      seriesWithImage: series.filter((s) => s.source !== 'none').length,
      seriesWithUpload: series.filter((s) => s.source === 'upload').length,
      characters: series.reduce((n, s) => n + s.characterCount, 0),
      charactersWithImage: series.reduce((n, s) => n + s.characterImageCount, 0),
    },
    series,
  };
}
