#!/usr/bin/env python3
"""Recolor KpopQuiz avatar hair layers into brand color variants.

Usage:
  python scripts/recolor_hair.py <input.png | input_dir> [--isolated] [--remove-bg]

For each input hair PNG it writes 5 variants (brown, pink, blond, red, grey)
into a sibling 'recolored/' folder, preserving shading + transparency.

Cleanest results: run on ISOLATED hair layers (hair only, transparent, no
rabbit) with --isolated. For composited rabbit+hair images, omit --isolated
and the script masks the hair by luminance + saturation. That works well for
the four saturated colors; the silver/grey crop is the unreliable case (low
saturation cannot be told apart from the rabbit), so recolor a colored version
of that style or regenerate it in Gemini.

Requires: pillow, numpy  (pip install pillow numpy --break-system-packages)
"""
import sys
import os
from PIL import Image
import numpy as np

# Each target is a (shadow rgb, highlight rgb) ramp. The hair pixel's own
# luminance is mapped along the ramp, so shading + volume are preserved.
TARGETS = {
    "brown": ((0x3a, 0x27, 0x16), (0xb0, 0x82, 0x52)),
    "pink":  ((0xbf, 0x57, 0x7e), (0xfb, 0xd0, 0xe0)),
    "blond": ((0xb8, 0x94, 0x50), (0xf6, 0xe6, 0xb6)),
    "red":   ((0x8e, 0x23, 0x33), (0xee, 0x6a, 0x7e)),
    "grey":  ((0x6f, 0x6f, 0x6f), (0xe4, 0xe4, 0xe4)),
}

SAT_THRESH = 0.18           # composite mask: min saturation to count as hair
LUM_LO, LUM_HI = 0.10, 0.93  # exclude near-black rabbit + near-white eyes


def luminance(rgb):
    return (0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]) / 255.0


def saturation(rgb):
    mx = rgb[..., :3].max(axis=-1) / 255.0
    mn = rgb[..., :3].min(axis=-1) / 255.0
    return np.where(mx > 0, (mx - mn) / np.clip(mx, 1e-6, None), 0.0)


def remove_bg(arr):
    # Make a near-uniform corner background transparent.
    corner = arr[0, 0, :3].astype(int)
    dist = np.abs(arr[..., :3].astype(int) - corner).sum(axis=-1)
    arr[..., 3] = np.where(dist < 30, 0, arr[..., 3])
    return arr


def hair_mask(arr, isolated):
    opaque = arr[..., 3] > 20
    if isolated:
        return opaque
    lum = luminance(arr)
    sat = saturation(arr)
    return opaque & (lum > LUM_LO) & (lum < LUM_HI) & (sat > SAT_THRESH)


def recolor(arr, mask, shadow, light):
    lum = luminance(arr)
    if mask.any():
        lo = np.percentile(lum[mask], 5)
        hi = np.percentile(lum[mask], 95)
    else:
        lo, hi = 0.0, 1.0
    t = np.clip((lum - lo) / max(hi - lo, 1e-6), 0, 1)[..., None]
    ramp = (np.array(shadow) * (1 - t) + np.array(light) * t).astype(np.uint8)
    out = arr.copy()
    out[..., :3] = np.where(mask[..., None], ramp, arr[..., :3])
    return out


def process(path, isolated, do_remove_bg):
    arr = np.array(Image.open(path).convert("RGBA"))
    if do_remove_bg:
        arr = remove_bg(arr)
    mask = hair_mask(arr, isolated)
    base = os.path.splitext(os.path.basename(path))[0]
    outdir = os.path.join(os.path.dirname(path) or ".", "recolored")
    os.makedirs(outdir, exist_ok=True)
    for name, (sh, li) in TARGETS.items():
        out = recolor(arr, mask, sh, li)
        Image.fromarray(out, "RGBA").save(os.path.join(outdir, f"{base}_{name}.png"))
    print(f"{base}: wrote {len(TARGETS)} variants to {outdir}")


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        print(__doc__)
        sys.exit(1)
    isolated = "--isolated" in sys.argv
    do_remove_bg = "--remove-bg" in sys.argv
    target = args[0]
    if os.path.isdir(target):
        paths = [os.path.join(target, f) for f in sorted(os.listdir(target))
                 if f.lower().endswith(".png")]
    else:
        paths = [target]
    for p in paths:
        process(p, isolated, do_remove_bg)


if __name__ == "__main__":
    main()
