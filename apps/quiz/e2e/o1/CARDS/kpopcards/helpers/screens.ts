import type { Page } from '@playwright/test';

export type Side = 'proto' | 'app';

/** One screen of the prototype, with how to reach it on both sides. The markup of the app copies the prototype
 *  (same ids and classes), so the steps and the boxes are shared. */
export type Screen = {
  id: string;
  /** prototype hash route */
  hash: string;
  /** app path under /kpopcards */
  app: string;
  /** selector that proves the screen is ready (both sides) */
  ready: string;
  /** extra steps after load (both sides), e.g. click a tab */
  steps?: (page: Page, side: Side) => Promise<void>;
  /** key boxes: each selector, its first matches, compared within 2 px */
  boxes: string[];
  /** full page or viewport screenshot */
  full?: boolean;
  /** app state needed (wired by the contract); skipped with a note when not available */
  needs?: string;
  /** ms to let animations settle after the steps */
  settle?: number;
};

const openControls = (p: Page) => p.evaluate(() => { const d = document.querySelector('details.proto') as HTMLDetailsElement | null; if (d) d.open = true; });
export { openControls };

const TOP = ['.top', '.tabs a', '.wallet .pill', '#bell-btn', '#set-btn', '.bottomnav a'];

export const SCREENS: Screen[] = [
  {
    id: 'lobby', hash: 'lobby', app: '', ready: '#pack', full: true,
    boxes: [...TOP, '.p-head2', '#stage', '#pack', '#stack', '#open-btn', '#open5-btn', '.ichip', '.shelf', '#shelf > *', '.tile', '.almost', '.strip', '.mx', '.m-coll', '.m-week', '.m-rank', '.m-quiz', '.m-odds', '.foot'],
  },
  {
    id: 'lobby-guest', hash: 'lobby', app: '', ready: '#guest:not([hidden])', full: true, needs: 'guest',
    steps: async (page, side) => { if (side === 'proto') { await openControls(page); await page.click('#guest-tg'); await page.evaluate(() => scrollTo(0, 0)); } },
    boxes: [...TOP, '#guest', '#guest-demo', '#guest-in', '#pack', '#open-btn'],
  },
  {
    // The integrator's guest view: the same lobby plus the #guest banner, the personal blocks in their empty state (the prototype's "Empty binder", then "Guest view").
    id: 'lobby-guest-empty', hash: 'lobby', app: '', ready: '#guest:not([hidden])', full: true, needs: 'guest',
    steps: async (page, side) => { if (side === 'proto') { await openControls(page); await page.click('#reset-empty'); await page.click('#guest-tg'); await page.evaluate(() => { const d = document.querySelector('details.proto') as HTMLDetailsElement | null; if (d) d.open = false; scrollTo(0, 0); }); } },
    boxes: [...TOP, '#guest', '#guest-demo', '#guest-in', '.p-head2', '#stage', '#pack', '#stack', '#open-btn', '#open5-btn', '.ichip', '.shelf', '#shelf > *', '.tile', '.almost', '.strip', '.mx', '.m-coll', '.m-week', '.m-rank', '.m-quiz', '.m-odds', '.foot'],
  },
  {
    id: 'collection-binder', hash: 'collection', app: '/collection', ready: '#spread .card', full: true,
    boxes: [...TOP, '.b-head', '.b-progress', '.b-tools', '.seg button', '.search', '#fbtn', '#recycle', '#spread', '#spread .card', '.b-nav', '#idx', '.adslot'],
  },
  {
    id: 'collection-grid', hash: 'collection', app: '/collection', ready: '#grid .card', full: true,
    steps: async (page) => { await page.click('#f-view [data-v="grid"]'); await page.waitForSelector('#grid .card'); },
    boxes: [...TOP, '.b-tools', '.g-head', '.g-sort button', '.pager', '#grid', '#grid .card', '#pg-bot'],
  },
  {
    id: 'collection-filters', hash: 'collection', app: '/collection', ready: '#fpanel .fgroup',
    // the Filters button and the sheet exist on small screens only; on desktop the filters sit inline
    steps: async (page) => { if (await page.locator('#fbtn').isVisible()) await page.click('#fbtn'); await page.waitForTimeout(500); },
    boxes: [...TOP, '#fpanel', '#fpanel .fgroup', '#fpanel button'],
  },
  {
    id: 'card-view', hash: 'collection', app: '/collection', ready: '#dt:not([hidden]) .sheet',
    steps: async (page) => { await page.click('#f-view [data-v="grid"]'); await page.waitForSelector('#grid .card'); await page.click('#grid .card >> nth=0'); await page.waitForSelector('#dt:not([hidden]) .sheet'); await page.waitForTimeout(900); },
    // the lock button has no counterpart in the prototype (integrator decision): it is left out of the index-based button list, and the credit line keeps its box
    boxes: ['.sheet', '.d-flip', '.d-flip .card', '.moment', '.credit', '.sheet button:not(#d-lock)'],
  },
  { id: 'missions', hash: 'missions', app: '/missions', ready: '#week', full: true, boxes: [...TOP, '.h1', '.lede', '#week', '#week > *', '.sets', '.sets > *'] },
  { id: 'ranking-friends', hash: 'ranking', app: '/ranking', ready: '#rank li', full: true, boxes: [...TOP, '.h1', '.seg button', '#rank', '#rank li', '#me-card'] },
  {
    id: 'ranking-everyone', hash: 'ranking', app: '/ranking', ready: '#rank li', full: true,
    steps: async (page) => { await page.click('#rk-tab [data-v="all"]'); await page.waitForTimeout(300); },
    boxes: [...TOP, '#rank', '#rank li', '#me-card'],
  },
  { id: 'help', hash: 'help', app: '/help', ready: '#faq', full: true, boxes: [...TOP, '.help .h1', '.steps', '.stepc', '#faq', '#faq details', '.help h2'] },
  {
    id: 'bell', hash: 'lobby', app: '', ready: '#bell-pop:not([hidden])',
    steps: async (page) => { await page.click('#bell-btn'); await page.waitForTimeout(400); },
    boxes: [...TOP, '#bell-pop', '#bell-pop li'],
  },
  {
    id: 'avatar-menu', hash: 'lobby', app: '', ready: '#set-pop:not([hidden])',
    steps: async (page) => { await page.click('#set-btn'); await page.waitForTimeout(400); },
    boxes: [...TOP, '#set-pop', '#set-pop .srow', '#set-pop .me'],
  },
  {
    id: 'open-pack', hash: 'lobby', app: '/open/all', ready: '#opk',
    steps: async (page, side) => { if (side === 'proto') { await page.click('#open-btn'); await page.waitForSelector('#opk'); } await page.waitForTimeout(900); },
    boxes: ['.ov-top', '#ov-skip', '#ov-hint', '.tearzone', '#opk', '.pulled .slot'],
  },
  {
    id: 'open-first-card', hash: 'lobby', app: '/open/all', ready: '.pile',
    steps: async (page, side) => { if (side === 'proto') { await page.click('#open-btn'); await page.waitForSelector('#opk'); } await page.click('#opk'); await page.waitForSelector('.pile'); await page.waitForTimeout(2600); },
    boxes: ['.ov-top', '#ov-skip', '.pile', '.pile .card', '.pulled .slot', '.ov-actions'],
  },
  {
    id: 'open-summary', hash: 'lobby', app: '/open/all', ready: '#ov-add',
    steps: async (page, side) => { if (side === 'proto') { await page.click('#open-btn'); await page.waitForSelector('#opk'); } await page.click('#opk'); await page.waitForSelector('#ov-skip'); await page.waitForTimeout(1500); await page.click('#ov-skip'); await page.waitForSelector('#ov-add'); await page.waitForTimeout(3500); },
    boxes: ['.ov-top', '.fan', '.fan .fc', '.fan .fc .card', '.rlabel', '.chip', '.ov-actions', '#ov-add', '#ov-again'],
  },
];
