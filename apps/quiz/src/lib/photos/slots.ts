// Daily games step 2 (RAPPORT-JEUX-DU-JOUR-v2.md section 7, board docs/strategy/o1/dle/prototype/Admin.dc.html): what the Photos tab of
// the admin edits, as plain data. Pure, no I/O: the admin UI, the admin routes, the public reads and their tests all read this file.
// Tables: public.entity_images (018, 019, 022) for the pictures of the idols, groups, agencies, series and characters; public.site_assets
// (022) for the banners, card images, icons and stickers of the pages of bunnyverse.org.

import { LICENSES } from '@/lib/entity-images/constants';

import type { ImageLicense } from '@/lib/entity-images/constants';

export { LICENSES };
export type { ImageLicense };

// ---- pictures of entities (entity_images) ----------------------------------------------------------------------------------------

export type PhotoKind = 'idol' | 'group' | 'agency' | 'character' | 'series';
export const PHOTO_KINDS: readonly PhotoKind[] = ['idol', 'group', 'agency', 'character', 'series'];

/** The site of each kind's rows: the kpop entities on kpop, the anime ones on anime (022's entity_images_kind_site_check). */
export const KIND_SITE: Readonly<Record<PhotoKind, 'kpop' | 'anime'>> = {
  idol: 'kpop', group: 'kpop', agency: 'kpop', character: 'anime', series: 'anime',
};

export interface Box { readonly w: number; readonly h: number }

/**
 * The stored files of a picture: the 1x box, the 2x file (twice the 1x, the name lib/entity-images gives it, so the anime display that reads
 * path and its -2x keeps working) and the 96 px square of the games (thumb_path, read by the dle view of 020). The board crops to 4:5 around
 * the focal point; series and characters keep the boxes of the anime admin (lib/entity-images/constants.ts SIZES, 3:4).
 */
export const PHOTO_BOX: Readonly<Record<PhotoKind, Box>> = {
  idol: { w: 400, h: 500 },
  group: { w: 400, h: 500 },
  agency: { w: 400, h: 500 },
  series: { w: 736, h: 981 },
  character: { w: 360, h: 480 },
};
export const THUMB_BOX: Box = { w: 96, h: 96 };

/** A source smaller than half of the 1x box in either side is refused (the rule of the anime admin, MIN_SOURCE_FRACTION). */
export const MIN_SOURCE_FRACTION = 0.5;

/** The slug of a picture: the id of the idol, group or agency; the series slug; '<series>/<character>'. 022's entity_images_slug_check. */
export function isPhotoSlug(kind: PhotoKind, slug: string): boolean {
  if (kind === 'series') return /^[a-z0-9][a-z0-9-]{0,59}$/.test(slug);
  if (kind === 'character') return /^[a-z0-9][a-z0-9-]{0,59}\/[a-z0-9][a-z0-9-]{0,59}$/.test(slug);
  return /^[1-9][0-9]{0,18}$/.test(slug);
}

export function isPhotoKind(v: unknown): v is PhotoKind {
  return typeof v === 'string' && (PHOTO_KINDS as readonly string[]).includes(v);
}

/** The folder of a picture in the bucket entity-images: <site>/<kind>/<slug> (the scheme of lib/entity-images folderOf). */
export function photoFolder(kind: PhotoKind, slug: string): string {
  return `${KIND_SITE[kind]}/${kind}/${slug}`;
}

// ---- the admin's tabs, as the board names them ----------------------------------------------------------------------------------

export type TabId = 'idols' | 'groups' | 'labels' | 'chars' | 'series' | 'banners' | 'icons' | 'stickers';

export const TABS: readonly { readonly id: TabId; readonly label: string; readonly kind?: PhotoKind }[] = [
  { id: 'idols', label: 'Idols', kind: 'idol' },
  { id: 'groups', label: 'Groupes', kind: 'group' },
  { id: 'labels', label: 'Agences', kind: 'agency' },
  { id: 'chars', label: 'Personnages anime', kind: 'character' },
  { id: 'series', label: 'Séries anime', kind: 'series' },
  { id: 'banners', label: 'Bannières et images' },
  { id: 'icons', label: 'Icônes du jeu' },
  { id: 'stickers', label: 'Stickers' },
];

