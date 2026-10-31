// Daily games step 2: what the admin routes of the Photos tab accept. Pure. Every value is checked against the lists of slots.ts; nothing
// the browser sends is trusted (a key, a setting, a date).
import { ImageError } from '@/lib/entity-images/errors';
import { parseMeta } from '@/lib/entity-images/validate';

import {
  ICON_SLOTS, IMAGE_SLOTS, STICKER_PAGES, iconKey, isLicense, isPhotoKind, isPhotoSlug, parseFocal, parseIconSettings, parseStickerSettings,
} from './slots';

import type { ImageMeta } from '@/lib/entity-images/types';
import type { AssetSlotRef } from './store';
import type { Focal, PhotoKind } from './slots';

export function parsePhotoTarget(kind: unknown, slug: unknown): { kind: PhotoKind; slug: string } {
  if (!isPhotoKind(kind)) throw new ImageError('bad_kind', 400, 'Le type de fiche n\'est pas valide.');
  if (typeof slug !== 'string' || !isPhotoSlug(kind, slug)) throw new ImageError('bad_slug', 400, 'La fiche n\'est pas valide.');
  return { kind, slug };
}

export const parseFlag = (v: unknown): boolean => v === '1' || v === 'true' || v === true;

/** A focal point sent as two numbers (form fields or JSON). */
export function parseFocalFields(x: unknown, y: unknown): Focal {
  const n = (v: unknown): number => (typeof v === 'string' && v.trim() !== '' ? Number(v) : typeof v === 'number' ? v : NaN);
  const fx = n(x), fy = n(y);
  if (!Number.isFinite(fx) || !Number.isFinite(fy) || fx < 0 || fx > 100 || fy < 0 || fy > 100) {
    throw new ImageError('bad_focal', 400, 'Le point focal doit être deux nombres de 0 à 100.');
  }
  return parseFocal({ x: fx, y: fy });
}

/** The credit of a picture of an entity: source page (https), author, licence (the rules of the anime admin, parseMeta). */
export function parsePhotoMeta(raw: unknown): ImageMeta {
  return parseMeta(raw);
}

/** The credit of a site asset. An illustration of our own ('own_photo') needs no source page; every other licence does. */
export function parseAssetMeta(raw: unknown): ImageMeta {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    const source = typeof o.source_url === 'string' ? o.source_url.trim() : '';
    if (o.license === 'own_photo' && source === '') {
      const author = typeof o.author === 'string' ? o.author.trim() : '';
      if (!author || author.length > 200) throw new ImageError('bad_meta', 400, 'Le crédit est obligatoire (200 caractères au plus).');
      return { source_url: '', author, license: 'own_photo', license_note: null };
    }
  }
  return parseMeta(raw);
}

const STICKER_ID = /^[a-z0-9]{6,16}$/;

/** The slot a key names: one of the image slots, one of the 11 icons, or a sticker of one of the 4 pages. */
export function parseAssetSlot(key: unknown): AssetSlotRef {
  if (typeof key !== 'string') throw new ImageError('bad_request', 400, 'L\'emplacement n\'est pas valide.');
  const img = IMAGE_SLOTS.find((s) => s.key === key);
  if (img) return { key, type: img.type, page: img.page };
  const icon = ICON_SLOTS.find((s) => iconKey(s.id) === key);
  if (icon) return { key, type: 'icon', page: icon.page };
  const m = /^sticker:([a-z]+):([a-z0-9]+)$/.exec(key);
  if (m && STICKER_PAGES.some((p) => p.id === m[1]) && STICKER_ID.test(m[2]!)) return { key, type: 'sticker', page: m[1]! };
  throw new ImageError('bad_request', 400, 'L\'emplacement n\'est pas valide.');
}

/** The settings of a version, rebuilt from the lists (never stored as sent). */
export function parseAssetSettings(slot: AssetSlotRef, raw: unknown): Record<string, unknown> {
  const o = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  if (slot.type === 'banner' || slot.type === 'card_image') return { focal: parseFocal(o.focal) };
  if (slot.type === 'icon') {
    const s = parseIconSettings(o);
    if (!s) throw new ImageError('bad_request', 400, 'Les réglages de l\'icône ne sont pas valides.');
    return { ...s };
  }
  const s = parseStickerSettings(o);
  if (!s) throw new ImageError('bad_request', 400, 'Les réglages du sticker ne sont pas valides.');
  return { ...s };
}

/** 'now', 'draft' (null) or a date from now to two years ahead ("programmer une date"). */
export function parsePublish(v: unknown, now: Date = new Date()): 'now' | Date | null {
  if (v === 'now') return 'now';
  if (v === 'draft' || v === undefined || v === null || v === '') return null;
  if (typeof v === 'string') {
    const d = new Date(v);
    const max = now.getTime() + 2 * 366 * 86400000;
    if (Number.isFinite(d.getTime()) && d.getTime() > now.getTime() - 60000 && d.getTime() <= max) return d;
  }
  throw new ImageError('bad_request', 400, 'La date de publication n\'est pas valide (de maintenant à deux ans).');
}

export { isLicense };
