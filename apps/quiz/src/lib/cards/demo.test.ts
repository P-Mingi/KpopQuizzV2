// Bunnyverse Cards, lot 3 point A18: the signed token of the guest demo pack (lib/cards/demo.ts), pure.
import { describe, expect, it } from 'vitest';

import { DEMO_TTL_MS, DEVICE_RE, clientIp, demoSecret, hashDemo, signDemo, verifyDemo } from './demo';

const SECRET = 'a-test-secret-of-32-characters-xx';
const T = Date.parse('2026-11-13T10:00:00Z');
const CARDS = [11, 4, 9, 30, 2];

describe('the demo token', () => {
  it('round-trips the five cards, an id of 32 hex characters and the dates', () => {
    const p = verifyDemo(signDemo(CARDS, SECRET, T), SECRET, T + 1000);
    expect(p).not.toBeNull();
    expect(p!.cards).toEqual(CARDS);
    expect(p!.jti).toMatch(/^[0-9a-f]{32}$/);
    expect(p!.exp - p!.iat).toBe(DEMO_TTL_MS);
  });
  it('two tokens of the same pack have two ids (one claim per token)', () => {
    expect(verifyDemo(signDemo(CARDS, SECRET, T), SECRET, T)!.jti).not.toBe(verifyDemo(signDemo(CARDS, SECRET, T), SECRET, T)!.jti);
  });
  it('refuses a token signed with another secret, a changed body, a changed signature and junk', () => {
    const t = signDemo(CARDS, SECRET, T);
    const [body, sig] = t.split('.') as [string, string];
    expect(verifyDemo(t, 'another-secret-of-32-characters-yy', T)).toBeNull();
    const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(body, 'base64url').toString()), cards: [1, 2, 3, 4, 5] })).toString('base64url');
    expect(verifyDemo(`${forged}.${sig}`, SECRET, T)).toBeNull();
    expect(verifyDemo(`${body}.${sig.slice(0, -2)}AA`, SECRET, T)).toBeNull();
    for (const junk of ['', 'x', '.', 'a.b.c', null, undefined, 12, {}, 'x'.repeat(700)]) expect(verifyDemo(junk, SECRET, T)).toBeNull();
  });
  it('expires after two days and is not valid from the future', () => {
    const t = signDemo(CARDS, SECRET, T);
    expect(verifyDemo(t, SECRET, T + DEMO_TTL_MS - 1)).not.toBeNull();
    expect(verifyDemo(t, SECRET, T + DEMO_TTL_MS)).toBeNull();
    expect(verifyDemo(t, SECRET, T - 120_000)).toBeNull();
  });
  it('refuses a body that is not five card numbers', () => {
    expect(verifyDemo(signDemo([1, 2, 3, 4], SECRET, T), SECRET, T)).toBeNull();
    expect(verifyDemo(signDemo([1, 2, 3, 4, 0], SECRET, T), SECRET, T)).toBeNull();
    expect(verifyDemo(signDemo([1, 2, 3, 4, 1.5], SECRET, T), SECRET, T)).toBeNull();
  });
});

describe('the secret and the hashes', () => {
  it('no secret, or a short one: no demo', () => {
    expect(demoSecret(undefined)).toBeNull();
    expect(demoSecret('')).toBeNull();
    expect(demoSecret('short')).toBeNull();
    expect(demoSecret(SECRET)).toBe(SECRET);
  });
  it('a device and an address hash are salted, stable, one kind apart and never the clear value', () => {
    const d = hashDemo('device', 'abcdefghijklmnop', SECRET);
    expect(d).toMatch(/^[0-9a-f]{64}$/);
    expect(d).toBe(hashDemo('device', 'abcdefghijklmnop', SECRET));
    expect(d).not.toBe(hashDemo('ip', 'abcdefghijklmnop', SECRET));
    expect(d).not.toBe(hashDemo('device', 'abcdefghijklmnop', 'another-secret-of-32-characters-yy'));
    expect(hashDemo('ip', '203.0.113.7', SECRET)).not.toContain('203');
  });
  it('the device id is 16 to 64 URL-safe characters', () => {
    expect(DEVICE_RE.test('abcdefghijklmnop')).toBe(true);
    expect(DEVICE_RE.test('short')).toBe(false);
    expect(DEVICE_RE.test('has space in it 123456')).toBe(false);
  });
  it('the address is the first hop of x-forwarded-for, else x-real-ip, else unknown', () => {
    expect(clientIp(new Headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }))).toBe('203.0.113.7');
    expect(clientIp(new Headers({ 'x-real-ip': '198.51.100.2' }))).toBe('198.51.100.2');
    expect(clientIp(new Headers())).toBe('unknown');
  });
});