export function tabOf(raw: unknown): TabId {
  return TABS.find((t) => t.id === raw)?.id ?? 'idols';
}

/** The filters of the photo tabs: no picture at all, a picture whose licence is not verified, everything. */
export type PhotoFilter = 'none' | 'tocheck' | 'all';

// ---- the banners and card images (site_assets, types banner and card_image) ------------------------------------------------------

export type AssetType = 'banner' | 'card_image' | 'icon' | 'sticker';

export interface ImageSlot {
  /** The site_assets key. */
  readonly key: string;
  readonly type: 'banner' | 'card_image';
  /** The page of bunnyverse.org it decorates (site_assets.page). */
  readonly page: string;
  readonly name: string;
  /** Where it shows, as the board's card says it. */
  readonly where: string;
  /** The board's empty background of the slot (its gradient) and accent. */
  readonly bg: string;
  readonly accent: string;
  /** The desktop frame of the preview (CSS aspect-ratio). */
  readonly ratio: string;
  /** Shown when the slot has no image of its own: it falls back to another slot (a series page to Otakudle's). */
  readonly fallback?: string;
}

const K_BG = 'linear-gradient(120deg, #FCE8EF 0%, #F8DCE6 55%, #FFF1E6 100%)';
const A_BG = 'linear-gradient(120deg, #FFF1E6 0%, #FBE1CC 55%, #FCE8EF 100%)';
const K_ACC = '#D13A6E';
const A_ACC = '#C2410C';

/**
 * The six cards of the board (the banners of the three pages and of One Piece, the two card images), then the image slots of the home v3
 * that the board's README asks to add (lib/site/hub/home-assets.ts HOME_ASSET_KEYS, keyed by HOME_SLOT_KEY; the two game cards are the board's).
 * Keys are lower case (022's site_assets_key_check).
 */
export const IMAGE_SLOTS: readonly ImageSlot[] = [
  { key: 'banner:kpopdle', type: 'banner', page: 'kpopdle', name: 'Kpopdle', where: 'bunnyverse.org/kpopdle', bg: K_BG, accent: K_ACC, ratio: '16 / 5' },
  { key: 'banner:otakudle', type: 'banner', page: 'otakudle', name: 'Otakudle', where: 'bunnyverse.org/otakudle', bg: A_BG, accent: A_ACC, ratio: '16 / 5' },
  { key: 'banner:daily', type: 'banner', page: 'daily', name: 'Le Terrier', where: 'bunnyverse.org/daily', bg: 'linear-gradient(120deg, #F1EFEA 0%, #FCE8EF 50%, #FFF1E6 100%)', accent: '#1F1B17', ratio: '16 / 5' },
  { key: 'banner:otakudle/one-piece', type: 'banner', page: 'otakudle/one-piece', name: 'Otakudle One Piece', where: 'bunnyverse.org/otakudle/one-piece', bg: 'linear-gradient(120deg, #FFF1E6 0%, #F7CBA8 100%)', accent: A_ACC, ratio: '16 / 5', fallback: 'banner:otakudle' },
  { key: 'home:kpopdle', type: 'card_image', page: 'home', name: 'Image de la carte Kpopdle', where: 'homepage, Le Terrier', bg: 'linear-gradient(160deg, #FCE8EF 0%, #F3BFD1 100%)', accent: K_ACC, ratio: '4 / 3' },
  { key: 'home:otakudle', type: 'card_image', page: 'home', name: 'Image de la carte Otakudle', where: 'homepage, Le Terrier', bg: 'linear-gradient(160deg, #FFF1E6 0%, #F7CBA8 100%)', accent: A_ACC, ratio: '4 / 3' },
  { key: 'home:site-k', type: 'card_image', page: 'home', name: 'Image du site KpopQuiz', where: 'homepage, rangée 1', bg: K_BG, accent: K_ACC, ratio: '3 / 2' },
  { key: 'home:site-a', type: 'card_image', page: 'home', name: 'Image du site OtakuQuiz', where: 'homepage, rangée 1', bg: A_BG, accent: A_ACC, ratio: '3 / 2' },
  { key: 'home:qotd-k', type: 'card_image', page: 'home', name: 'Vignette du quiz du jour K-pop', where: 'homepage, Today', bg: K_BG, accent: K_ACC, ratio: '1 / 1' },
  { key: 'home:qotd-a', type: 'card_image', page: 'home', name: 'Vignette du quiz du jour anime', where: 'homepage, Today', bg: A_BG, accent: A_ACC, ratio: '1 / 1' },
  { key: 'home:debate', type: 'card_image', page: 'home', name: 'Vignette du débat du jour', where: 'homepage, Today', bg: 'linear-gradient(120deg, #F1EFEA 0%, #FCE8EF 100%)', accent: '#1F1B17', ratio: '1 / 1' },
  { key: 'home:cross-1', type: 'card_image', page: 'home', name: 'Crossover, vignette 1', where: 'homepage, rangée 3', bg: K_BG, accent: K_ACC, ratio: '3 / 2' },
  { key: 'home:cross-2', type: 'card_image', page: 'home', name: 'Crossover, vignette 2', where: 'homepage, rangée 3', bg: A_BG, accent: A_ACC, ratio: '3 / 2' },
  { key: 'home:cross-3', type: 'card_image', page: 'home', name: 'Crossover, vignette 3', where: 'homepage, rangée 3', bg: 'linear-gradient(120deg, #F1EFEA 0%, #FFF1E6 100%)', accent: '#1F1B17', ratio: '3 / 2' },
];

