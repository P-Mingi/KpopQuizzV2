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
  usePathname: () => '/kpopcards', useRouter: () => ({ replace: () => undefined, push: () => undefined }), useSearchParams: () => new URLSearchParams(),
  notFound: () => { throw new Error('NEXT_HTTP_ERROR_FALLBACK;404'); },
}));

import { BinderView } from './binder-view';
import { CardDetail } from './card-detail';
import { CardFront } from './card-art';
import { KcShell } from './kc-shell';
import { CardsFaq, FAQ } from './cards-faq';
import { CardsProvider } from './cards-provider';
import { CardsSprite } from './card-art';
import { CreditBlock } from './credit-block';
import { CardsCreditsSection } from './credits-section';
import { DropRates } from './drop-rates';
import { LobbyView } from './lobby-view';
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
      expect(html).toContain(`<span>${RARITY_LABEL[r]}</span>`);
      expect(html.indexOf('class="c-name"')).toBeLessThan(html.indexOf(`class="c-rar rc-${r}"`));
      expect(html.indexOf(`class="c-rar rc-${r}"`)).toBeLessThan(html.indexOf('class="c-meta"'));
      expect(html).toContain('<svg class="" viewBox="0 0 24 24"');
      expect(html).not.toMatch(OLD_NAMES);
    }
  });
  it('a Full Art card carries its rate, from the odds; no other edition does', () => {
    const fa = slimCard({ ...cat.cards[0]!, rarity: 'L', edition: 'full' }, null, fullArtRate(ALL_SIX));
    expect(fa.rate).toBe('0.3%');
    expect(renderToStaticMarkup(createElement(CardFront, { card: fa }))).toContain('<em>0.3%</em>');
    expect(renderToStaticMarkup(createElement(CardFront, { card: card({ rarity: 'L' }) }))).not.toContain('<em>');
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
    expect(half).toContain('<span class="kw">Group </span><span class="kh">2/2</span>');
  });
});

