// face-box.mjs: the Kpopdle crop, in one place. The BOX of kpopdle-photos.mjs (400 x 500, PHOTO_BOX.idol of lib/photos/slots.ts) is a 4:5 window; it is
// placed in the original by the focal point of the card photo (0 to 100 on both axes), with the window code of the cards (card-geometry.mjs).
import { windowBox } from '../card-geometry.mjs';

export const BOX = { w: 400, h: 500 };
export const THUMB = 96;

/** The widest 4:5 window of a w x h original, placed by the focal point. */
export const faceBox = (w, h, fx, fy) => windowBox(w, h, BOX.w / BOX.h, Number.isFinite(fx) ? fx : 50, Number.isFinite(fy) ? fy : 50);

/** The square for the 96 px thumbnail: the widest square of the 4:5 window, high in it (a face sits in the upper half of a portrait window). */
export const thumbBox = (box) => windowBox(box.width, box.height, 1, 50, 25);