/** The site_assets key of each image slot of the home v3 (lib/site/hub/home-assets.ts reads them through site_assets_public). */
export const HOME_SLOT_KEY = {
  siteK: 'home:site-k', siteA: 'home:site-a', kpopdle: 'home:kpopdle', otakudle: 'home:otakudle', qotdK: 'home:qotd-k',
  qotdA: 'home:qotd-a', debate: 'home:debate', cross1: 'home:cross-1', cross2: 'home:cross-2', cross3: 'home:cross-3',
} as const;

/** The widths of the stored files of a banner or a card image: the large one (1920, never enlarged), 400 and 96. */
export const ASSET_WIDTHS = { large: 1920, mid: 400, thumb: 96 } as const;
/** An icon or a sticker: one 400 px file and its 96 px one (a sticker is at most 260 px wide on the page). */
export const SMALL_ASSET_WIDTHS = { large: 400, thumb: 96 } as const;

// ---- the icons of the games (site_assets, type icon) ------------------------------------------------------------------------------

/** The library of the board (24 by 24, stroke icons), by name. */
export const ICON_LIBRARY: Readonly<Record<string, string>> = {
  idol: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5c1.4-3.6 4.2-5.5 7.5-5.5s6.1 1.9 7.5 5.5M19.5 2.5v3M18 4h3',
  group: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM17 11.5a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6zM2.5 20c1-3.4 3.6-5.3 6.5-5.3s5.5 1.9 6.5 5.3M15.6 14.8c2.6.1 4.6 1.7 5.6 4.6',
  song: 'M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM9 9l11-2',
  hidden: 'M8 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM16 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2.5 20c.8-3 3-4.8 5.5-4.8M21.5 20c-.8-3-3-4.8-5.5-4.8M10.2 14.6a1.9 1.9 0 1 1 2.5 1.8c-.5.2-.7.6-.7 1.1M12 20.2v.1',
  char: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5c1.4-3.6 4.2-5.5 7.5-5.5s6.1 1.9 7.5 5.5M18.5 2l.9 1.9 1.9.9-1.9.9-.9 1.9-.9-1.9-1.9-.9 1.9-.9z',
  tv: 'M3 7h18v12H3zM8 3l4 4 4-4M7 11h6M7 15h4',
  books: 'M4 4h4v16H4zM10 4h4v16h-4zM16 5.2l3.9-1 2.6 15.5-3.9 1z',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM12 1.5v2M4.6 4.6l1.4 1.4M19.4 4.6L18 6',
  bulb: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z',
  help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.2a2.6 2.6 0 0 1 5 .9c0 1.8-2.5 2.2-2.5 3.9M12 17.2v.1',
  star: 'M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.8l-5.3 2.6 1.2-6-4.5-4.1 6-.7z',
  sparkle: 'M12 3c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7z',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3',
  crown: 'M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z',
  light: 'M12 2a4 4 0 0 1 4 4c0 2.2-1.8 4-4 4s-4-1.8-4-4a4 4 0 0 1 4-4zM12 10v12M9 22h6',
};

