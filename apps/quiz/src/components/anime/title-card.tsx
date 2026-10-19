import { TITLE_CARD_VIEW, titleCardSpec } from '@/lib/anime/title-card';

import type { TitleCardAccent } from '@/lib/anime/title-card';

interface TitleCardProps {
  readonly title: string;
  /** An accent token (without `--ux-`); default: one picked from the title. */
  readonly accent?: TitleCardAccent;
  /** 'wide' prints the title; 'mono' (row avatars) prints its initials. */
  readonly variant?: 'wide' | 'mono';
}

/**
 * A7: a typographic title card, a deterministic SVG from the title and an accent token, in place of a group logo or
 * photo (the hub hero, the row avatars, the trivia hero). No image of the work is used. Decorative: the title is
 * always printed next to it, so the SVG is hidden from assistive technology. Hooks-free (server or client).
 */
export function TitleCard({ title, accent, variant = 'wide' }: TitleCardProps): React.ReactElement {
  const spec = titleCardSpec(title, accent);
  const color = `var(--ux-${spec.accent})`;
  const { width, height } = TITLE_CARD_VIEW;
  const mono = variant === 'mono';
  const view = mono ? '0 0 100 100' : `0 0 ${width} ${height}`;
  const lineHeight = Math.round(spec.fontSize * 1.12);
  const top = height / 2 - ((spec.lines.length - 1) * lineHeight) / 2;
  return (
    <svg className={mono ? 'anime-o2-card anime-o2-card-sm' : 'anime-o2-card'} viewBox={view} preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <rect width={mono ? 100 : width} height={mono ? 100 : height} style={{ fill: 'var(--ux-surface-2)' }} />
      {mono ? (
        <>
          <circle cx="50" cy="50" r="46" style={{ fill: color, opacity: 0.22 }} />
          <text x="50" y="50" textAnchor="middle" dominantBaseline="central" className="anime-o2-card-mono" style={{ fill: 'var(--ux-ink)' }}>{spec.monogram.slice(0, 2)}</text>
        </>
      ) : (
        <>
          {spec.shapes.map((s, i) => (
            s.kind === 'ring'
              ? <circle key={i} cx={s.x} cy={s.y} r={s.size} strokeWidth="6" style={{ fill: 'none', stroke: color, opacity: s.opacity }} />
              : s.kind === 'dot'
                ? <circle key={i} cx={s.x} cy={s.y} r={s.size / 2} style={{ fill: color, opacity: s.opacity }} />
                : <rect key={i} x={s.x - s.size} y={s.y - 5} width={s.size * 2} height="10" transform={`rotate(-24 ${s.x} ${s.y})`} style={{ fill: color, opacity: s.opacity }} />
          ))}
          <rect x="0" y={height - 10} width={width} height="10" style={{ fill: color }} />
          <text textAnchor="middle" className="anime-o2-card-title" style={{ fill: 'var(--ux-ink)', fontSize: spec.fontSize }}>
            {spec.lines.map((line, i) => <tspan key={i} x={width / 2} y={top + i * lineHeight} dominantBaseline="central">{line}</tspan>)}
          </text>
        </>
      )}
    </svg>
  );
}
