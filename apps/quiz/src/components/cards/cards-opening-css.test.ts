// KpopCards (agent C): two checks that lived in cards-lot3-ui.test.ts and now belong to styles/cards/cards-opening.css:
// the reduced-motion fades of the reveal (0.2 s instead of flips and flights, never zero) and the spotlight (opacity only, its glow a layer).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const css = readFileSync(join(__dirname, '../../styles/cards/cards-opening.css'), 'utf8');
const rm = css.slice(css.indexOf('/* ---------- reduced motion'));

describe('reduced motion in the opening: 0.2 s fades for the reveal, the flip, the flight and leaving; never zero', () => {
  it('every animation and transition becomes a 0.2 s one, played once', () => {
    expect(rm).toMatch(/\.ov\.rm \*[^{]*\{ animation-duration: \.2s !important; animation-iteration-count: 1 !important; animation-delay: 0s !important; transition-duration: \.2s !important/);
  });
  it('the card does not turn: the faces cross-fade in 0.2 s (the back never shows through the front)', () => {
    expect(rm).toMatch(/\.ov\.rm \.rc-in \{ transform: none !important; transition: none !important/);
    expect(rm).toMatch(/\.ov\.rm \.rc \.side \{ transition: opacity \.2s ease !important/);
    expect(rm).toMatch(/\.ov\.rm \.rc\.flipped \.side\.front \{ opacity: 1/);
    expect(rm).toMatch(/\.ov\.rm \.rc\.flipped \.side\.back \{ opacity: 0/);
  });
  it('the pack halves, the cards that arrive and the pop fade instead of flying', () => {
    expect(rm).toContain('kco-fadeout');
    expect(rm).toContain('kco-fadein');
    expect(rm).toMatch(/@keyframes kco-fadein \{ from \{ opacity: 0; \} \}/);
    expect(rm).toMatch(/@keyframes kco-fadeout \{ to \{ opacity: 0; \} \}/);
  });
  it('tilt and the 3D pack are off, the spotlight does not lift the card', () => {
    expect(rm).toMatch(/\.ov\.rm \.card, \.bvc \.ov\.rm \.pack \{ transform: none !important/);
    expect(rm).toMatch(/\.ov\.rm \.fan\.spot \.fc\.best \.fc-b \{ transform: none/);
  });
  it('the flying cards of "Add to collection" are replaced by the screen fading out (the component), and the wallet icons do not fly', () => {
    expect(rm).toMatch(/\.bvc\.rm \.gainp \{ display: none/);
  });
});

describe('the spotlight of Reveal all', () => {
  const fan = css.slice(css.indexOf('/* Reveal all: the spotlight'), css.indexOf('.bvc .ov .totals'));
  it('dims the others with opacity only, never a filter', () => {
    expect(fan).toMatch(/\.fan\.spot \.fc:not\(\.best\) \{ opacity: \.32; \}/);
    expect(fan).not.toMatch(/filter:/);
  });
  it('raises the best card above the others', () => {
    expect(fan).toMatch(/\.fan\.spot \.fc\.best \{ z-index: 9 !important; \}/);
    expect(fan).toMatch(/\.fan\.spot \.fc\.best \.fc-b \{ transform: translateY\(-24px\) scale\(1\.15\)/);
  });
  it('its glow is a layer that fades in (opacity 0 to 1), not a box-shadow repainted on the card', () => {
    expect(fan).toMatch(/\.fc-b::before \{[^}]*radial-gradient\(closest-side, var\(--spot\), transparent 70%\); opacity: 0; transition: opacity \.3s ease/);
    expect(fan).toMatch(/\.fan\.spot \.fc\.best \.fc-b::before \{ opacity: 1; \}/);
    expect(fan).not.toMatch(/box-shadow/);
  });
  it('in Open 5 the others dim to 0.4 with opacity and the best grows by 6 %', () => {
    expect(css).toMatch(/\.mgrid\.spot \.mc:not\(\.best\) \{ opacity: \.4; \}/);
    expect(css).toMatch(/\.mgrid\.spot \.mc\.best \{ transform: scale\(1\.06\)/);
  });
});
