import { useId } from 'react';

import { badgeRarity, RARITY_LABEL } from '@/lib/badges';
import { badgeGlyph, RARITY_ART } from '@/lib/ux-v1/a0/badge-art';

import type { Rarity } from '@/lib/badges';

interface BadgeMedalProps {
  /** badge_definitions.id (user_badges.badge_id). */
  id: string;
  /** Defaults to lib/badges.ts badgeRarity(id), the single source of truth. */
  rarity?: Rarity;
  earned: boolean;
  /** 64 grids, 32 community rail, 28 next to the passport name, 22 settings picker. */
  size?: number;
  /** Accessible name; decorative (aria-hidden) when omitted because the badge
   *  name is always printed next to it. */
  label?: string;
  className?: string;
}

/**
 * SVG badge medallion (DESIGN-SPEC 17.8, v11.1): the rarity sets the frame shape
 * (common circle, uncommon rounded square, rare hexagon, epic shield, legendary
 * 12-point star) and the gradient; the badge sets a unique glyph. Earned: soft
 * white highlight, inner ring at 80% (white 45%), white glyph, rarity-coloured
 * drop shadow. Locked: surface-2 fill, dashed edge ring, muted glyph. No PNG, no
 * mascot art. Server-safe (useId only).
 */
export function BadgeMedal({ id, rarity, earned, size = 64, label, className }: BadgeMedalProps): React.ReactElement {
  const uid = `m${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const r = rarity ?? badgeRarity(id);
  const art = RARITY_ART[r];
  // Token colours go through style= (CSS), never presentation attributes, so the
  // locked state follows the light / dark tokens.
  const paint = earned ? `url(#${uid}g)` : 'var(--ux-surface-2)';
  const ring = earned ? 'rgba(255,255,255,.45)' : 'var(--ux-edge)';
  const ink = earned ? '#fff' : 'var(--ux-muted)';
  const inner =
    `<defs><linearGradient id="${uid}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${art.from}"/><stop offset="1" stop-color="${art.to}"/></linearGradient>` +
    `<clipPath id="${uid}c">${art.shape}</clipPath></defs>` +
    `<g style="fill:${paint};stroke:${paint}" stroke-width="5" stroke-linejoin="round">${art.shape}</g>` +
    (earned ? `<ellipse cx="36" cy="18" rx="26" ry="14" fill="#fff" opacity=".16" clip-path="url(#${uid}c)"/>` : '') +
    `<g transform="translate(36 36) scale(.8) translate(-36 -36)" fill="none" style="stroke:${ring}" stroke-width="1.6" stroke-linejoin="round"${earned ? '' : ' stroke-dasharray="3 4"'}>${art.shape}</g>` +
    `<g transform="translate(21 21) scale(1.25)" fill="none" style="stroke:${ink}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${badgeGlyph(id)}</g>`;
  return (
    <svg
      className={['ux-bmed', earned ? 'is-earned' : 'is-locked', `ux-r-${r}`, className ?? ''].filter(Boolean).join(' ')}
      viewBox="0 0 72 72"
      width={size}
      height={size}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      style={{ ['--ux-rc' as string]: art.ink }}
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  );
}

/** Frame only, for the rarity legend ("colour and shape show rarity"), 16px. */
export function RarityFrame({ rarity, size = 16 }: { rarity: Rarity; size?: number }): React.ReactElement {
  const uid = `f${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const art = RARITY_ART[rarity];
  const inner =
    `<defs><linearGradient id="${uid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${art.from}"/><stop offset="1" stop-color="${art.to}"/></linearGradient></defs>` +
    `<g fill="url(#${uid})" stroke="url(#${uid})" stroke-width="5" stroke-linejoin="round">${art.shape}</g>`;
  return <svg viewBox="0 0 72 72" width={size} height={size} aria-hidden="true" focusable="false" dangerouslySetInnerHTML={{ __html: inner }} />;
}

/** The rarity legend row: five frames + labels. */
export function RarityKey({ className }: { className?: string }): React.ReactElement {
  const order: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
  return (
    <div className={['ux-rarkey', className ?? ''].filter(Boolean).join(' ')}>
      {order.map((r) => <span key={r}><RarityFrame rarity={r} />{RARITY_LABEL[r]}</span>)}
    </div>
  );
}

interface MedalTileProps {
  id: string;
  name: string;
  description: string;
  earned: boolean;
  rarity?: Rarity;
}

/** Badge grid tile (passport Badges tab): 64px medallion, name, rarity word in
 *  its colour, description (or "Locked · description"). Tilts on hover when earned. */
export function MedalTile({ id, name, description, earned, rarity }: MedalTileProps): React.ReactElement {
  const r = rarity ?? badgeRarity(id);
  return (
    <div className={['ux-medal2', `ux-r-${r}`, earned ? 'is-earned' : 'is-locked'].join(' ')} title={description}>
      <span className="ux-medal2-i"><BadgeMedal id={id} rarity={r} earned={earned} size={64} /></span>
      <b>{name}</b>
      <span className="ux-medal2-rar">{RARITY_LABEL[r]}</span>
      <small>{earned ? description : `Locked · ${description}`}</small>
    </div>
  );
}
