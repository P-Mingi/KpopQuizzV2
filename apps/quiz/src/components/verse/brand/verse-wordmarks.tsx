// The KpopVerse mark - the chosen ORBIT direction (uni-verse: fandom spaces orbit
// one core). Flat violet (no gradient), house-drawn SVG + Pretendard lettering, no
// new fonts. Header/OG use the full mark (with the space on the path); favicons use
// the ring+core variant (the orbiting dot muddies below ~24px). Other pitched
// directions were removed after the owner's pick (V-IDENTITY step 1).

const VIOLET = '#7c5cfc';

type MarkProps = { size?: number };
type LockupProps = { height?: number; color?: string };

/** Full orbit mark: ring + core + a space on the path. Header/OG scale (>=28px). */
export function OrbitMark({ size = 40 }: MarkProps): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="KpopVerse orbit mark">
      <circle cx="24" cy="24" r="5.6" fill={VIOLET} />
      <g transform="rotate(-22 24 24)">
        <ellipse cx="24" cy="24" rx="19" ry="8.6" fill="none" stroke={VIOLET} strokeWidth="3" />
        <circle cx="43" cy="24" r="3.1" fill={VIOLET} />
      </g>
    </svg>
  );
}

/** Favicon-scale variant: ring + core only, thicker ring (the orbiting dot muddies
 * into the ring below ~24px). Use for favicons. */
export function OrbitMarkSmall({ size = 32 }: MarkProps): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="KpopVerse mark">
      <circle cx="24" cy="24" r="6.6" fill={VIOLET} />
      <ellipse cx="24" cy="24" rx="20" ry="10" fill="none" stroke={VIOLET} strokeWidth="4.2" transform="rotate(-20 24 24)" />
    </svg>
  );
}

/** The lockup: orbit mark + "KpopVerse" (Kpop inherits the ink, Verse the violet). */
export function OrbitLockup({ height = 30, color = 'currentColor' }: LockupProps): React.ReactElement {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: height * 0.34 }}>
      <OrbitMark size={Math.round(height * 1.36)} />
      <span style={{ fontWeight: 800, fontSize: height * 0.74, letterSpacing: '-0.02em', color, lineHeight: 1 }}>
        Kpop<span style={{ color: VIOLET }}>Verse</span>
      </span>
    </span>
  );
}
