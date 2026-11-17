// Bunnyverse Cards: the cut of one photo into its card files, shared by publish-card-files.mjs and its test (card-cut.test.ts). sharp is given.
// Lot LAUNCH-PREP lane PHOTOCHECK (2026-11-17): 26 published crops were turned 90 or 180 degrees. Their Commons originals carry an EXIF
// Orientation tag; the database (source_width / source_height, from the Commons API) and every viewer read the photo upright, but the cutter
// read the raw pixels, so the window was placed and cut on the photo lying on its side. The photo is now read upright: its size is the
// oriented one (metadata().autoOrient) and every part is extracted from the oriented image ({ autoOrient: true }). A photo without the tag
// is cut exactly as before.
import { cutPlan } from './card-files.mjs';
import { SIZES, panoSizes } from './card-geometry.mjs';

/** The size of the photo as it is seen: sharp's oriented size when the photo has an EXIF Orientation, else its stored size. */
export function orientedSize(meta) {
  const o = meta?.autoOrient;
  return o && Number.isInteger(o.width) && Number.isInteger(o.height) ? { width: o.width, height: o.height } : { width: meta.width, height: meta.height };
}

/** Cuts a photo at a focal point: a person gives one part (0), a group its `n` parts (halves 1-2 or thirds 1-3), each with its 1x and 2x WebP,
 *  and its panorama (the whole window; `pano.files['2x']` only when every part has its 2x). `onlyPano`: no part is encoded (a pair cut before lot 7). */
export async function cutImage(sharp, src, group, fx, fy, n = 2, onlyPano = false) {
  const { width, height } = orientedSize(await sharp(src).metadata());
  const plan = cutPlan(group, width, height, fx, fy, n);
  const encode = async (box, sizes, only) => {
    const base = sharp(src, { autoOrient: true }).extract({ left: box.left, top: box.top, width: box.width, height: box.height });
    const files = {};
    for (const [k, [w, h]] of Object.entries(sizes)) if (!only || only.includes(k)) files[k] = await base.clone().resize(w, h, { fit: 'cover' }).webp({ quality: 82 }).toBuffer();
    return files;
  };
  const parts = [];
  for (const p of plan.parts) parts.push({ part: p.part, files: onlyPano ? {} : await encode(p, SIZES), cropWidth: p.cropWidth, has2x: p.has2x });
  const pano = plan.pano ? { files: await encode(plan.pano, panoSizes(n), plan.pano.has2x ? null : ['1x']), has2x: plan.pano.has2x } : null;
  return { parts, pano, window: plan.window };
}
