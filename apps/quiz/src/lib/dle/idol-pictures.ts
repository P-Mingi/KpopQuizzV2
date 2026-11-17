// Kpopdle (idol): the small picture beside a name. Pure resolution, no I/O (the reads are in idol-pictures-read.ts). For each idol of the pool, in this order:
//   1. the picture the site already shows for that idol on its trivia and idol pages: the verified, licensed row of entity_images (kind idol, slug = public.idols.id), as the pool's own
//      96 px thumb (dle_pool) or, before the nightly refresh has caught up, as the 96 px file of entity_images_public;
//   2. else a live KpopCards photo of the same person (cards_photos of the cards_entities row that carries the idol's Wikidata id): a Commons-type photo with a named author and a free licence;
//   3. else nothing: the tile keeps its initials.
// Fail closed everywhere: a photo of a locked (age-locked) subject, one that is not live (auto, approved), one with no author or with a licence that is not a free one (CC BY, CC BY-SA,
// CC0, public domain: no NC, no ND), or one with no file of ours, never resolves. A Wikidata id held by two card subjects resolves nobody. A Wikidata id held by two Kpopdle idol rows
// (lot 6 found Kai, DK, The8, S.Coups twice) resolves only the row whose name is the card subject's name, and only when exactly one row is.
import { cardImage } from '@/lib/cards/catalog';

import type { CardImage } from '@/lib/cards/types';
import type { PublicPicture } from '@/lib/photos/public-read';
import type { ImageLicense } from '@/lib/photos/slots';

import type { DlePicture } from './read';

export type PictureSource = 'trivia' | 'cards';

/** The tile of one idol: the file, and the object-position of its square crop (null: the centre, as a thumb always was). */
export interface IdolThumb {
  readonly src: string;
  readonly position: string | null;
  readonly from: PictureSource;
}

/** What the page needs: the tiles that the pool's own thumb does not give, the large pictures of the result, the credits of the KpopCards photos used, and the counts. */
export interface IdolPictureSet {
  readonly thumbs: Readonly<Record<string, IdolThumb>>;
  readonly pictures: Readonly<Record<string, DlePicture>>;
  readonly credits: readonly PublicPicture[];
  readonly counts: { readonly trivia: number; readonly cards: number; readonly none: number };
}

export const EMPTY_IDOL_PICTURES: IdolPictureSet = { thumbs: {}, pictures: {}, credits: [], counts: { trivia: 0, cards: 0, none: 0 } };

/** One idol of the pool, with the Wikidata id of its public.idols row (null: none, so no KpopCards photo). */
export interface PoolIdol {
  readonly id: string;
  readonly name: string;
  /** The pool's own licensed thumb (dle_pool), already a URL, or null. */
  readonly thumb: string | null;
  readonly qid: string | null;
}

/** The columns of cards_entities that the resolution reads. age_lock exists from file 116 on. */
export interface CardsEntityRow {
  readonly id: string;
  readonly kind: string;
  readonly name: string;
  readonly qid: string | null;
  readonly active: boolean;
  readonly age_lock?: boolean | null;
}

/** The columns of cards_photos that the resolution reads (the ones lib/cards/catalog.ts reads, plus the entity). */
export interface CardsPhotoRow {
  readonly id: number;
  readonly entity_id: string;
  readonly slot: number;
  readonly status: string;
  readonly source_page: string;
  readonly author: string;
  readonly author_url: string | null;
  readonly licence: string;
  readonly licence_url: string;
  readonly share_alike: boolean;
  readonly focal_x: number;
  readonly focal_y: number;
  readonly storage_path: string | null;
  readonly source_path: string | null;
  readonly file_focal_x: number | null;
  readonly file_focal_y: number | null;
  readonly small_2x: boolean;
}

export interface ResolveInput {
  readonly idols: readonly PoolIdol[];
  /** entity_images_public rows of kind idol (slug = the idol's id). */
  readonly trivia: readonly PublicPicture[];
  readonly entities: readonly CardsEntityRow[];
  readonly photos: readonly CardsPhotoRow[];
  /** Ids of the card subjects that are age-locked right now (lockedIds of lib/cards/catalog.ts). */
  readonly locked: ReadonlySet<string>;
  /** Base of the public bucket URLs; the app's Supabase URL when absent. */
  readonly base?: string | undefined;
}

const LIVE = new Set(['auto', 'approved']);

