// Run O1, lot (c), lane B6: fq.net.caps.v1 and fq.net.via, every access in try/catch.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CAPS_KEY, VIA_KEY, clearVia, readCaps, readVia, recordDismissal, recordShown, weekKey, writeVia } from './storage';

class Store {
  m = new Map<string, string>();
  getItem(k: string): string | null { return this.m.get(k) ?? null; }
  setItem(k: string, v: string): void { this.m.set(k, v); }
  removeItem(k: string): void { this.m.delete(k); }
}
class Blocked {
  getItem(): never { throw new Error('blocked'); }
  setItem(): never { throw new Error('blocked'); }
  removeItem(): never { throw new Error('blocked'); }
}

const DAY = Date.parse('2026-10-20T12:00:00Z');

function install(local: unknown, session: unknown, path = '/'): void {
  Object.defineProperty(globalThis, 'window', {
    value: { localStorage: local, sessionStorage: session, location: { pathname: path, search: '' } },
    configurable: true,
  });
}

let local: Store;
let session: Store;
beforeEach(() => { local = new Store(); session = new Store(); install(local, session); });
afterEach(() => { Reflect.deleteProperty(globalThis, 'window'); });

describe('caps', () => {
  it('start at zero and count shown links per page, day and week', () => {
    expect(readCaps(DAY)).toEqual({ pageShown: 0, today: 0, week: 0, dismissals: 0 });
    recordShown(DAY);
    recordShown(DAY);
    expect(readCaps(DAY)).toEqual({ pageShown: 2, today: 2, week: 2, dismissals: 0 });
    expect(JSON.parse(local.getItem(CAPS_KEY)!)).toMatchObject({ v: 1, today: 2, weekCount: 2 });
  });
  it('the day counter resets the next day, the week counter the next week', () => {
    recordShown(DAY);
    expect(readCaps(DAY + 86_400_000)).toMatchObject({ today: 0, week: 1 });
    expect(readCaps(DAY + 8 * 86_400_000)).toMatchObject({ today: 0, week: 0 });
  });
  it('the page counter restarts on another page', () => {
    recordShown(DAY);
    install(local, session, '/other');
    expect(readCaps(DAY).pageShown).toBe(0);
  });
  it('dismissals are kept', () => {
    recordDismissal(DAY);
    recordDismissal(DAY);
    expect(readCaps(DAY).dismissals).toBe(2);
  });
  it('a corrupt record reads as empty', () => {
    local.setItem(CAPS_KEY, '{nope');
    expect(readCaps(DAY)).toMatchObject({ today: 0, week: 0, dismissals: 0 });
    local.setItem(CAPS_KEY, JSON.stringify({ today: -4, weekCount: 'x', dismissals: 1.9 }));
    expect(readCaps(DAY)).toMatchObject({ today: 0, week: 0, dismissals: 1 });
  });
  it('a blocked store throws nothing and reads as empty', () => {
    install(new Blocked(), new Blocked());
    expect(() => recordShown(DAY)).not.toThrow();
    expect(() => recordDismissal(DAY)).not.toThrow();
    expect(readCaps(DAY)).toMatchObject({ today: 0, week: 0, dismissals: 0 });
  });
  it('weekKey is the ISO week', () => {
    expect(weekKey(Date.parse('2026-01-01T00:00:00Z'))).toBe('2026-W01');
    expect(weekKey(Date.parse('2026-10-20T12:00:00Z'))).toBe('2026-W43');
  });
});

describe('via', () => {
  it('is kept in sessionStorage only when it matches VIA_RE', () => {
    writeVia('a.menu');
    expect(session.getItem(VIA_KEY)).toBe('a.menu');
    expect(readVia()).toBe('a.menu');
    writeVia('<bad>');
    expect(session.getItem(VIA_KEY)).toBe('a.menu');
    session.setItem(VIA_KEY, 'tampered');
    expect(readVia()).toBeNull();
    clearVia();
    expect(session.getItem(VIA_KEY)).toBeNull();
  });
  it('a blocked store throws nothing', () => {
    install(new Blocked(), new Blocked());
    expect(() => writeVia('a.menu')).not.toThrow();
    expect(() => clearVia()).not.toThrow();
    expect(readVia()).toBeNull();
  });
});
