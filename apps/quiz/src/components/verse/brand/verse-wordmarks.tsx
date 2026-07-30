// V-IDENTITY step 1 - three Verse wordmark DIRECTIONS, house-drawn. Flat violet
// (no gradient: the frontend-design skill flags purple gradients as slop), custom
// SVG marks + Pretendard lettering (no new fonts). Each direction ships a MARK
// (favicon-scale) and a LOCKUP (mark + wordmark). Colour: the violet world accent.

const VIOLET = '#7c5cfc';

type MarkProps = { size?: number };
type LockupProps = { height?: number; color?: string };

/* ============================================================
   DIRECTION 1 - PORTAL V. Concept: Verse is the doorway into your fandom's
   home. A filled violet tile with a white V-gateway and a spark entering it.
   App-icon confident; the most "product" of the three.
   ============================================================ */
export function PortalMark({ size = 40 }: MarkProps): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="Verse portal mark">
      <rect x="3" y="3" width="42" height="42" rx="13" fill={VIOLET} />
      <path d="M14.5 15 L24 33 L33.5 15" fill="none" stroke="#fff" strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="24" cy="12.4" r="2.3" fill="#fff" />
    </svg>
  );
}
export function PortalLockup({ height = 30, color = 'currentColor' }: LockupProps): React.ReactElement {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: height * 0.3 }}>
      <PortalMark size={Math.round(height * 1.32)} />
      <span style={{ fontWeight: 800, fontSize: height * 0.74, letterSpacing: '-0.03em', color, lineHeight: 1 }}>Verse</span>
    </span>
  );
}

/* ============================================================
   DIRECTION 2 - EDITORIAL CUT. Concept: Verse as a masthead. Wordmark-only,
   lowercase, tight, with a violet full-stop and a hairline masthead rule. The
   wordmark IS the logo. Quietest, most magazine. Favicon = a "V." monogram in
   an outline tile.
   ============================================================ */
export function EditorialMark({ size = 40 }: MarkProps): React.ReactElement {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: size, height: size, borderRadius: size * 0.28,
      border: `${Math.max(1.5, size * 0.05)}px solid ${VIOLET}`,
      fontWeight: 900, fontSize: size * 0.5, letterSpacing: '-0.05em', color: VIOLET, lineHeight: 1,
    }}>
      V<span style={{ color: VIOLET }}>.</span>
    </span>
  );
}
export function EditorialLockup({ height = 30, color = 'currentColor' }: LockupProps): React.ReactElement {
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: height * 0.16 }}>
      <span style={{ width: '100%', height: Math.max(1.5, height * 0.05), background: VIOLET, borderRadius: 2 }} aria-hidden />
      <span style={{ fontWeight: 800, fontSize: height, letterSpacing: '-0.045em', color, lineHeight: 0.9 }}>
        verse<span style={{ color: VIOLET }}>.</span>
      </span>
    </span>
  );
}

/* ============================================================
   DIRECTION 3 - ORBIT. Concept: uni-VERSE. Fandom spaces orbit one core. A
   violet orbit ring with a filled core and a space on the ring. Cosmic, airy;
   the most "network of worlds".
   ============================================================ */
export function OrbitMark({ size = 40 }: MarkProps): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="Verse orbit mark">
      <circle cx="24" cy="24" r="5.6" fill={VIOLET} />
      <g transform="rotate(-22 24 24)">
        <ellipse cx="24" cy="24" rx="19" ry="8.6" fill="none" stroke={VIOLET} strokeWidth="3" />
        <circle cx="43" cy="24" r="3.1" fill={VIOLET} />
      </g>
    </svg>
  );
}
// Favicon-scale variant. Verified: the orbiting dot muddies into the ring below
// ~24px, so favicons drop it and keep ring + core, with a thicker ring + slightly
// rounder ellipse so the mark still reads at 16px. Use this for favicons; use the
// full OrbitMark (with the space on the path) at header/OG scale.
export function OrbitMarkSmall({ size = 32 }: MarkProps): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="KpopVerse mark">
      <circle cx="24" cy="24" r="6.6" fill={VIOLET} />
      <ellipse cx="24" cy="24" rx="20" ry="10" fill="none" stroke={VIOLET} strokeWidth="4.2" transform="rotate(-20 24 24)" />
    </svg>
  );
}

export function OrbitLockup({ height = 30, color = 'currentColor' }: LockupProps): React.ReactElement {
  // CHOSEN direction. Wordmark is "KpopVerse" (parallel to the KpopQuiz Play
  // brand); "Kpop" inherits the ink, "Verse" carries the violet world accent.
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: height * 0.34 }}>
      <OrbitMark size={Math.round(height * 1.36)} />
      <span style={{ fontWeight: 800, fontSize: height * 0.74, letterSpacing: '-0.02em', color, lineHeight: 1 }}>
        Kpop<span style={{ color: VIOLET }}>Verse</span>
      </span>
    </span>
  );
}

export const VERSE_DIRECTIONS = [
  { id: 'portal', name: 'Portal V', concept: 'Verse is the doorway into your fandom’s home. A filled violet tile, a white V-gateway, a spark entering. The most product-confident, works hardest as an app icon.', Mark: PortalMark, FaviconMark: PortalMark, Lockup: PortalLockup },
  { id: 'editorial', name: 'Editorial cut', concept: 'Verse as a masthead. Wordmark-only, lowercase, a violet full-stop under a hairline rule. The quietest and most magazine; sits softly beside the Play brand.', Mark: EditorialMark, FaviconMark: EditorialMark, Lockup: EditorialLockup },
  // Chosen. Favicons use the ring+core variant (the orbiting dot muddies below ~24px).
  { id: 'orbit', name: 'Orbit', concept: 'Uni-verse: fandom spaces orbit one core. A violet ring, a filled centre, a space on the path. The most "network of worlds". Wordmark: KpopVerse.', Mark: OrbitMark, FaviconMark: OrbitMarkSmall, Lockup: OrbitLockup },
] as const;