/** Letters and digits only, lower case, no accent: 'Cha Eun-woo' and 'Chaeunwoo' compare alike. */
export function nameKey(s: unknown): string {
  return String(s ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

const httpsOrNull = (u: unknown): string | null => {
  if (typeof u !== 'string') return null;
  try { return new URL(u).protocol === 'https:' ? u : null; } catch { return null; }
};

/**
 * The licence of a KpopCards photo as the credit system knows it, or null for anything that is not a free licence (never shown): "CC BY 4.0", "CC BY-SA 2.0", "CC BY 2.0 kr" (the Korean
 * port of CC BY), "CC0", "Public domain". A licence that names NC or ND is refused.
 */
export function cardLicence(licence: string): ImageLicense | null {
  const l = licence.trim();
  if (/\b(NC|ND)\b/i.test(l)) return null;
  if (/^CC0\b/i.test(l)) return 'cc0';
  if (/^public domain\b/i.test(l)) return 'public_domain';
  if (/^CC BY-SA\b/i.test(l)) return 'cc_by_sa';
  if (/^CC BY\b/i.test(l)) return 'cc_by';
  return null;
}

/** The object-position of the square tile cut out of a card image: the face of a portrait card sits in its upper half. */
const CARD_FACE = '50% 24%';

interface Chosen { readonly photo: CardsPhotoRow; readonly image: CardImage; readonly src: string; readonly license: ImageLicense }

/** The photo of a card subject that a tile may use: live, free, credited, with a file of ours. The lowest slot first, so the pick never moves. */
function choosePhoto(photos: readonly CardsPhotoRow[], base: string | undefined): Chosen | null {
  const ordered = [...photos].filter((p) => LIVE.has(p.status)).sort((a, b) => a.slot - b.slot || a.id - b.id);
  for (const photo of ordered) {
    const license = cardLicence(photo.licence);
    if (!license || !photo.author || !photo.author.trim()) continue;
    const image = cardImage(photo, base);
    const src = httpsOrNull(image.url);
    if (!src) continue;
    return { photo, image, src, license };
  }
  return null;
}

/** The card subject of each idol: the one active idol subject that carries the idol's Wikidata id, and, when two pool rows share the id, only the row of the same name. */
function subjectOf(idols: readonly PoolIdol[], entities: readonly CardsEntityRow[], locked: ReadonlySet<string>): Map<string, CardsEntityRow> {
  const byQid = new Map<string, CardsEntityRow[]>();
  for (const e of entities) {
    if (e.kind !== 'idol' || !e.active || !e.qid) continue;
    byQid.set(e.qid, [...(byQid.get(e.qid) ?? []), e]);
  }
  const holders = new Map<string, PoolIdol[]>();
  for (const i of idols) if (i.qid) holders.set(i.qid, [...(holders.get(i.qid) ?? []), i]);
  const out = new Map<string, CardsEntityRow>();
  for (const [qid, rows] of holders) {
    const subjects = byQid.get(qid) ?? [];
    if (subjects.length !== 1) continue; // none, or two subjects for one person: nobody
    const subject = subjects[0]!;
    // An age-locked subject is open only when the database says so: the caller passes the ids locked right now (lockedIds of lib/cards/catalog.ts: an answer that did not come locks all of them).
    if (locked.has(subject.id)) continue;
    if (rows.length === 1) { out.set(rows[0]!.id, subject); continue; }
    const same = rows.filter((r) => nameKey(r.name) === nameKey(subject.name));
    if (same.length === 1) out.set(same[0]!.id, subject);
  }
  return out;
}

export function resolveIdolPictures(input: ResolveInput): IdolPictureSet {
  const { idols, trivia, entities, photos, locked, base } = input;
  const triviaById = new Map(trivia.filter((p) => p.kind === 'idol').map((p) => [p.slug, p]));
  const subjects = subjectOf(idols, entities, locked);
  const photosOf = new Map<string, CardsPhotoRow[]>();
  for (const p of photos) photosOf.set(p.entity_id, [...(photosOf.get(p.entity_id) ?? []), p]);

  const thumbs: Record<string, IdolThumb> = {};
  const pictures: Record<string, DlePicture> = {};
  const credits: PublicPicture[] = [];
  const counts = { trivia: 0, cards: 0, none: 0 };

  for (const idol of idols) {
    const t = triviaById.get(idol.id);
    // 1. Trivia: the pool's licensed thumb, else the verified row's 96 px file.
    if (idol.thumb) { counts.trivia += 1; continue; }
    const tSrc = t ? httpsOrNull(t.thumb ?? t.url) : null;
    if (t && tSrc) {
      thumbs[idol.id] = { src: tSrc, position: t.position, from: 'trivia' };
      counts.trivia += 1;
      continue;
    }
    // 2. KpopCards.
    const subject = subjects.get(idol.id);
    const chosen = subject ? choosePhoto(photosOf.get(subject.id) ?? [], base) : null;
    if (!chosen) { counts.none += 1; continue; }
    const position = chosen.image.css ? `${Math.round(chosen.image.focalX)}% ${Math.round(chosen.image.focalY)}%` : CARD_FACE;
    thumbs[idol.id] = { src: chosen.src, position, from: 'cards' };
    pictures[idol.id] = { url: chosen.src, position: chosen.image.css ? position : '50% 30%' };
    counts.cards += 1;
    const needsCredit = chosen.license === 'cc_by' || chosen.license === 'cc_by_sa';
    if (needsCredit) {
      credits.push({
        site: 'kpop', kind: 'idol', slug: idol.id, url: chosen.src, thumb: chosen.src, position, name: idol.name, needsCredit: true,
        sourceUrl: httpsOrNull(chosen.photo.source_page), author: chosen.photo.author.trim(), license: chosen.license,
        licenseNote: 'Cropped for the game.', licenseUrl: httpsOrNull(chosen.photo.licence_url), commonsFile: null, updatedAt: '',
      });
    }
  }
  return { thumbs, pictures, credits, counts };
}
