// C1 (V12 run): landmark comparison for the v12 states. Same rules as the v11 harness compare():
// boxes within 2px (parts listed per landmark, recorded deviations in `over`), styles from styles.json
// (owner deviations applied) or the live prototype, px within 0.5, photos and invisible radii not compared.
import fs from 'node:fs';
import path from 'node:path';
import { WT } from './drivers-v11.mjs';
import { applyOwnerDeviations, devValue } from './deviations.mjs';
import { styleEqual, TOL_BOX } from './lib.mjs';

const STYLES = applyOwnerDeviations(JSON.parse(fs.readFileSync(path.join(WT, 'docs/design/growth-v12/run/checks/reference/styles.json'), 'utf8')));

const bare = (st) => /rgba\(0, 0, 0, 0\)|transparent/.test(st['background-color']) && (st['background-image'] ?? 'none') === 'none' && parseFloat(st['border-top-width']) === 0 && (st['box-shadow'] ?? 'none') === 'none';

export function compareV12(key, prefix, theme, lms, proto, impl, props) {
  const rows = [];
  for (const l of lms) {
    const p = proto[l.name]; const i = impl[l.name];
    if (!p && !i) { rows.push({ name: l.name, status: 'absent', note: 'in neither' }); continue; }
    if (!p) { rows.push({ name: l.name, status: 'extra', note: 'not in the reference state (implementation only)' }); continue; }
    if (!i && l.optional) { rows.push({ name: l.name, proto: l.proto, impl: l.impl, status: 'data-absent', note: l.optional }); continue; }
    if (!i) { rows.push({ name: l.name, proto: l.proto, impl: l.impl, status: 'missing', note: 'in the reference, not found in the implementation' }); continue; }
    const mism = [];
    for (const part of l.box ?? []) {
      const over = l.over?.[prefix];
      if (over && part in over && over[part] === null) continue;
      const ev = over && part in over ? over[part] : p.boxes[0][part];
      const av = i.boxes[0][part];
      if (Math.abs(av - ev) > TOL_BOX) mism.push({ what: `box ${part}`, expected: +ev.toFixed(1), actual: +av.toFixed(1) });
    }
    const json = STYLES[key]?.[l.proto];
    const ref = json ?? Object.fromEntries(Object.entries(p.style).map(([k, v]) => [k, devValue(theme, l.proto, k, v)]));
    for (const prop of props) {
      if (l.skip?.includes(prop)) continue;
      if (ref[prop] === undefined || i.style[prop] === undefined) continue;
      if (prop === 'gap' && ref[prop] === 'normal') continue;
      if (prop === 'border-radius' && bare(ref) && bare(i.style)) continue;
      if (prop === 'box-shadow' && i.style[prop] === 'none' && i.afterShadow && styleEqual(String(ref[prop]), i.afterShadow, prop)) continue;
      if (!styleEqual(String(ref[prop]), String(i.style[prop]), prop)) mism.push({ what: prop, expected: String(ref[prop]).slice(0, 200), actual: String(i.style[prop]).slice(0, 200) });
    }
    rows.push({ name: l.name, proto: l.proto, impl: l.impl, status: mism.length ? 'fail' : 'pass', styleRef: json ? 'styles.json' : 'live prototype', box: l.box ?? [], mismatches: mism, ...(l.why ? { why: l.why } : {}), ...(l.skip?.length ? { skipped: l.skip } : {}) });
  }
  return rows;
}
