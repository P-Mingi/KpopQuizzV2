/**
 * V-TEXT step test - THE FOLD LAW, proven at the server-HTML level:
 *   1. splitTipTapForFold is content-lossless (preview + rest == whole).
 *   2. The folded SectionSurface SSR markup keeps the FULL text in the served
 *      HTML inside a native <details> (what a crawler or JS-off reader gets;
 *      details expands without any JavaScript).
 *
 *   npx tsx scripts/test-vtext-fold.mts
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { renderTipTapJSON, splitTipTapForFold } from '../src/lib/verse/render-content';
import { SectionSurface } from '../src/components/verse/editor/section-surface';

const para = (text: string) => ({ type: 'paragraph', content: [{ type: 'text', text }] });
const doc = {
  type: 'doc',
  content: [
    para('First paragraph: the preview begins here with enough words to look real.'),
    para('Second paragraph: still inside the preview window of the fold.'),
    para('Third paragraph: this one must land in the folded remainder.'),
    para('Fourth paragraph: also folded, and it must still be crawlable.'),
    para(Array.from({ length: 300 }, (_, i) => `word${i}`).join(' ')),
  ],
};

let failures = 0;
const check = (label: string, ok: boolean): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) failures += 1;
};

// 1. Lossless split
const split = splitTipTapForFold(doc, 2);
const strip = (h: string): string => h.replace(/<[^>]*>/g, '');
check('split preview has the first 2 paragraphs', strip(split.previewHtml).includes('Second paragraph') && !strip(split.previewHtml).includes('Third paragraph'));
check('split rest has the remainder', strip(split.restHtml).includes('Third paragraph') && strip(split.restHtml).includes('word299'));
check('preview + rest text equals the whole document text', strip(split.previewHtml) + strip(split.restHtml) === strip(renderTipTapJSON(doc)));
check('word count is real', split.totalWords > 300);

// 2. SSR markup: full text served, remainder inside a native <details>
const html = renderToStaticMarkup(
  React.createElement(SectionSurface, {
    entityType: 'group', entityId: '1', section: 'overview', label: 'Overview',
    initialHtml: renderTipTapJSON(doc), initialContent: doc,
    baseRevisionId: null, locked: false, lockReason: null, emptyInvite: 'x',
  }),
);
check('SSR keeps the FULL text in the served HTML', html.includes('Third paragraph') && html.includes('word299'));
check('the remainder sits inside a native <details class="v-fold">', /<details class="v-fold"><summary>.*<\/summary>.*Third paragraph/.test(html.replace(/\n/g, '')));
check('the preview renders before the fold', html.indexOf('First paragraph') < html.indexOf('<details'));

// 3. inline preference disables the fold
const inlineHtml = renderToStaticMarkup(
  React.createElement(SectionSurface, {
    entityType: 'group', entityId: '1', section: 'overview', label: 'Overview',
    initialHtml: renderTipTapJSON(doc), initialContent: doc,
    baseRevisionId: null, locked: false, lockReason: null, emptyInvite: 'x', foldPref: 'inline',
  }),
);
check("foldPref 'inline' renders without a details fold", !inlineHtml.includes('<details') && inlineHtml.includes('word299'));

if (failures) { console.error(`\n${failures} check(s) failed`); process.exit(1); }
console.log('\nV-TEXT fold law holds.');
