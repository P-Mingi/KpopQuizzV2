// Run O1, lot (c) part 2 (B3): the crypto of the jump (cookies.md 1 to 3). Ticket (sign, verify, expiry, tamper),
// the transaction cookie, PKCE, the cookie name per protocol, the flag and the secret.
import { createHmac } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  B64U_16_RE, B64U_32_RE, CODE_HASH_RE, MAC_LABELS, PASSPORT_SECONDS, TX_COOKIE_NAMES,
} from './types';
import {
  b64u, clientIp, codeHash, ipHash, newCode, newState, newVerifier, passportJumpOn, pkceChallenge, safeEqual,
  signTicket, signTx, ticketSecret, txCookieAttributes, txCookieName, uaFamily, verifyTicket, verifyTx,
} from './ticket';

const SECRET = 'test-secret-0123456789-abcdefghijklmnop';
const NOW = 1_800_000_000;

const mac = (label: string, p: string, secret = SECRET): string =>
  b64u(createHmac('sha256', secret).update(label + p).digest());

describe('the flag and the secret', () => {
  it('a missing, empty or short secret means the jump is off, whatever the flag says', () => {
    expect(ticketSecret({})).toBeNull();
    expect(ticketSecret({ PASSPORT_TICKET_SECRET: '' })).toBeNull();
    expect(ticketSecret({ PASSPORT_TICKET_SECRET: 'short' })).toBeNull();
    expect(ticketSecret({ PASSPORT_TICKET_SECRET: SECRET })).toBe(SECRET);
    expect(passportJumpOn({ PASSPORT_JUMP: '1' })).toBe(false);
    expect(passportJumpOn({ PASSPORT_JUMP: '1', PASSPORT_TICKET_SECRET: 'short' })).toBe(false);
  });

  it('the flag is on only for 1 or true, and only with the secret', () => {
    const base = { PASSPORT_TICKET_SECRET: SECRET };
    expect(passportJumpOn({ ...base, PASSPORT_JUMP: '1' })).toBe(true);
    expect(passportJumpOn({ ...base, PASSPORT_JUMP: 'true' })).toBe(true);
    for (const off of [undefined, '', '0', 'false', 'on']) expect(passportJumpOn({ ...base, PASSPORT_JUMP: off })).toBe(false);
  });
});

