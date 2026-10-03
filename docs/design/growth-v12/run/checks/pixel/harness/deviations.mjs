// C1 (V12 run): owner-approved deviations from the prototype, the value a landmark must have NOW
// instead of the captured one. Same rows as apps/quiz/e2e/ux-v1/helpers/landmarks.ts OWNER_DEVIATIONS
// (v11 A0 fix 5 warm light ground and white surfaces, fix 8 94% nav glass). Exact replacements, never skips.
export const OWNER_DEVIATIONS = [
  { theme: 'light', proto: '.nav', prop: 'background-color', from: 'rgba(255, 255, 255, 0.86)', to: 'rgba(250, 248, 245, 0.94)' },
  // C1: the game bars paint the same token (--ux-nav-bg, p4.css / p6.css), and the tab bar is the 94% glass of
  // the brief's expected deviations (--ux-tabbar-bg, a0.css)
  { theme: 'light', proto: '.gbar', prop: 'background-color', from: 'rgba(255, 255, 255, 0.86)', to: 'rgba(250, 248, 245, 0.94)' },
  { theme: 'light', proto: '.tabbar', prop: 'background-color', from: 'rgba(255, 255, 255, 0.86)', to: 'rgba(255, 255, 255, 0.94)' },
  // C1: the phone rail panel is a bordered card on the warm ground, filled by --ux-card-fill (v11 P8 f995a87,
  // "warm ground token sweep", owner request 2), the same deviation as the text card below
  { theme: 'light', proto: '.mrail', prop: 'background-color', from: 'rgba(0, 0, 0, 0)', to: 'rgb(255, 255, 255)' },
  { theme: 'light', proto: '.tcard', prop: 'background-color', from: 'rgba(0, 0, 0, 0)', to: 'rgb(255, 255, 255)' },
  { theme: 'light', proto: '*', prop: 'background-color', from: 'rgb(247, 246, 244)', to: 'rgb(241, 239, 234)' },
  { theme: 'light', proto: '*', prop: 'background-color', from: 'rgb(240, 238, 234)', to: 'rgb(234, 231, 225)' },
  { theme: 'light', proto: '*', prop: 'color', from: 'rgb(201, 56, 104)', to: 'rgb(196, 53, 101)' },
  { theme: 'light', proto: '*', prop: 'border-top-color', from: 'rgb(201, 56, 104)', to: 'rgb(196, 53, 101)' },
];

const themeOf = (key) => (/(^|-)(light)(-|$)|^d-|^m-/.test(key) ? 'light' : /(^|-)(dark)(-|$)|^dk-|^mk-/.test(key) ? 'dark' : null);

/** One value with the deviations applied (theme 'light' | 'dark'). */
export function devValue(theme, protoSel, prop, value) {
  for (const d of OWNER_DEVIATIONS) {
    if (d.theme === theme && (d.proto === '*' || d.proto === protoSel) && d.prop === prop && value === d.from) return d.to;
  }
  return value;
}

/** A styles.json object (keys `<w>-<theme>-<state>` or `<d|dk|m|mk>-<state>`) with the deviations applied. */
export function applyOwnerDeviations(ref) {
  const out = JSON.parse(JSON.stringify(ref));
  for (const [key, sels] of Object.entries(out)) {
    const theme = themeOf(key);
    for (const [sel, props] of Object.entries(sels)) {
      for (const p of Object.keys(props)) props[p] = devValue(theme, sel, p, props[p]);
    }
  }
  return out;
}