/** The colours of the circle: [ink, soft ground, name]. */
export const ICON_COLORS: Readonly<Record<'k' | 'a' | 'ink' | 'w', readonly [string, string, string]>> = {
  k: ['#D13A6E', '#FCE8EF', 'Rose'],
  a: ['#C2410C', '#FFF1E6', 'Orange'],
  ink: ['#1F1B17', '#ECE8E3', 'Encre'],
  w: ['#FFFFFF', '#F7F5F1', 'Blanc'],
};
export type IconColor = keyof typeof ICON_COLORS;

export interface IconSettings {
  readonly mode: 'icon' | 'png';
  /** A name of ICON_LIBRARY. */
  readonly icon: string;
  readonly circle: boolean;
  readonly color: IconColor;
}

export interface IconSlot { readonly id: string; readonly name: string; readonly where: string; readonly page: string; readonly defaults: IconSettings }

/** The 11 places of the board (4 steps of Kpopdle, 3 of Otakudle, 2 links at the foot, 2 titles), with the board's defaults. */
export const ICON_GROUPS: readonly { readonly title: string; readonly items: readonly IconSlot[] }[] = [
  { title: 'Kpopdle, étapes', items: [
    { id: 'k-idol', name: 'Idol', where: 'Étape 1, au-dessus de la saisie', page: 'kpopdle', defaults: { mode: 'icon', icon: 'idol', circle: true, color: 'k' } },
    { id: 'k-group', name: 'Groupe', where: 'Étape 2', page: 'kpopdle', defaults: { mode: 'icon', icon: 'group', circle: true, color: 'k' } },
    { id: 'k-song', name: 'Chanson', where: 'Étape 3', page: 'kpopdle', defaults: { mode: 'icon', icon: 'song', circle: true, color: 'k' } },
    { id: 'k-hidden', name: 'Membres cachés', where: 'Étape 4', page: 'kpopdle', defaults: { mode: 'icon', icon: 'hidden', circle: true, color: 'k' } },
  ] },
  { title: 'Otakudle, étapes', items: [
    { id: 'o-char', name: 'Personnage', where: 'Étape 1', page: 'otakudle', defaults: { mode: 'icon', icon: 'char', circle: true, color: 'a' } },
    { id: 'o-series', name: 'Série du jour', where: 'Étape 2', page: 'otakudle', defaults: { mode: 'icon', icon: 'tv', circle: true, color: 'a' } },
    { id: 'o-by', name: 'Par série', where: 'Étape 3', page: 'otakudle', defaults: { mode: 'icon', icon: 'books', circle: true, color: 'a' } },
  ] },
  { title: 'Liens en bas de page', items: [
    { id: 'link-o', name: 'Vers Otakudle', where: 'Bas de la page Kpopdle', page: 'kpopdle', defaults: { mode: 'icon', icon: 'eye', circle: true, color: 'a' } },
    { id: 'link-k', name: 'Vers Kpopdle', where: 'Bas de la page Otakudle', page: 'otakudle', defaults: { mode: 'icon', icon: 'idol', circle: true, color: 'k' } },
  ] },
  { title: 'Titres', items: [
    { id: 'hints', name: 'Indices', where: 'Titre au-dessus des indices', page: 'kpopdle', defaults: { mode: 'icon', icon: 'bulb', circle: false, color: 'k' } },
    { id: 'howto', name: 'Comment jouer', where: 'Titre du toggle', page: 'kpopdle', defaults: { mode: 'icon', icon: 'help', circle: false, color: 'k' } },
  ] },
];

export const ICON_SLOTS: readonly IconSlot[] = ICON_GROUPS.flatMap((g) => g.items);
export const iconKey = (id: string): string => `icon:${id}`;

/** The settings of an icon as stored, checked against the lists above (a stored value is never trusted); null when it is not one. */
export function parseIconSettings(v: unknown): IconSettings | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  const mode = o.mode === 'png' ? 'png' : o.mode === 'icon' ? 'icon' : null;
  const icon = typeof o.icon === 'string' && Object.prototype.hasOwnProperty.call(ICON_LIBRARY, o.icon) ? o.icon : null;
  const color = typeof o.color === 'string' && Object.prototype.hasOwnProperty.call(ICON_COLORS, o.color) ? (o.color as IconColor) : null;
  if (!mode || !icon || !color || typeof o.circle !== 'boolean') return null;
  return { mode, icon, circle: o.circle, color };
}