describe('the ticket (cookies.md 1)', () => {
  const ticket = (over: Partial<{ from: 'kpop' | 'anime' | 'hub'; to: 'kpop' | 'anime' | 'hub'; next: string }> = {}, now = NOW) =>
    signTicket(SECRET, { from: 'kpop', to: 'anime', next: '/quizzes?x=1', ...over }, now);
  const expectOk = { to: 'anime' as const, from: 'kpop', next: '/quizzes?x=1' };

  it('has the shape p.s, with the JSON keys in the order v, from, to, next, exp and exp = mint time + 600', () => {
    const t = ticket();
    const [p, s] = t.split('.') as [string, string];
    expect(JSON.parse(Buffer.from(p, 'base64url').toString('utf8'))).toEqual({
      v: 1, from: 'kpop', to: 'anime', next: '/quizzes?x=1', exp: NOW + PASSPORT_SECONDS.ticket,
    });
    expect(Buffer.from(p, 'base64url').toString('utf8')).toBe(
      `{"v":1,"from":"kpop","to":"anime","next":"/quizzes?x=1","exp":${NOW + 600}}`,
    );
    expect(s).toBe(mac(MAC_LABELS.ticket, p));
    expect(t).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  });

  it('verifies, then returns the payload', () => {
    const r = verifyTicket(SECRET, ticket(), expectOk, NOW + 5);
    expect(r).toEqual({ ok: true, ticket: { v: 1, from: 'kpop', to: 'anime', next: '/quizzes?x=1', exp: NOW + 600 } });
  });

  it('is valid for 10 minutes: the last second passes, the 601st does not', () => {
    const t = ticket();
    expect(verifyTicket(SECRET, t, expectOk, NOW + 599).ok).toBe(true);
    expect(verifyTicket(SECRET, t, expectOk, NOW + 600)).toEqual({ ok: false, reason: 'expired' });
    expect(verifyTicket(SECRET, t, expectOk, NOW + 3600)).toEqual({ ok: false, reason: 'expired' });
  });

  it('rejects any tamper: a flipped payload byte, a flipped MAC byte, a swapped part, another secret', () => {
    const t = ticket();
    const [p, s] = t.split('.') as [string, string];
    const flip = (x: string) => (x[0] === 'A' ? 'B' : 'A') + x.slice(1);
    expect(verifyTicket(SECRET, `${flip(p)}.${s}`, expectOk, NOW)).toEqual({ ok: false, reason: 'mac' });
    expect(verifyTicket(SECRET, `${p}.${flip(s)}`, expectOk, NOW)).toEqual({ ok: false, reason: 'mac' });
    expect(verifyTicket(SECRET, `${s}.${p}`, expectOk, NOW).ok).toBe(false);
    expect(verifyTicket(`${SECRET}x`, t, expectOk, NOW)).toEqual({ ok: false, reason: 'mac' });
    for (const junk of ['', 'abc', 'a.b.c', '.', 'a.', '.b', 'ä.ö']) expect(verifyTicket(SECRET, junk, expectOk, NOW).ok).toBe(false);
  });

  it('a ticket re-signed under the transaction label is not a ticket (the labels separate them)', () => {
    const p = b64u(JSON.stringify({ v: 1, from: 'kpop', to: 'anime', next: '/quizzes?x=1', exp: NOW + 600 }));
    expect(verifyTicket(SECRET, `${p}.${mac(MAC_LABELS.tx, p)}`, expectOk, NOW)).toEqual({ ok: false, reason: 'mac' });
    expect(verifyTicket(SECRET, `${p}.${mac(MAC_LABELS.ticket, p)}`, expectOk, NOW).ok).toBe(true);
  });

  it('checks version, target, source and next', () => {
    const forge = (obj: unknown) => {
      const p = b64u(JSON.stringify(obj));
      return `${p}.${mac(MAC_LABELS.ticket, p)}`;
    };
    const good = { v: 1, from: 'kpop', to: 'anime', next: '/quizzes?x=1', exp: NOW + 600 };
    expect(verifyTicket(SECRET, forge({ ...good, v: 2 }), expectOk, NOW)).toEqual({ ok: false, reason: 'version' });
    expect(verifyTicket(SECRET, ticket({ to: 'hub' }), expectOk, NOW)).toEqual({ ok: false, reason: 'to' });
    expect(verifyTicket(SECRET, ticket(), { ...expectOk, from: 'hub' }, NOW)).toEqual({ ok: false, reason: 'from' });
    expect(verifyTicket(SECRET, ticket(), { ...expectOk, from: null }, NOW)).toEqual({ ok: false, reason: 'from' });
    expect(verifyTicket(SECRET, ticket(), { ...expectOk, next: '/other' }, NOW)).toEqual({ ok: false, reason: 'next' });
    expect(verifyTicket(SECRET, ticket(), { ...expectOk, next: null }, NOW)).toEqual({ ok: false, reason: 'next' });
    expect(verifyTicket(SECRET, forge({ ...good, from: 'anime' }), { ...expectOk, from: 'anime' }, NOW)).toEqual({ ok: false, reason: 'from' });
    expect(verifyTicket(SECRET, forge({ ...good, from: 'mars' }), { ...expectOk, from: 'mars' }, NOW).ok).toBe(false);
    expect(verifyTicket(SECRET, forge({ ...good, exp: 'soon' }), expectOk, NOW).ok).toBe(false);
    expect(verifyTicket(SECRET, forge('text'), expectOk, NOW).ok).toBe(false);
  });
});

