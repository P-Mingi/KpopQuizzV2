// Bunnyverse Cards: the geometry of the card files, in one place for the owner's script (plain node, no build step) and gen-subjects.mts.
// A person's card is the widest 5.5:8.5 window of the photo. Lot 2 (owner idea, 2026-11-12): a group photo gives a PAIR of cards, the
// widest 11:8.5 window (two cards side by side) split down the middle, half 1 on the left and half 2 on the right. One focal point
// places the window; each half is cut, sized and checked for 2x on its own.

export const CARD_RATIO = 5.5 / 8.5;
export const PAIR_RATIO = 11 / 8.5;
/** Narrower than this, a crop has no honest 2x file (640 x 989). */
export const MIN_2X = 640;
export const SIZES = { '1x': [320, 495], '2x': [640, 989] };

/** The widest window of `ratio` (width / height) in a w x h photo, placed by the focal point (fx, fy, 0 to 100). */
export function windowBox(w, h, ratio, fx, fy) {
  let cw = Math.floor(Math.min(w, h * ratio));
  let ch = Math.round(cw / ratio);
  if (ch > h) { ch = h; cw = Math.floor(h * ratio); }
  return { left: Math.round(((w - cw) * fx) / 100), top: Math.round(((h - ch) * fy) / 100), width: cw, height: ch };
}

/** A person's card: the 5.5:8.5 window. */
export const cardBox = (w, h, fx, fy) => windowBox(w, h, CARD_RATIO, fx, fy);

/** A group's pair: the 11:8.5 window. */
export const pairBox = (w, h, fx, fy) => windowBox(w, h, PAIR_RATIO, fx, fy);

/** The two halves of a pair window: half 1 is the left floor(width / 2) pixels, half 2 the rest. */
export function halves(box) {
  const lw = Math.floor(box.width / 2);
  return [
    { part: 1, left: box.left, top: box.top, width: lw, height: box.height },
    { part: 2, left: box.left + lw, top: box.top, width: box.width - lw, height: box.height },
  ];
}

/** The file stem suffix of a part: '' for a whole card, '-h1' and '-h2' for the halves (<stem>-h1-1x.webp). */
export const partSuffix = (part) => (part === 1 || part === 2 ? `-h${part}` : '');