// ---- the stickers (site_assets, type sticker) --------------------------------------------------------------------------------------

export const STICKER_PAGES: readonly { readonly id: string; readonly label: string }[] = [
  { id: 'kpopdle', label: 'Kpopdle' },
  { id: 'otakudle', label: 'Otakudle' },
  { id: 'daily', label: 'Le Terrier' },
  { id: 'home', label: 'Homepage' },
];

export interface StickerSettings {
  readonly side: 'left' | 'right';
  /** px from the side, px from the top, width in px, degrees, percent. The board's ranges. */
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly r: number;
  readonly o: number;
  readonly mirror: boolean;
  readonly anim: boolean;
}

export const STICKER_RANGES: Readonly<Record<'x' | 'y' | 'w' | 'r' | 'o', readonly [number, number]>> = {
  x: [0, 220], y: [0, 520], w: [60, 260], r: [-45, 45], o: [30, 100],
};

export const NEW_STICKER: StickerSettings = { side: 'left', x: 10, y: 200, w: 140, r: 0, o: 100, mirror: false, anim: true };

/** The settings of a sticker as stored, every number clamped to the board's range; null when it is not one. */
export function parseStickerSettings(v: unknown): StickerSettings | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  if (o.side !== 'left' && o.side !== 'right') return null;
  const num = (k: keyof typeof STICKER_RANGES): number | null => {
    const n = o[k];
    if (typeof n !== 'number' || !Number.isFinite(n)) return null;
    const [lo, hi] = STICKER_RANGES[k];
    return Math.min(hi, Math.max(lo, Math.round(n)));
  };
  const x = num('x'), y = num('y'), w = num('w'), r = num('r'), op = num('o');
  if (x === null || y === null || w === null || r === null || op === null) return null;
  return { side: o.side, x, y, w, r, o: op, mirror: o.mirror === true, anim: o.anim === true };
}

export const stickerKey = (page: string, id: string): string => `sticker:${page}:${id}`;

// ---- focal point ------------------------------------------------------------------------------------------------------------------

export interface Focal { readonly x: number; readonly y: number }
export const CENTER: Focal = { x: 50, y: 50 };

/** A focal point as stored: two numbers from 0 to 100; the middle otherwise. */
export function parseFocal(v: unknown): Focal {
  if (!v || typeof v !== 'object') return CENTER;
  const o = v as Record<string, unknown>;
  const ok = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 100;
  return ok(o.x) && ok(o.y) ? { x: Math.round(o.x * 100) / 100, y: Math.round(o.y * 100) / 100 } : CENTER;
}

export const objectPosition = (f: Focal): string => `${Math.round(f.x)}% ${Math.round(f.y)}%`;

// ---- licences -----------------------------------------------------------------------------------------------------------------------

/** The licences the photo form offers, in the board's order and words. */
export const PHOTO_LICENSE_OPTIONS: readonly { readonly value: ImageLicense; readonly label: string }[] = [
  { value: 'cc_by', label: 'CC BY' },
  { value: 'cc_by_sa', label: 'CC BY-SA' },
  { value: 'cc0', label: 'CC0' },
  { value: 'public_domain', label: 'Domaine public' },
  { value: 'own_photo', label: 'Photo personnelle' },
  { value: 'licensed', label: 'Sous licence, accord écrit' },
  { value: 'other', label: 'Autre, à préciser' },
];

/** The licences the banner form offers (the board's list: no "other", no public domain). */
export const BANNER_LICENSE_OPTIONS: readonly { readonly value: ImageLicense; readonly label: string }[] = [
  { value: 'cc_by', label: 'CC BY' },
  { value: 'cc_by_sa', label: 'CC BY-SA' },
  { value: 'cc0', label: 'CC0' },
  { value: 'own_photo', label: 'Photo ou illustration à nous' },
  { value: 'licensed', label: 'Sous licence, accord écrit' },
];

export function isLicense(v: unknown): v is ImageLicense {
  return typeof v === 'string' && (LICENSES as readonly string[]).includes(v);
}
