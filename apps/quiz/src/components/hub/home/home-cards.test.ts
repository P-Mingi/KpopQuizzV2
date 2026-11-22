// The KpopCards band of the hub home (owner, 2026-11-22: "Make this a beautiful CTA"). The bug it guards: the band's button had the base class
// hub-h2-cta without a colour (ink, site or line), so it showed as plain text on the cream page.
import { readdirSync, readFileSync } from 'node:fs';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PERIOD_S, RARITY_LABEL } from '@/lib/cards/rules';
import { CARDS_BANNER_CSS } from '@/components/cards-bridge/banner-styles';
import { HomeCards, cardsFacts } from './home-cards';

const DASH = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);
// Built from parts so the class scanner of home-styles.test.ts does not read the pattern itself as a class name.
const COLOURED = new RegExp(`${'hub-h2-cta'}-(?:ink|site|line)\\b`);
const css = readFileSync(new URL('../../../styles/sites/hub/h2.css', import.meta.url), 'utf8');

describe('the KpopCards band of the hub home', () => {
  const html = renderToStaticMarkup(h(HomeCards));

  it('has one solid button, painted by the banner own rules (lane KCBANNER), to /kpopcards, with the arrow', () => {
    const ctas = [...html.matchAll(/<a [^>]*class="kcb-btn"[^>]*>/g)].map((m) => m[0]);
    expect(ctas).toHaveLength(1);
    expect(ctas[0]).toContain('href="/kpopcards"');
    expect(html.match(/<a /g)).toHaveLength(1);
    expect(html).toMatch(/Open KpopCards<svg class="kcb-arrow"/);
    expect(CARDS_BANNER_CSS).toMatch(/#kpopcards \.kcb-btn \{[^}]*background: linear-gradient\(135deg, #D13A6E, #B42A5C\)/);
  });

  it('every button of the hub home carries a colour: no bare hub-h2-cta in the home components', () => {
    const dir = new URL('./', import.meta.url);
    const files = readdirSync(dir).filter((f) => f.endsWith('.tsx') && !f.includes('.test.'));
    let seen = 0;
    for (const f of files) {
      for (const line of readFileSync(new URL(f, dir), 'utf8').split('\n')) {
        if (!/hub-h2-cta[ "'`]/.test(line)) continue;
        seen += 1;
        expect(line, f).toMatch(COLOURED);
      }
    }
    expect(seen).toBeGreaterThanOrEqual(5);
  });

  it('the facts come from the rules: the timer period and one edition per rarity; no dash', () => {
    const facts = cardsFacts();
    expect(facts[0]).toBe(`A free pack every ${PERIOD_S / 60} minutes`);
    expect(Object.keys(RARITY_LABEL)).toHaveLength(6);
    expect(facts[1]).toBe('Six editions of every idol');
    expect(facts[2]).toBe('No money, no market');
    for (const f of facts) expect(html).toContain(`<li>${f}</li>`);
    expect(html).not.toMatch(DASH);
  });

  it('draws no photo of a person: the only image is the rabbit, and the fan is hidden from screen readers', () => {
    const imgs = [...html.matchAll(/<img [^>]*>/g)].map((m) => m[0]);
    expect(imgs).toHaveLength(1);
    expect(imgs[0]).toMatch(/mascot-default\.png/);
    expect(imgs[0]).toContain('alt=""');
    expect(html).toMatch(/<div class="kcb-fan" aria-hidden="true">/);
    expect(html).toContain(`>${RARITY_LABEL.R}<`);
    expect(html).toContain(`>${RARITY_LABEL.UR}<`);
  });

  it('every class of the band has a rule in the banner own styles, and the fan only moves without reduced motion', () => {
    const classes = new Set([...html.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1]!.split(' ')).filter((c) => c.startsWith('kcb-')));
    for (const c of classes) expect(CARDS_BANNER_CSS, c).toMatch(new RegExp(`\\.${c}[ ,{:.]`));
    const hover = CARDS_BANNER_CSS.split('\n').filter((l) => /#kpopcards:hover/.test(l));
    expect(hover.length).toBeGreaterThan(0);
    const block = CARDS_BANNER_CSS.slice(CARDS_BANNER_CSS.indexOf('@media (hover: hover) and (prefers-reduced-motion: no-preference) {'));
    for (const l of hover) expect(block, l).toContain(l.trim());
  });

  it('the band left the hub sheet: h2.css holds no rule of the banner, and the band is the hub wrapper around the shared component', () => {
    expect(css).not.toMatch(new RegExp(`${'hub-h2'}-kc`));
    expect(css).not.toMatch(/hub-kc-/);
    expect(html).toMatch(/^<div class="hub-h2-band hub-h2-wrap"><style>/);
    expect(html).toContain('<section id="kpopcards" aria-labelledby="kpopcards-h" data-testid="home-cards">');
  });
});
