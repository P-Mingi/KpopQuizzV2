// An icon slot of the admin's "Icônes du jeu" (lib/photos/slots.ts), drawn the way the admin previews it: the library's stroke path or the
// owner's PNG, in a circle of its colour or bare. Shared by the admin's Photos tab and the public pages of bunnyverse.org (the dle games, the
// home): no directive and no hook, so a server component and a client one can both draw it. `slot` names the icon slot in the DOM
// (data-slot-icon), so a test or a screenshot script can find what each slot drew.
import { ICON_COLORS, ICON_LIBRARY } from '@/lib/photos/slots';

import type { IconSettings } from '@/lib/photos/slots';

/** The three states of the board: the step being played (solid), a step done or a row (soft ground), a step to come (white, grey). */
export type IconState = 'current' | 'done' | 'next';

export function iconBox(cfg: IconSettings, state: IconState, size: number): React.CSSProperties {
  const c = ICON_COLORS[cfg.color];
  const white = c[0] === '#FFFFFF';
  if (!cfg.circle) return { display: 'grid', placeItems: 'center', width: size, height: size, color: state === 'next' ? '#57514B' : white ? '#1F1B17' : c[0], flex: 'none' };
  const bg = state === 'current' ? c[0] : state === 'done' ? c[1] : '#FFFFFF';
  const fg = state === 'current' ? (white ? '#1F1B17' : '#FFFFFF') : state === 'done' ? (white ? '#1F1B17' : c[0]) : '#57514B';
  return { display: 'grid', placeItems: 'center', width: size, height: size, borderRadius: '50%', background: bg, color: fg, flex: 'none', ...(state === 'next' ? { boxShadow: 'inset 0 0 0 1.5px #E5E0DA' } : {}) };
}

/** An icon (the library's path, or a PNG) inside its state box. Decorative: the name of the game or row is always in the text beside it. */
export function IconMark({ cfg, png, state, size, glyph, slot }: {
  cfg: IconSettings; png: string | null; state: IconState; size: number; glyph: number; slot?: string;
}): React.ReactElement {
  const img = cfg.circle ? Math.round(size * 0.62) : Math.round(size * 0.86);
  return (
    <span style={iconBox(cfg, state, size)} data-slot-icon={slot} data-slot-mode={slot ? (cfg.mode === 'png' && png ? 'png' : 'icon') : undefined}>
      {cfg.mode === 'png' && png
        // eslint-disable-next-line @next/next/no-img-element -- a 96 px file made at upload; no image optimisation on these builds
        ? <img src={png} alt="" width={img} height={img} style={{ width: img, height: img, objectFit: 'contain', opacity: state === 'next' && !cfg.circle ? 0.45 : 1 }} />
        : (
          <svg aria-hidden="true" width={glyph} height={glyph} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
            <path d={ICON_LIBRARY[cfg.icon] ?? ICON_LIBRARY.idol!} />
          </svg>
        )}
    </span>
  );
}
