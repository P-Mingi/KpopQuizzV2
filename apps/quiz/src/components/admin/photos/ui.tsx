'use client';

// Daily games step 2: the small pieces the panels of the Photos tab share (board Admin.dc.html): the drop zone, the focal point picker,
// the icon of the library, the licence fields, the live version of a slot.
import { useRef, useState } from 'react';

import { isFreeLicense } from '@/lib/photos/slots';

import s from './photos-admin.module.css';

import type { AssetVersion } from '@/lib/photos/admin-data';
import type { Focal, ImageLicense } from '@/lib/photos/slots';

export const UPLOAD_ICON = 'M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3';
export const PHOTO_ICON = 'M4 6h16v13H4zM8 13l3-3 5 5M14 12l2-2 4 4';

export function Svg({ d, size = 24, stroke = 'currentColor', width = 1.9 }: { d: string; size?: number; stroke?: string; width?: number }): React.ReactElement {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

/** A drop zone with its "Choisir un fichier" button; hands the first image file to `onFile`. */
export function DropZone({ title, hint, onFile, small, accept = 'image/jpeg,image/png,image/webp,image/gif,image/avif', button = 'Choisir un fichier', children }: {
  title: string; hint?: string; onFile: (f: File) => void; small?: boolean; accept?: string; button?: string; children?: React.ReactNode;
}): React.ReactElement {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div
      className={`${s.drop} ${small ? s.dropSm : ''} ${over ? s.dropOver : ''}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files?.[0]; if (f) onFile(f); }}
    >
      <Svg d={UPLOAD_ICON} size={26} stroke="#57514B" />
      <span className={s.dropTitle}>{title}</span>
      {hint ? <span className={s.dropHint}>{hint}</span> : null}
      {children}
      <button type="button" className={s.small} onClick={() => input.current?.click()}>{button}</button>
      <input ref={input} type="file" accept={accept} className={s.sr} tabIndex={-1} aria-hidden="true"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
    </div>
  );
}

/** The point of a click inside a box, from 0 to 100 on each axis. */
export function focalFromClick(e: React.MouseEvent<HTMLElement>): Focal {
  const r = e.currentTarget.getBoundingClientRect();
  const clamp = (n: number): number => Math.min(100, Math.max(0, Math.round(n)));
  return { x: clamp(((e.clientX - r.left) / r.width) * 100), y: clamp(((e.clientY - r.top) / r.height) * 100) };
}

/** A picture in a frame at its focal point, the dot on it; a click (or the arrow keys) moves the point. */
export function FocalFrame({ src, focal, onFocal, className, style, label, children }: {
  src: string | null; focal: Focal; onFocal: (f: Focal) => void; className: string | undefined; style?: React.CSSProperties; label: string; children?: React.ReactNode;
}): React.ReactElement {
  const key = (e: React.KeyboardEvent): void => {
    const step = 5;
    const m: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const d = m[e.key];
    if (!d) return;
    e.preventDefault();
    onFocal({ x: Math.min(100, Math.max(0, focal.x + d[0])), y: Math.min(100, Math.max(0, focal.y + d[1])) });
  };
  return (
    <button type="button" className={className} style={style} aria-label={label} onClick={(e) => onFocal(focalFromClick(e))} onKeyDown={key}>
      {/* eslint-disable-next-line @next/next/no-img-element -- the admin's own preview of a local file or a stored WebP */}
      {src ? <img src={src} alt="" style={{ objectPosition: `${focal.x}% ${focal.y}%` }} /> : null}
      <span aria-hidden="true" className={s.focalDot} style={{ left: `${focal.x}%`, top: `${focal.y}%` }} />
      {children}
    </button>
  );
}

// The icon of a slot (box and mark) is shared with the public pages: components/photos/icon-mark.tsx.
export { iconBox, IconMark } from '@/components/photos/icon-mark';

export interface MetaState { source: string; author: string; license: ImageLicense | ''; note: string }

/** The credit of a picture, in plain words; empty when it is complete. */
export function metaProblem(m: MetaState, sourceOptional = false): string | null {
  const src = m.source.trim();
  if (!src && !(sourceOptional && m.license === 'own_photo')) return 'Indique la page source de l\'image (https://).';
  if (src) {
    try {
      const u = new URL(src);
      if (u.protocol !== 'https:') return 'La page source doit commencer par https://.';
    } catch {
      return 'La page source doit être une adresse web complète (https://).';
    }
  }
  if (!m.author.trim()) return 'Indique l\'auteur ou le crédit, tel qu\'il doit s\'afficher.';
  if (m.author.trim().length > 200) return 'Le crédit est trop long (200 caractères au plus).';
  if (!m.license) return 'Choisis la licence.';
  if (m.license === 'other' && !m.note.trim()) return 'Précise la licence (obligatoire pour Autre).';
  return null;
}

/**
 * The credit of a picture of an entity (CR-021): the licence is one of the free ones, the author is required for CC BY and CC BY-SA, the source
 * page is optional (https when given), "other" needs the licence's name. Commons overrides all of it at save time, server side.
 */
export function photoMetaProblem(m: MetaState): string | null {
  const src = m.source.trim();
  if (src) {
    try {
      if (new URL(src).protocol !== 'https:') return 'La page source doit commencer par https://.';
    } catch {
      return 'La page source doit être une adresse web complète (https://).';
    }
  }
  if (!m.license || !isFreeLicense(m.license)) return 'Choisis la licence.';
  const author = m.author.trim();
  if (!author && (m.license === 'cc_by' || m.license === 'cc_by_sa')) return 'L\'auteur est obligatoire pour CC BY et CC BY-SA.';
  if (author.length > 200) return 'Le crédit est trop long (200 caractères au plus).';
  if (m.license === 'other' && !m.note.trim()) return 'Précise la licence (obligatoire pour Autre).';
  return null;
}

export const metaPayload = (m: MetaState): string => JSON.stringify({ source_url: m.source.trim(), author: m.author.trim(), license: m.license, license_note: m.note.trim() });

/** The live version of a key at `now`: the latest one published at or before it (the rule of site_assets_public). */
export function liveVersion(versions: readonly AssetVersion[], key: string, now: number): AssetVersion | null {
  let best: AssetVersion | null = null;
  for (const v of versions) {
    if (v.key !== key || !v.publishedAt) continue;
    const t = Date.parse(v.publishedAt);
    if (!(t <= now)) continue;
    if (v.url && !v.verified) continue;
    if (!best || t > Date.parse(best.publishedAt!) || (t === Date.parse(best.publishedAt!) && v.id > best.id)) best = v;
  }
  return best;
}

/** The next scheduled version of a key after `now`, if any. */
export function scheduledVersion(versions: readonly AssetVersion[], key: string, now: number): AssetVersion | null {
  return versions.filter((v) => v.key === key && v.publishedAt && Date.parse(v.publishedAt) > now)
    .sort((a, b) => Date.parse(a.publishedAt!) - Date.parse(b.publishedAt!))[0] ?? null;
}

/** A date for a person, in French (the admin's language). */
export const frDate = (iso: string): string => new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });
