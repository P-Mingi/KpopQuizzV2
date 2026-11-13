// Bunnyverse Cards, lot 3 UI lane (integrator points A1 to A10, A18; lot 4 B1 to B10, C5): the face of a card, the band under a pocket and
// its slot, the pager words, the one name per rarity, the odds table and its place for rules, the Help text, the rules of motion in the CSS.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const site = vi.hoisted(() => ({ id: 'hub' as string }));
vi.mock('@/lib/site/registry', async (orig) => ({ ...(await orig<typeof import('@/lib/site/registry')>()), get SITE_ID() { return site.id; } }));
vi.mock('@/components/cards/cards-font', () => ({ cardsFace: { variable: 'bvc-card-var' }, cardsMono: { variable: 'bvc-mono-var' } }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/cards', useRouter: () => ({ replace: () => undefined }), useSearchParams: () => new URLSearchParams(),
  notFound: () => { throw new Error('NEXT_HTTP_ERROR_FALLBACK;404'); },
}));

import { BinderView } from './binder-view';
import { CardDetail } from './card-detail';
import { CardFront } from './card-art';
import { CardsBar } from './cards-bar';
import { CardsFaq, FAQ } from './cards-faq';
import { CardsFooter } from './cards-footer';
import { CardsProvider } from './cards-provider';
import { CardsSprite } from './card-art';
import { CreditBlock } from './credit-block';
import { CardsCreditsSection } from './credits-section';
import { DropRates } from './drop-rates';
import { PacksView } from './packs-view';
import { PocketFoot } from './fav-star';
import { ReportForm } from './report-form';
import { RARITIES, RARITY_LABEL, RARITY_NAMES, computeOdds } from '@/lib/cards/rules';
import { buildDetail } from '@/lib/cards/ui-detail';
import { buildFixtureCatalog } from '@/lib/cards/ui-fixture';
import { cardCreditRows } from '@/lib/cards/ui-credit';
import { buildSlim, fmtRate, fullArtRate, pageWords, rateLabels, slimCard } from '@/lib/cards/ui-model';

import type { Rarity } from '@/lib/cards/types';
import type { AdsContext } from '@/lib/cards/ads';
import type { SlimCard } from '@/lib/cards/ui-types';

