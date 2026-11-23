// KpopCards LAUNCH-POLISH-2 (2026-11-23): the stack holds 5 packs (the owner's rule). Every player-facing text that names the number reads it from
// KC.STACK_CAP, and the lobby says "x of 5 packs ready", "up to 5 waiting". "Open 5" stays: with a cap of 5 it takes the whole stack, and it is
// disabled (guest, or under 5 packs) exactly as before.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { buildFixtureCatalog } from '@/lib/cards/ui-fixture';
import { buildSlim } from '@/lib/cards/ui-model';
import { KC } from '@/lib/kpopcards/contract';
import { helpData } from '@/lib/kpopcards/help-data';

import type { AdsContext } from '@/lib/cards/ads';

const slim = buildSlim(buildFixtureCatalog());
const ctx = {
  status: 'guest', now: null, catalog: slim, owned: new Map(), lastPack: null, byN: new Map(slim.cards.map((c) => [c.n, c])), toast: vi.fn(), kc: null, lobby: null,
  state: null, fixture: false, demo: true, protoExample: false, refresh: vi.fn(), applyResult: vi.fn(), clearNew: vi.fn(), toggleFav: vi.fn(), recycle: vi.fn(), api: null, newSet: new Set(),
};
vi.mock('./cards-provider', () => ({ useCards: () => ctx }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), useSearchParams: () => new URLSearchParams(), usePathname: () => '/kpopcards' }));
vi.mock('@/components/ux-v1/sign-in-sheet', () => ({ useSignIn: () => vi.fn() }));

import { CardsFaq } from './cards-faq';
import { LobbyView } from './lobby-view';

const ADS_OFF: AdsContext = { enabled: false, client: null, bannerSlot: null, country: null, knownMinor: false, consentRequired: true, test: false };
const lobby = renderToStaticMarkup(createElement(LobbyView, { odds: null, ads: ADS_OFF, dailyGuest: { slug: 'twice', name: 'TWICE' } }));
const text = (html: string): string => html.replace(/<[^>]+>/g, '').replace(/&#x27;|&#39;/g, "'");

describe('the stack cap of 5 in the texts', () => {
  it('the constant is 5 and Open 5 is the whole stack', () => {
    expect(KC.STACK_CAP).toBe(5);
    expect(KC.OPEN_MANY).toBe(5);
    expect(KC.OPEN_MANY).toBeLessThanOrEqual(KC.STACK_CAP);
  });
  it('the lobby says "up to 5 waiting" and "of 5 packs ready", and keeps its Open 5 button (disabled for a guest)', () => {
    expect(text(lobby)).toContain('up to 5 waiting');
    expect(lobby).toContain('of 5 packs ready');
    expect(lobby).not.toMatch(/of (7|10) packs ready/);
    expect(lobby).toMatch(/<button[^>]*id="open5-btn"[^>]*disabled=""[^>]*>Open 5<\/button>/);
    const stack = /id="stack"[^>]*>(.*?)<\/div>/.exec(lobby)?.[1] ?? '';
    expect(stack.match(/<i[ >]/g)?.length).toBe(KC.STACK_CAP);
  });
  it('the help says the stack holds 5, and the rules in numbers say 5', () => {
    const h = helpData();
    expect(h.rules.stackCap).toBe(5);
    expect(h.how[0]!.text).toContain('which holds 5.');
    expect(JSON.stringify(h)).not.toMatch(/holds (7|10)\b|up to (7|10) (packs|waiting)/);
  });
  it('the FAQ says up to 5 waiting', () => {
    const faq = text(renderToStaticMarkup(createElement(CardsFaq)));
    expect(faq).toContain('up to 5 waiting');
    expect(faq).not.toMatch(/up to (7|10) waiting/);
  });
});
