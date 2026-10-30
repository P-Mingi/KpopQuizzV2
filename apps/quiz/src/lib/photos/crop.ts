// Daily games step 2: the geometry of the thumbnails made in the admin's browser. Pure (the canvas code of resize.ts and its tests read it).

import type { Box, Focal } from './slots';

/** A rectangle of the source picture, in source pixels. */
export interface Rect { readonly sx: number; readonly sy: number; readonly sw: number; readonly sh: number }

/**
 * The largest part of a `srcW` by `srcH` picture that has the shape of `box`, placed so that the focal point (0 to 100 on each axis) is as
 * near its middle as the edges allow. That part is then drawn into the box, so the crop follows the owner's point, never the centre.
 */
export function cropToBox(srcW: number, srcH: number, box: Box, focal: Focal): Rect {
  const target = box.w / box.h;
  let sw = srcW;
  let sh = srcW / target;
  if (sh > srcH) {
    sh = srcH;
    sw = srcH * target;
  }
  const cx = (focal.x / 100) * srcW;
  const cy = (focal.y / 100) * srcH;
  const sx = Math.min(Math.max(cx - sw / 2, 0), srcW - sw);
  const sy = Math.min(Math.max(cy - sh / 2, 0), srcH - sh);
  return { sx: Math.round(sx), sy: Math.round(sy), sw: Math.round(sw), sh: Math.round(sh) };
}

/** The size of a picture scaled to `maxW` wide, keeping its shape and never enlarging it. */
export function fitWidth(srcW: number, srcH: number, maxW: number): Box {
  if (srcW <= maxW) return { w: srcW, h: srcH };
  return { w: maxW, h: Math.max(1, Math.round((srcH * maxW) / srcW)) };
}

/** True when the source is too small for the box (smaller than `fraction` of it in either side). */
export function tooSmall(srcW: number, srcH: number, box: Box, fraction: number): boolean {
  return srcW < box.w * fraction || srcH < box.h * fraction;
}
