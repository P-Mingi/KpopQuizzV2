// W-CUSTOM step 8 - HOUSE PACKS. Original sticker art (no copyrighted logos), one
// pack per preset mood. These are OUR inline SVG (safe; curator UPLOADS are png/webp
// only - never svg). Keyed 'house:{pack}:{n}'. Decorative -> always aria-hidden.

const A = 'var(--verse-accent)';

const ART: Record<string, React.ReactElement> = {
  // hearts (soft)
  'house:hearts:1': <path d="M12 21s-7-4.35-7-9.5A3.5 3.5 0 0 1 12 8a3.5 3.5 0 0 1 7 3.5C19 16.65 12 21 12 21z" fill={A} />,
  'house:hearts:2': <path d="M12 20s-6-3.8-6-8.2A3 3 0 0 1 12 9a3 3 0 0 1 6 2.8C18 16.2 12 20 12 20z" fill="none" stroke={A} strokeWidth="2" />,
  // sparkles (neon / y2k)
  'house:sparkles:1': <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z" fill={A} />,
  'house:sparkles:2': <g fill={A}><circle cx="7" cy="7" r="2" /><circle cx="17" cy="10" r="1.4" /><circle cx="11" cy="17" r="1.7" /></g>,
  // stars (retro)
  'house:stars:1': <path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.2l1-5.8L3.5 9.2l5.9-.9z" fill="none" stroke={A} strokeWidth="1.8" strokeLinejoin="round" />,
  'house:stars:2': <path d="M12 4l2 6h6l-5 3.6 2 6-5-3.7L7 19.6l2-6L4 10h6z" fill={A} />,
  // lightstick motif (original, generic - a wand + orb, no group logo)
  'house:lightstick:1': <g><circle cx="12" cy="7" r="4" fill={A} /><rect x="11" y="11" width="2" height="9" rx="1" fill={A} /></g>,
  'house:lightstick:2': <g fill="none" stroke={A} strokeWidth="2"><circle cx="12" cy="7" r="3.6" /><path d="M12 11v9" strokeLinecap="round" /></g>,
  // dark / minimal accents
  'house:dot:1': <circle cx="12" cy="12" r="6" fill={A} />,
  'house:ring:1': <circle cx="12" cy="12" r="7" fill="none" stroke={A} strokeWidth="2.5" />,
};

export const HOUSE_STICKER_IDS = Object.keys(ART);

/** Render a house sticker's art, or null for an unknown id. */
export function houseStickerArt(id: string): React.ReactElement | null {
  const art = ART[id];
  if (!art) return null;
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden focusable="false">{art}</svg>
  );
}