describe('the small card (point A2) and the motion rules, read in the style sheet lifted from the v6 prototype', () => {
  const css = readFileSync(join(__dirname, '../../styles/cards/kpopcards.css'), 'utf8');
  const block = (c: string, start: string): string => { const i = c.indexOf(start); let d = 0; for (let j = c.indexOf('{', i); j < c.length; j++) { if (c[j] === '{') d++; if (c[j] === '}' && --d === 0) return c.slice(i, j + 1); } return ''; };
  it('under 150 px of card width only the name and the rarity line stay, the gem at least 10 px', () => {
    const q = [...css.matchAll(/@container \(max-width:149px\)/g)].map((m) => block(css, css.slice(m.index!, m.index! + 140))).join('\n');
    expect(q).not.toBe('');
    expect(q).toMatch(/\.c-meta[^{]*\{[^}]*display:none/);
    expect(q).toMatch(/text-overflow:ellipsis/);
    expect(q).toMatch(/\.c-rar svg\{width:max\(10px/);
    expect(q).toMatch(/\.c-rar\{[^}]*font-size:max\(8px/);
    expect(q).toMatch(/\.c-kind \.kw\{display:none\}/);
  });
  it('the card is its own container', () => { expect(css).toMatch(/\.bvc \.card\{[^}]*container-type:inline-size/); });
  it('every keyframe of the lifted sheet is named kc-*, and the Full Art rim turns by transform', () => {
    for (const m of css.matchAll(/@keyframes ([\w-]+)\{/g)) expect(m[1]).toMatch(/^kc-/);
    expect(readFileSync(join(__dirname, '../../styles/cards/cards-tokens.css'), 'utf8')).not.toContain('@property');
    expect(css).toMatch(/@keyframes kc-rimspin\{to\{transform:rotate\(360deg\)\}\}/);
  });
  it('the card transitions transform and shadow only; the glare layer is moved by transform', () => {
    const card = /\.bvc \.card\{[^}]*\}/.exec(css)![0];
    expect(card).toMatch(/transition:transform \.45s var\(--ease\),box-shadow \.3s/);
  });
  it('the sheen sweep uses the house easing, and the dragged card spring-backs', () => {
    expect(css).toContain('.bvc .card.sweep .c-sheen::before{animation:kc-sweep .9s var(--ease) both}');
    expect(readFileSync(join(__dirname, '../../styles/cards/cards-photo.css'), 'utf8')).toMatch(/\.d-flip \.card\{transition:transform \.6s var\(--spring\)/);
  });
  it('the flip never shows the back through the front: each face switches visibility at the middle of the flip (card view)', () => {
    expect(css).toContain('.bvc .d-flip .bk{visibility:hidden;transition:visibility 0s linear .4s}');
    expect(css).toContain('.bvc .d-flip.flipped .fr{visibility:hidden}');
  });
});

describe('the band under a pocket (point A1)', () => {
  it('is 30 px high, with the copies count, New, the slot and the star in it, never on the card face', () => {
    const html = wrap(createElement(PocketFoot, { n: slim.cards[0]!.n, name: 'Mira', edition: 'Standard', isNew: true, copies: 3, slot: createElement('button', { className: 'heart' }, 'heart') }));
    expect(html).toContain('class="pw-foot"');
    expect(html).toContain('<span class="chip-new">New</span>');
    expect(html).toContain('<span class="chip-n" aria-hidden="true">×3</span>');
    expect(html).toContain('<button class="heart">heart</button>');
    // The prototype's band: min-height 30 px, the star and the heart 30 px with a 44 px hit area (::before inset -7px).
    const ui = readFileSync(join(__dirname, '../../styles/cards/kpopcards.css'), 'utf8');
    expect(ui).toMatch(/\.pw-foot\{[^}]*min-height:30px/);
    expect(ui).toMatch(/\.star::before,\.bvc \.want::before\{[^}]*inset:-7px/);
  });
  it('the face of a card holds neither the count, New, nor the star', () => {
    const html = renderToStaticMarkup(createElement(CardFront, { card: card() }));
    expect(html).not.toMatch(/chip-new|chip-n|class="star/);
  });
  it('a missing card of the binder has the same band, with an empty slot for the wishlist heart', () => {
    const html = wrap(createElement(BinderView, { ads: ADS_OFF }));
    expect(html).toContain('class="pw"');
    expect(html).toMatch(/class="pw"><a class="pocket"[^>]*missing[\s\S]*?<div class="pw-foot">/);
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
      wrap(createElement(LobbyView, { odds: ALL_SIX, ads: ADS_OFF })),
      wrap(createElement(BinderView, { ads: ADS_OFF })),
      wrap(createElement(CardDetail, { ...d.props, credit: createElement(CreditBlock, { photo: d.photo, num: 'BV1-0001' }) })),
      wrap(createElement(CardDetail, { ...locked.props, credit: null })),
      wrap(createElement(CardsFaq)),
      wrap(createElement(KcShell, null)),
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
    expect(html).toContain('Tap to see the back');
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
  it('has 3 steps and 11 questions (a list of details), and no FAQPage markup', () => {
    expect(html.match(/<div class="stepc">/g)).toHaveLength(3);
    expect(FAQ).toHaveLength(11);
    expect(html.match(/<details/g)).toHaveLength(11);
    expect(html).toContain('<h2 id="faq-q">Questions</h2>');
    expect(html).not.toMatch(/FAQPage|ld\+json|itemtype/);
  });
  it('answers the eleven questions of the v6 prototype, from the rules of the game', () => {
    const q = FAQ.map((f) => f.q);
    expect(q).toEqual([
      'Is it free?', 'Do I need an account?', 'Is there crypto, NFTs or a marketplace?', 'How do the odds work?', 'What are shards?', 'Why is a card locked?',
      'What is a half card?', 'Where do the photos come from?', 'Why are there ads?', 'Will it send me notifications?', 'Can I put it on my home screen?',
    ]);
    expect(html).toContain('Packs are never sold');
    expect(html).toContain('Wikimedia Commons');
    expect(html).toContain('We remove a reported photo within 48 hours.');
    expect(html).toContain('a fixed 25 shards');
    expect(html).toContain('never between 22:00 and 08:00');
    expect(html).toContain('the fifth card of pack 30 is Gold');
    expect(html).toContain('50 shards open a pack');
    expect(html).toContain('Standard 1, Stage 2, Holo 5, Era 12, Gold 30, Full Art 80');
    expect(html).toContain('Standard 10, Stage 20, Holo 50, Era 120, Gold 300');
    expect(html).toContain('Add to Home Screen');
  });
  it('has no retired rarity name and no dash', () => {
    expect(html).not.toMatch(OLD_NAMES);
    expect(html).not.toMatch(DASHES);
  });
  it('the Help tab is in the bar and its page is a Cards path; the footer links to it', () => {
    expect(wrap(createElement(KcShell, null))).toContain('href="/kpopcards/help"');
  });
});

describe('no dash in the Cards sources the lane wrote', () => {
  const root = join(__dirname, '../..');
  const files = [
    ...readdirSync(__dirname).filter((f) => !f.endsWith('.test.ts')).map((f) => join(__dirname, f)),
    ...readdirSync(join(root, 'styles/cards')).map((f) => join(root, 'styles/cards', f)),
    ...['demo.ts', 'ui-model.ts', 'ui-detail.ts', 'ui-credit.ts', 'ui-api.ts'].map((f) => join(root, 'lib/cards', f)),
  ];
  it.each(files.map((f) => [f.slice(root.length + 1), f]))('%s', (_n, f) => {
    expect(readFileSync(f as string, 'utf8')).not.toMatch(DASHES);
  });
});
