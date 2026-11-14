// KpopCards: the signed-out lobby is the prototype's guest view (the same layout under the guest banner), with the empty state of every personal
// block: an empty stack, no last pull, no history, no player in the ranking, no pack of the day (it needs the wallet). Never an invented number.
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

const ADS_OFF: AdsContext = { enabled: false, client: null, bannerSlot: null, country: null, childDirected: false, consentRequired: true, test: false };
const html = renderToStaticMarkup(createElement(LobbyView, { odds: null, ads: ADS_OFF }));

describe('the guest lobby', () => {
  it('has the guest banner with the demo pack and the sign-in button', () => {
    expect(html).toContain('id="guest"');
    expect(html).toContain('Open a demo pack');
    expect(html).toContain('id="guest-in"');
  });
  it('draws the stack empty: ten empty segments and no pack ready', () => {
    expect(html).toContain('id="stack"');
    expect(html.match(/<i class="on"/g)).toBeNull();
    expect(html).toContain('<b class="num">0</b> of 10 packs ready');
    expect(html).toContain('id="open5-btn"');
  });
  it('shows no pull, no history, no friend and no pack of the day', () => {
    expect(html).toContain('id="last-empty"');
    expect(html).not.toContain('id="hist-wrap"');
    expect(html).not.toContain('<li class="me"');
    expect(html).not.toContain('Pack of the day');
    expect(html).not.toContain('id="ring-fg"');
  });
});