describe('the transaction cookie (cookies.md 2)', () => {
  const tx = (over: Partial<{ iat: number; via: string | null }> = {}) => ({
    state: newState(), verifier: newVerifier(), next: '/quizzes', from: 'kpop' as const, via: 'k.menu' as string | null,
    iat: NOW, ...over,
  });

  it('seals state, verifier, next, from, via, iat in that order, under its own label', () => {
    const v = tx();
    const raw = signTx(SECRET, v);
    const [p, s] = raw.split('.') as [string, string];
    expect(Object.keys(JSON.parse(Buffer.from(p, 'base64url').toString('utf8')))).toEqual(['state', 'verifier', 'next', 'from', 'via', 'iat']);
    expect(s).toBe(mac(MAC_LABELS.tx, p));
    expect(verifyTx(SECRET, raw, NOW + 1)).toEqual({ ok: true, tx: v });
  });

  it('is valid for 300 seconds from iat', () => {
    const raw = signTx(SECRET, tx());
    expect(verifyTx(SECRET, raw, NOW + 299).ok).toBe(true);
    const late = verifyTx(SECRET, raw, NOW + 300);
    expect(late.ok).toBe(false);
    expect(late).toMatchObject({ ok: false, reason: 'expired' });
    expect(late.ok === false && late.tx?.next).toBe('/quizzes');
  });

  it('refuses a missing, tampered or foreign cookie', () => {
    const raw = signTx(SECRET, tx());
    expect(verifyTx(SECRET, undefined, NOW)).toMatchObject({ ok: false, reason: 'format' });
    expect(verifyTx(SECRET, '', NOW)).toMatchObject({ ok: false, reason: 'format' });
    expect(verifyTx(SECRET, raw.slice(0, -2) + 'AA', NOW)).toMatchObject({ ok: false, reason: 'mac' });
    expect(verifyTx('another-secret-0123456789-abcdef', raw, NOW)).toMatchObject({ ok: false, reason: 'mac' });
    // a ticket is not a transaction cookie, and a transaction cookie is not a ticket
    const ticket = signTicket(SECRET, { from: 'kpop', to: 'anime', next: '/' }, NOW);
    expect(verifyTx(SECRET, ticket, NOW)).toMatchObject({ ok: false, reason: 'mac' });
    expect(verifyTicket(SECRET, raw, { to: 'anime', from: 'kpop', next: '/quizzes' }, NOW).ok).toBe(false);
  });

  it('refuses a well signed cookie whose fields are malformed', () => {
    const forge = (obj: unknown) => {
      const p = b64u(JSON.stringify(obj));
      return `${p}.${mac(MAC_LABELS.tx, p)}`;
    };
    const good = tx();
    expect(verifyTx(SECRET, forge({ ...good, state: 'short' }), NOW)).toMatchObject({ ok: false, reason: 'format' });
    expect(verifyTx(SECRET, forge({ ...good, verifier: 'short' }), NOW)).toMatchObject({ ok: false, reason: 'format' });
    expect(verifyTx(SECRET, forge({ ...good, from: 'mars' }), NOW)).toMatchObject({ ok: false, reason: 'format' });
    expect(verifyTx(SECRET, forge({ ...good, via: 3 }), NOW)).toMatchObject({ ok: false, reason: 'format' });
    expect(verifyTx(SECRET, forge({ ...good, iat: 'now' }), NOW)).toMatchObject({ ok: false, reason: 'format' });
  });
});

