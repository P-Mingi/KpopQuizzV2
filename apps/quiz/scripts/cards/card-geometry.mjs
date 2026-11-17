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

/** The file stem suffix of a part: '' for a whole card, '-h1' and '-h2' for the halves of a pair (<stem>-h1-1x.webp), '-t1' to '-t3' for
 *  the thirds of a photo in 3 cards (lot 7). `parts` is the number of cards of the photo (2 when absent: the files of lots 2 to 6). */
export const partSuffix = (part, parts = 2) => (part >= 1 && part <= parts ? `-${parts === 3 ? 't' : 'h'}${part}` : '');

/* ---------- lot 7 (owner, 2026-11-17): a group photo in 2 OR 3 cards, and its panorama ---------- */

/** The window of a photo in 3 cards: 16.5:8.5, three cards side by side. */
export const TRIPLE_RATIO = 16.5 / 8.5;

/** The window ratio of a group photo in `parts` cards (2: 11:8.5, 3: 16.5:8.5). */
export const groupRatio = (parts) => (parts === 3 ? TRIPLE_RATIO : PAIR_RATIO);

/** A group photo's window in `parts` cards, placed by its one focal point. */
export const groupBox = (w, h, parts, fx, fy) => windowBox(w, h, groupRatio(parts), fx, fy);

/** The parts of a window, left to right: part i spans [floor(width * (i - 1) / n), floor(width * i / n)). With n = 2 it is exactly halves(). */
export function splitParts(box, n) {
  const out = [];
  for (let i = 1; i <= n; i++) {
    const a = Math.floor((box.width * (i - 1)) / n);
    const b = Math.floor((box.width * i) / n);
    out.push({ part: i, left: box.left + a, top: box.top, width: b - a, height: box.height });
  }
  return out;
}

/** The panorama of a group photo is its whole window: the file suffix ('-p2' or '-p3') and its sizes, one card height for each size. */
export const panoSuffix = (parts) => `-p${parts === 3 ? 3 : 2}`;
export const panoSizes = (parts) => ({ '1x': [SIZES['1x'][0] * parts, SIZES['1x'][1]], '2x': [SIZES['2x'][0] * parts, SIZES['2x'][1]] });
