// Otakudle, the owner's private preview on the card of the result: the size rule, pure (dle-card-preview.tsx measures, the tests call it).

/**
 * The owner's private preview pictures are small (most about 160 x 240, some 360 x 480) and the card is often more than 800 px wide: stretched
 * to cover it they blur. A picture narrower than half the card's rendered width is shown at most twice its natural size, never larger than the
 * card, centred on a blurred and darkened copy of itself. Returns that size, or null to cover the card as before (a large enough picture, or a
 * size not known yet).
 */
export function smallPreviewSize(natW: number, natH: number, cardW: number, cardH: number): { width: number; height: number } | null {
  if (!(natW > 0 && natH > 0 && cardW > 0 && cardH > 0)) return null;
  if (natW >= cardW / 2) return null;
  const scale = Math.min(2, cardW / natW, cardH / natH);
  return { width: Math.round(natW * scale), height: Math.round(natH * scale) };
}
