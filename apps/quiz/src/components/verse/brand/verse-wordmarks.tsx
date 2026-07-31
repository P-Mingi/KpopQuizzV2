// The KpopVerse mark - the BUNNY-IN-ORBIT (owner-supplied, 2026-07-31): a black
// rabbit head ringed by the violet orbit with stars. Replaces the house-drawn
// orbit SVG everywhere the Verse brand appears; the lockup keeps the Pretendard
// "KpopVerse" lettering (Kpop in ink, Verse in violet). Assets live in
// public/verse/brand/ (transparent PNGs, square-padded at 512/192/64).
/* eslint-disable @next/next/no-img-element */

const VIOLET = '#7c5cfc';

type MarkProps = { size?: number };
type LockupProps = { height?: number; color?: string };

/** Full mark at header/OG scale (>=28px). Square box, transparent PNG. */
export function OrbitMark({ size = 40 }: MarkProps): React.ReactElement {
  return (
    <img src="/verse/brand/logo-192.png" width={size} height={size} alt="" role="img"
      aria-label="KpopVerse mark" style={{ display: 'block', objectFit: 'contain' }} />
  );
}

/** Favicon/small scale: the 64px derivative keeps edges crisp below ~24px. */
export function OrbitMarkSmall({ size = 32 }: MarkProps): React.ReactElement {
  return (
    <img src="/verse/brand/logo-64.png" width={size} height={size} alt="" role="img"
      aria-label="KpopVerse mark" style={{ display: 'block', objectFit: 'contain' }} />
  );
}

/** The lockup: bunny mark + "KpopVerse" (Kpop inherits the ink, Verse the violet). */
export function OrbitLockup({ height = 30, color = 'currentColor' }: LockupProps): React.ReactElement {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: height * 0.3 }}>
      <OrbitMark size={Math.round(height * 1.42)} />
      <span style={{ fontWeight: 800, fontSize: height * 0.74, letterSpacing: '-0.02em', color, lineHeight: 1 }}>
        Kpop<span style={{ color: VIOLET }}>Verse</span>
      </span>
    </span>
  );
}