describe('the cookie name follows the protocol (cookies.md 2)', () => {
  it('__Host-pp_tx on every https request, with Secure', () => {
    // FandomVerse (owner, 2026-10-28): the hub and anime addresses moved from fanquiz.org and otakuquiz.org to fandomverse.org.
    for (const url of ['https://kpopquiz.org/auth/arrive', 'https://anime.localhost:3104/auth/arrive', 'https://fandomverse.org/', 'https://fandomverse.org/anime/auth/arrive']) {
      expect(txCookieName(url, null, {})).toBe(TX_COOKIE_NAMES.https);
    }
    expect(txCookieName('http://x.test/', 'https', {})).toBe('__Host-pp_tx');
    expect(txCookieAttributes('__Host-pp_tx')).toEqual({ httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 300 });
  });

  it('always __Host-pp_tx on a production deployment, even for an http request', () => {
    expect(txCookieName('http://localhost:3000/', null, { VERCEL_ENV: 'production' })).toBe('__Host-pp_tx');
  });

  it('pp_tx only on http requests to localhost or *.localhost, without Secure', () => {
    for (const url of ['http://localhost:3000/', 'http://kpop.localhost:3103/auth/arrive', 'http://a.b.localhost/x']) {
      expect(txCookieName(url, null, {})).toBe(TX_COOKIE_NAMES.devHttp);
    }
    expect(txCookieAttributes('pp_tx')).toEqual({ httpOnly: true, secure: false, sameSite: 'lax', path: '/', maxAge: 300 });
  });

  it('no cookie at all on http to any other host (no downgrade), and on an unparseable url', () => {
    expect(txCookieName('http://kpopquiz.org/', null, {})).toBeNull();
    expect(txCookieName('http://evillocalhost/', null, {})).toBeNull();
    expect(txCookieName('http://localhost.evil.test/', null, {})).toBeNull();
    expect(txCookieName('not a url', null, {})).toBeNull();
  });

  it('never carries a Domain, and the clearing cookie keeps the attributes with Max-Age 0', () => {
    expect(txCookieAttributes('pp_tx')).not.toHaveProperty('domain');
    expect(txCookieAttributes('__Host-pp_tx', 0)).toMatchObject({ maxAge: 0, path: '/', secure: true });
  });
});

describe('PKCE, state and code (cookies.md 2 and 3)', () => {
  it('S256 matches the RFC 7636 appendix B vector', () => {
    expect(pkceChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });

  it('the random values have the contract lengths and never repeat', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const state = newState();
      const verifier = newVerifier();
      const code = newCode();
      expect(state).toMatch(B64U_16_RE);
      expect(verifier).toMatch(B64U_32_RE);
      expect(code).toMatch(B64U_32_RE);
      expect(pkceChallenge(verifier)).toMatch(B64U_32_RE);
      for (const v of [state, verifier, code]) {
        expect(seen.has(v)).toBe(false);
        seen.add(v);
      }
    }
  });

  it('the stored form of a code is the lowercase hex SHA-256, 64 characters', () => {
    expect(codeHash('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(codeHash(newCode())).toMatch(CODE_HASH_RE);
  });

  it('safeEqual is true only for equal strings', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
    expect(safeEqual('', '')).toBe(true);
  });
});

describe('the visitor for the log', () => {
  it('hashes the address with the salt (HMAC), and stores nothing without an address or a salt', () => {
    const env = { NET_IP_HASH_SALT: 'salt-1' };
    const h = ipHash('203.0.113.7', env);
    expect(h).toBe(createHmac('sha256', 'salt-1').update('203.0.113.7').digest('hex'));
    expect(h).not.toContain('203.0.113.7');
    expect(ipHash('203.0.113.8', env)).not.toBe(h);
    expect(ipHash('203.0.113.7', { NET_IP_HASH_SALT: 'salt-2' })).not.toBe(h);
    expect(ipHash(null, env)).toBeNull();
    expect(ipHash('203.0.113.7', {})).toBeNull();
  });

  it('reads the first address of the proxy headers', () => {
    const h = (o: Record<string, string>) => ({ get: (k: string) => o[k] ?? null });
    expect(clientIp(h({ 'x-forwarded-for': '198.51.100.1, 10.0.0.1' }))).toBe('198.51.100.1');
    expect(clientIp(h({ 'x-real-ip': '198.51.100.2' }))).toBe('198.51.100.2');
    expect(clientIp(h({}))).toBeNull();
  });

  it('keeps a coarse browser family, never the user agent', () => {
    expect(uaFamily('Mozilla/5.0 (Macintosh) AppleWebKit/605 Version/17 Safari/605')).toBe('safari');
    expect(uaFamily('Mozilla/5.0 Chrome/120 Safari/537')).toBe('chrome');
    expect(uaFamily('Mozilla/5.0 Firefox/120')).toBe('firefox');
    expect(uaFamily('Mozilla/5.0 Chrome/120 Safari/537 Edg/120')).toBe('edge');
    expect(uaFamily('Googlebot/2.1')).toBe('bot');
    expect(uaFamily(null)).toBe('unknown');
  });
});
