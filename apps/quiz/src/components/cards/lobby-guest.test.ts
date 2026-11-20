// KpopCards: the signed-out lobby is the prototype's guest view (the same layout under the guest banner), with the empty state of every personal
// block: an empty stack, no last pull, no history, no player in the ranking. Every block stays in its place; the pack of the day is server data (the
// same for everyone) and its button leads to the sign-in. Never an invented player, pull or number.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { buildFixtureCatalog } from '@/lib/cards/ui-fixture';
import { buildSlim } from '@/lib/cards/ui-model';

import type { AdsContext } from '@/lib/cards/ads';

const slim = buildSlim(buildFixtureCatalog());
const ctx = {
  status: 'guest', now: null, catalog: slim, owned: new Map(), lastPack: null, byN: new Map(slim.cards.map((c) => [c.n, c])), toast: vi.fn(), kc: null, lobby: null,
  state: null, fixture: false, demo: true, protoExample: false, refresh: vi.fn(), applyResult: vi.fn(), clearNew: vi.fn(), toggleFav: vi.fn(), recycle: vi.fn(), api: null, newSet: new Set(),
};
vi.mock('./cards-provider', () => ({ useCards: () => ctx }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), useSearchParams: () => new URLSearchParams(), usePathname: () => '/kpopcards' }));
vi.mock('@/components/ux-v1/sign-in-sheet', () => ({ useSignIn: () => vi.fn() }));

import { LobbyView } from './lobby-view';

const ADS_OFF: AdsContext = { enabled: false, client: null, bannerSlot: null, country: null, knownMinor: false, consentRequired: true, test: false };
const html = renderToStaticMarkup(createElement(LobbyView, { odds: null, ads: ADS_OFF, dailyGuest: { slug: 'twice', name: 'TWICE' } }));

describe('the guest lobby', () => {
  it('has the guest banner with the demo pack and the sign-in button', () => {
    expect(html).toContain('id="guest"');
    expect(html).toContain('Open a demo pack');
    expect(html).toContain('id="guest-in"');
  });
  it('draws the stack empty: ten empty segments and a rule sentence, no count of packs', () => {
    expect(html).toContain('id="stack"');
    expect(html.match(/<i class="on"/g)).toBeNull();
    expect(html).toContain('<b class="num">-</b> of 7 packs ready');
    expect(html).toContain('id="open5-btn"');
  });
  it('keeps every block of the lobby in place, the personal ones empty', () => {
    expect(html).toContain('id="golden-chip"');
    expect(html).toContain('Every 10th pack is golden');
    expect(html).toContain('to a sure Gold');
    expect(html).toContain('id="tile-sh"');
    // the week: the goals are rules, the progress is zero
    expect(html).toContain('Open 20 packs');
    expect(html).toContain('Win 3 Kpopdle games');
    expect(html).toContain('Add 10 new cards to your binder');
    expect(html).toContain('<small>0 of 20</small>');
    // friends: four empty rows, no player
    expect(html.match(/<span class="pos">-<\/span>/g)).toHaveLength(4);
    expect(html).toContain('id="last-empty"');
    expect(html).not.toContain('id="hist-wrap"');
        expect(html).not.toContain('id="ring-fg"');
  });
  it('shows today\'s pack of the day (server data) with a button to the sign-in, no time left', () => {
    expect(html).toContain('Pack of the day');
    expect(html).toContain('TWICE only');
    expect(html).toContain('id="daily-btn"');
    expect(html).toContain('Sign in to open</button>');
    expect(html).not.toMatch(/\d+ h \d\d left/);
  });
});