const ADS_OFF: AdsContext = { enabled: false, client: null, bannerSlot: null, country: null, childDirected: false, consentRequired: true, test: false };
const cat = buildFixtureCatalog();
const slim = buildSlim(cat);
const ALL_SIX = computeOdds(RARITIES.map((rarity, i) => ({ n: i + 1, kind: 'idol' as const, rarity })));
const wrap = (el: React.ReactElement): string => renderToStaticMarkup(createElement(CardsProvider, { catalog: slim, fixture: false, children: el }));
const card = (over: Partial<SlimCard> = {}): SlimCard => ({ ...slim.cards[0]!, ...over });
const OLD_NAMES = /\b(Common|Uncommon|Super Rare|Ultra Rare|Legendary)\b/;
const DASHES = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`);

beforeEach(() => { site.id = 'hub'; vi.stubEnv('NET_CARDS', '1'); vi.stubEnv('CARDS_UI_FIXTURE', '1'); });
afterEach(() => { vi.unstubAllEnvs(); });

describe('the face of a card (points A5, A2)', () => {
  it('names its edition once, under the name, with the gem, and has no chip at the top right', () => {
    for (const r of RARITIES) {
      const html = renderToStaticMarkup(createElement(CardFront, { card: card({ rarity: r }) }));
      expect(html).not.toContain('c-ed');
      expect(html).toContain(`<span class="c-rn">${RARITY_LABEL[r]}</span>`);
      expect(html.indexOf('class="c-name"')).toBeLessThan(html.indexOf('class="c-rar"'));
      expect(html.indexOf('class="c-rar"')).toBeLessThan(html.indexOf('class="c-meta"'));
      expect(html).toContain('<svg class="" viewBox="0 0 24 24"');
      expect(html).not.toMatch(OLD_NAMES);
    }
  });
  it('a Full Art card carries its rate, from the odds; no other edition does', () => {
    const fa = slimCard({ ...cat.cards[0]!, rarity: 'L', edition: 'full' }, null, fullArtRate(ALL_SIX));
    expect(fa.rate).toBe('0.3%');
    expect(renderToStaticMarkup(createElement(CardFront, { card: fa }))).toContain('<span class="c-rate">0.3%</span>');
    expect(renderToStaticMarkup(createElement(CardFront, { card: card({ rarity: 'L' }) }))).not.toContain('c-rate');
    const std = slimCard({ ...cat.cards[0]!, rarity: 'C' }, null, '0.3%');
    expect(std.rate).toBeUndefined();
  });
  it('the rate is never typed: it follows the odds the page shows', () => {
    expect(fmtRate(0.3)).toBe('0.3%');
    expect(fmtRate(10)).toBe('10%');
    expect(fmtRate(10.5)).toBe('10.5%');
    expect(fmtRate(1.2605)).toBe('1.26%');
    expect(rateLabels(ALL_SIX)).toEqual({ C: '60%', U: '24%', R: '10%', SR: '4.5%', UR: '1.2%', L: '0.3%' });
    expect(rateLabels(null)).toEqual({});
    expect(fullArtRate(cat.odds)).toBeNull();
    const four = computeOdds([1, 2, 3, 4].map((n, i) => ({ n, kind: 'idol' as const, rarity: (['C', 'U', 'R', 'UR'] as Rarity[])[i]! })));
    expect(rateLabels(four).UR).toBe(fmtRate(four.card.UR));
    expect(rateLabels(four).L).toBeUndefined();
  });
  it('buildSlim gives the rate to Full Art cards only', () => {
    const c = { ...cat, odds: ALL_SIX, cards: cat.cards.map((x, i) => (i === 0 ? { ...x, rarity: 'L' as const, edition: 'full' as const } : x)) };
    const s = buildSlim(c);
    expect(s.cards[0]!.rate).toBe('0.3%');
    expect(s.cards.slice(1).every((x) => x.rate === undefined)).toBe(true);
  });
  it('a half of a group photo keeps "Group · 1/2" in the markup and its part for a small card', () => {
    const half = renderToStaticMarkup(createElement(CardFront, { card: card({ kind: 'group', part: 2 }) }));
    expect(half).toContain('data-part="2/2"');
    expect(half).toContain('Group · 2/2');
  });
});

describe('the small card (point A2) and the motion rules (points A6, A7, A9), read in the style sheets', () => {
  const art = readFileSync(join(__dirname, '../../styles/cards/cards-art.css'), 'utf8');
  const ui = readFileSync(join(__dirname, '../../styles/cards/cards-ui.css'), 'utf8');
  const block = (css: string, start: string): string => { const i = css.indexOf(start); let d = 0; for (let j = css.indexOf('{', i); j < css.length; j++) { if (css[j] === '{') d++; if (css[j] === '}' && --d === 0) return css.slice(i, j + 1); } return ''; };
  it('under 150 px of card width only the name and the rarity line stay, the gem at least 10 px', () => {
    const q = block(art, '@container card (max-width:149.98px)');
    expect(q).not.toBe('');
    expect(q).toMatch(/\.c-meta[^{]*\{[^}]*display:none/);
    expect(q).toMatch(/line-clamp:1/);
    expect(q).toMatch(/text-overflow:ellipsis/);
    expect(q).toMatch(/\.c-rar svg\{width:max\(10px/);
    expect(q).toMatch(/\.c-rar\{[^}]*font-size:max\(10px/);
    expect(q).toMatch(/c-part::after\{content:attr\(data-part\)/);
  });
  it('the card is its own named container', () => { expect(art).toMatch(/\.bvc \.card\{container-name:card;[^}]*container-type:inline-size/); });
  it('every keyframe changes only transform and opacity (no background-position, filter, box-shadow, custom property)', () => {
    for (const css of [art, ui]) {
      for (const m of css.matchAll(/@keyframes ([\w-]+)\{/g)) {
        const body = block(css, m[0]);
        expect(body, m[1]).not.toMatch(/background|filter|box-shadow|--[a-z]/);
      }
    }
  });
  it('no registered custom property is animated (the Full Art ring turns by transform)', () => {
    expect(readFileSync(join(__dirname, '../../styles/cards/cards-tokens.css'), 'utf8')).not.toContain('@property');
    expect(art).toMatch(/\.ed-full \.c-frame::before\{[^}]*animation:bvc-spinb/);
    expect(ui).toMatch(/@keyframes bvc-spinb\{to\{transform:rotate\(360deg\)\}\}/);
  });
  it('the card, the foil and the glare only transition transform and opacity', () => {
    const card = /\.bvc \.card\{[^}]*\}/.exec(art)![0];
    expect(card).toMatch(/transition:transform \.45s var\(--ease\);/);
    for (const sel of ['.bvc .ed-holo .c-foil,', '.bvc .c-glare{']) {
      const line = art.split('\n').find((l) => l.startsWith(sel))!;
      const t = /transition:([^;}]*)/.exec(line)?.[1] ?? '';
      expect(t, sel).not.toMatch(/box-shadow|filter|background/);
    }
  });
  it('the 900 ms sheen uses the house easing, and the dragged card spring-backs', () => {
    expect(art).toContain('.card.sweep .c-sweep{animation:bvc-sweep .9s cubic-bezier(.2,.8,.2,1)');
    expect(ui).toMatch(/\.d-flip \.card\{transition:transform \.6s var\(--spring\)/);
    expect(ui).toMatch(/\.d-back\{[^}]*transition:transform \.6s var\(--spring\)/);
  });
  it('reduced motion: 0.2 s fades for the reveal, the card flip, the spotlight and leaving; never zero', () => {
    const rm = ui.slice(ui.indexOf('@media (prefers-reduced-motion: reduce){'));
    expect(rm).toContain('.bvc .rc .side{backface-visibility:visible');
    expect(rm).toMatch(/\.d-flip \.fr,\.bvc \.d-flip \.bk\{[^}]*transition:opacity \.2s linear!important/);
    expect(rm).toMatch(/\.allc\{transition:opacity \.2s linear!important/);
    expect(rm).toMatch(/\.ov\.fade-out\{transition:opacity \.2s linear!important/);
    expect(rm).toContain('bvc-fadeout .2s linear');
  });
  it('the spotlight raises the best card and fades the others', () => {
    expect(ui).toMatch(/\.allrow\.spotting \.allc\{opacity:\.22\}/);
    expect(ui).toMatch(/\.allrow\.spotting \.allc\.best\{[^}]*transform:translateY\(-8%\) scale\(1\.32\)/);
    expect(ui).toMatch(/\.allc::after\{[^}]*opacity:0;transition:opacity \.6s linear/);
  });
});

describe('the band under a pocket (point A1)', () => {
  it('is 30 px high, with the copies count, New, the slot and the star in it, never on the card face', () => {
    const html = wrap(createElement(PocketFoot, { n: slim.cards[0]!.n, name: 'Mira', edition: 'Standard', isNew: true, copies: 3, slot: createElement('button', { className: 'heart' }, 'heart') }));
    expect(html).toContain('class="pw-foot"');
    expect(html).toContain('<span class="newb">New</span>');
    expect(html).toContain('<span class="cnt" aria-hidden="true">&times;3</span>'.replace('&times;', '×'));
    expect(html).toContain('data-slot="pocket-extra"><button class="heart">heart</button></span>');
    const ui = readFileSync(join(__dirname, '../../styles/cards/cards-ui.css'), 'utf8');
    expect(ui).toMatch(/\.pw-foot\{[^}]*height:30px/);
    expect(ui).toMatch(/\.pw-foot \.star\{margin-block:-7px\}/);
    expect(ui).toMatch(/\.star\{[^}]*width:44px;height:44px/);
  });
  it('the face of a card holds neither the count, New, nor the star', () => {
    const html = renderToStaticMarkup(createElement(CardFront, { card: card() }));
    expect(html).not.toMatch(/newb|class="cnt"|class="star/);
  });
  it('a missing card of the binder has the same band, with an empty slot for the wishlist heart', () => {
    const html = wrap(createElement(BinderView, { ads: ADS_OFF }));
    expect(html).toContain('class="pw missing"');
    expect(html).toMatch(/class="pw missing">[\s\S]*?data-slot="pocket-extra"><\/span>/);
  });
});

describe('the pager words (point A3)', () => {
  it('Page 3 of 9 for one page, Pages 37 and 38 of 54 for a spread, one page when the spread has only one', () => {
    expect(pageWords(2, 9, true)).toBe('Page 3 of 9');
    expect(pageWords(36, 54, false)).toBe('Pages 37 and 38 of 54');
    expect(pageWords(0, 1, false)).toBe('Page 1 of 1');
    expect(pageWords(52, 53, false)).toBe('Page 53 of 53');
    expect(pageWords(0, 4, false)).toBe('Pages 1 and 2 of 4');
  });
});

describe('one name per rarity (point A4)', () => {
  it('RARITY_LABEL is the owner-validated set and RARITY_NAMES stays for code and tests', () => {
    expect(Object.values(RARITY_LABEL)).toEqual(['Standard', 'Stage', 'Holo', 'Era', 'Gold', 'Full Art']);
    expect(RARITY_NAMES.C).toBe('Common');
  });
  it('no page prints a retired name, and no page prints a dash', () => {
    const d = buildDetail(cat, 'BV1-0001', null)!;
    const locked = buildDetail(cat, 'BV1-0001', 'SR')!;
    const pages = [
      wrap(createElement(PacksView, { rates: createElement(DropRates, { odds: ALL_SIX }), ads: ADS_OFF })),
      wrap(createElement(BinderView, { ads: ADS_OFF })),
      wrap(createElement(CardDetail, { ...d.props, credit: createElement(CreditBlock, { photo: d.photo, num: 'BV1-0001' }) })),
      wrap(createElement(CardDetail, { ...locked.props, credit: null })),
      wrap(createElement(CardsFaq)),
      wrap(createElement(CardsBar)),
      renderToStaticMarkup(createElement(CardsFooter)),
      renderToStaticMarkup(createElement(DropRates, { odds: ALL_SIX })),
      renderToStaticMarkup(createElement(CardsSprite)),
      renderToStaticMarkup(createElement(ReportForm, { photoId: 1, cardNo: 1, cardLabel: 'Mira, BV1-0001' })),
      renderToStaticMarkup(createElement(CardsCreditsSection, { rows: cardCreditRows(cat) })),
    ];
    for (const html of pages) {
      expect(html).not.toMatch(OLD_NAMES);
      expect(html).not.toMatch(DASHES);
      expect(html).not.toContain('&#x2014;');
      expect(html).not.toContain('&mdash;');
    }
  });
  it('the credits section names the editions with the one set', () => {
    const rows = cardCreditRows(cat);
    expect(rows[0]!.cards.every((c) => (Object.values(RARITY_LABEL) as string[]).includes(c.edition))).toBe(true);
  });
  it('the card page names the edition once in the tags and says how often it comes, computed from the odds', () => {
    const d = buildDetail({ ...cat, odds: ALL_SIX }, 'BV1-0003', null)!;
    const html = wrap(createElement(CardDetail, { ...d.props, credit: null }));
    expect(d.props.rates).toEqual(rateLabels(ALL_SIX));
    expect(html).toContain('Holo &middot; 10% of cards'.replace('&middot;', '·'));
    expect(html).toContain('Full Art · 0.3% of cards');
    expect(html).toContain('Standard · 60% of cards');
    expect(html).toContain('Tap the card to flip it. Drag to tilt it.');
  });
});

describe('the odds table and the place of the rules (points A10)', () => {
  const four = computeOdds([1, 2, 3, 4].map((n, i) => ({ n, kind: 'idol' as const, rarity: (['C', 'U', 'R', 'UR'] as Rarity[])[i]! })));
  it('one table: the columns Cards 1 to 4 and Card 5, one row per edition that exists, from computeOdds', () => {
    const html = renderToStaticMarkup(createElement(DropRates, { odds: four }));
    expect(html).toContain('<th scope="col">Cards 1 to 4</th><th scope="col">Card 5</th>');
    expect(html.match(/<table/g)).toHaveLength(1);
    const names = [...html.matchAll(/<th scope="row"><span class="rname">.*?<span>([^<]+)<\/span><\/span><\/th>/g)].map((m) => m[1]);
    expect(names).toEqual(['Standard', 'Stage', 'Holo', 'Gold']);
    const cells = [...html.matchAll(/<td>([\d.]+)%<\/td><td>([\d.]+)%<\/td>/g)].map((m) => [m[1], m[2]]);
    expect(cells).toEqual((['C', 'U', 'R', 'UR'] as Rarity[]).map((r) => [four.card[r].toFixed(2), four.fifth[r].toFixed(2)]));
  });
  it('all six editions when all six exist', () => {
    const html = renderToStaticMarkup(createElement(DropRates, { odds: ALL_SIX }));
    expect([...html.matchAll(/<th scope="row">/g)]).toHaveLength(6);
  });
  it('has a named place for the rules sentences, and lane ECON\'s items land in it', () => {
    const html = renderToStaticMarkup(createElement(DropRates, { odds: four, rules: createElement('li', { key: 'g' }, 'The Gold guarantee.') }));
    expect(html).toContain('id="rates-rules"');
    expect(html).toContain('data-slot="pack-rules"');
    expect(html).toContain('<h3 class="rules-h" id="rates-rules-h">Pack rules</h3>');
    expect(html).toMatch(/<ul class="rules-list">[\s\S]*<li>The Gold guarantee\.<\/li><\/ul>/);
    expect(html).toContain('The fifth card of every pack is Stage or better.');
  });
  it('says nothing is in packs when there are no odds', () => {
    expect(renderToStaticMarkup(createElement(DropRates, { odds: null }))).toContain('No card is in packs yet.');
  });
});

describe('the Help text (point A18)', () => {
  const html = renderToStaticMarkup(createElement(CardsFaq));
  it('has 3 steps and 11 questions under real headings, and no FAQPage markup', () => {
    expect(html.match(/<li><b>/g)).toHaveLength(3);
    expect(FAQ).toHaveLength(11);
    expect(html.match(/<h3>/g)).toHaveLength(11);
    expect(html).toContain('<h2 class="h2" id="faq-how">How it works</h2>');
    expect(html).not.toMatch(/FAQPage|ld\+json|itemtype/);
  });
  it('answers the eleven questions of the brief, from the rules of the game', () => {
    const q = FAQ.map((f) => f.q);
    expect(q).toEqual([
      'Is it free?', 'Are there ads?', 'Are packs ever sold?', 'Where do the photos come from?', 'How do I report a photo?', 'Why do I need an account?',
      'How does the stack of packs refill?', 'What are shards, and what is crafting?', 'Is there a Gold guarantee?', 'What is a half card, and what if I miss one?', 'Can I add Bunnyverse to my home screen?',
    ]);
    expect(html).toContain('optional rewarded ads on bunnyverse.org');
    expect(html).toContain('25 shards');
    expect(html).toContain('Never. Packs cannot be bought');
    expect(html).toContain('Wikimedia Commons');
    expect(html).toContain('every card credits its photographer'.replace('every', 'Every'));
    expect(html).toContain('href="/cards/report"');
    expect(html).toContain('We remove a reported photo within 48 hours.');
    expect(html).toContain('the Kpopdle'.replace('the ', ''));
    expect(html).toContain('A new pack arrives every 10 minutes, and you hold up to 5.');
    expect(html).toContain('at most 40 packs a day');
    expect(html).toContain('At midnight, Paris time, the stack is topped up to 5.');
    expect(html).toContain('50 shards open a pack');
    // lot 4 A11 as built by lane ECON: card 5 of pack 30 is the Gold (was 'the 30th pack holds a Gold at the latest')
    expect(html).toContain('the fifth card of the 30th pack is a Gold');
    expect(html).toContain('Completes the pair');
    expect(html).toContain('A Full Art card cannot be crafted');
    expect(html).toContain('marked 1/2 and 2/2');
    expect(html).toContain('Add to Home Screen');
  });
  it('has no retired rarity name and no dash', () => {
    expect(html).not.toMatch(OLD_NAMES);
    expect(html).not.toMatch(DASHES);
  });
  it('the Help tab is in the bar and its page is a Cards path; the footer links to it', () => {
    expect(wrap(createElement(CardsBar))).toContain('href="/cards/help"');
    expect(renderToStaticMarkup(createElement(CardsFooter))).toContain('href="/cards/help"');
  });
});

describe('no dash in the Cards sources the lane wrote', () => {
  const root = join(__dirname, '../..');
  const files = [
    ...readdirSync(__dirname).filter((f) => !f.endsWith('.test.ts')).map((f) => join(__dirname, f)),
    ...readdirSync(join(root, 'styles/cards')).map((f) => join(root, 'styles/cards', f)),
    ...['demo.ts', 'ui-model.ts', 'ui-detail.ts', 'ui-credit.ts', 'ui-api.ts', 'ui-mock-api.ts'].map((f) => join(root, 'lib/cards', f)),
  ];
  it.each(files.map((f) => [f.slice(root.length + 1), f]))('%s', (_n, f) => {
    expect(readFileSync(f as string, 'utf8')).not.toMatch(DASHES);
  });
});
