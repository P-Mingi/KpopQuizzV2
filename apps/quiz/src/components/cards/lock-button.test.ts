// KpopCards: the lock of an owned card is a 44 px icon button next to the favorite star (no switch row under the card any more):
// a real button, pressed state in aria-pressed, a name that says what a press does, and the same lock API as before.
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const kc = { collection: vi.fn(), lock: vi.fn() };
let ownedMap = new Map<number, unknown>([[7, { copies: 1 }]]);
vi.mock('./cards-provider', () => ({ useCards: () => ({ kc, owned: ownedMap, toast: vi.fn(), refresh: vi.fn() }) }));

import { LockButton } from './lock-button';

describe('the lock button', () => {
  it('is a button named "Lock this card", not pressed, until the server says the card is locked', () => {
    const html = renderToStaticMarkup(createElement(LockButton, { n: 7, name: 'Nayeon' }));
    expect(html).toMatch(/^<button type="button" class="lockbtn"/);
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain('aria-label="Lock this card"');
    expect(html).not.toContain('role="switch"');
    expect(html).not.toContain('type="checkbox"');
  });
  it('draws nothing for a card the player does not own', () => {
    ownedMap = new Map();
    expect(renderToStaticMarkup(createElement(LockButton, { n: 7, name: 'Nayeon' }))).toBe('');
    ownedMap = new Map([[7, { copies: 1 }]]);
  });
  it('sends the same lock call as before, with both names in the source', () => {
    const src = readFileSync('src/components/cards/lock-button.tsx', 'utf8');
    expect(src).toContain("kc.lock({ n, on: next })");
    expect(src).toContain("'Unlock this card'");
    expect(src).toContain("'Lock this card'");
    expect(src).toContain('aria-pressed');
  });
  it('is 44 px in the Cards stylesheet, and the switch row is gone', () => {
    const css = readFileSync('src/styles/cards/kpopcards.css', 'utf8');
    expect(css).toMatch(/\.bvc \.lockbtn\{[^}]*width:44px;height:44px/);
    expect(css).not.toContain('lockrow');
    expect(readFileSync('src/components/cards/card-detail.tsx', 'utf8')).not.toContain('LockSwitch');
  });
});
