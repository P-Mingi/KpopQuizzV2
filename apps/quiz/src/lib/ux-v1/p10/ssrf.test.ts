import { Readable } from 'node:stream';

import { describe, expect, it } from 'vitest';

import {
  checkLinkUrl, expandIPv6, fetchImageLink, isBlockedAddress, isBlockedIPv4, isBlockedIPv6, LINK_MAX_REDIRECTS,
} from './ssrf';

import type { LookupFn, Resolved, TransportFn, TransportResponse } from './ssrf';

// SSRF guard of the header "paste a link" route. No network: DNS and the HTTPS
// transport are injected, so every rule is proven deterministically.

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);

function dns(map: Record<string, string[]>): LookupFn {
  return async (host) => {
    const a = map[host];
    if (!a) throw new Error('ENOTFOUND');
    return a.map((address) => ({ address, family: address.includes(':') ? 6 : 4 } as Resolved));
  };
}

interface Step { status: number; headers?: Record<string, string>; body?: Buffer[]; remote?: string }
function transport(steps: Record<string, Step>, seen: Array<{ url: string; pinned: string }> = []): TransportFn {
  return async (url, pinned) => {
    seen.push({ url: url.toString(), pinned: pinned.address });
    const s = steps[url.toString()];
    if (!s) throw new Error('ECONNREFUSED');
    const res: TransportResponse = {
      status: s.status,
      headers: s.headers ?? {},
      remoteAddress: s.remote ?? pinned.address,
      body: Readable.from(s.body ?? []),
      destroy: () => undefined,
    };
    return res;
  };
}

describe('IPv4 ranges', () => {
  it.each([
    '0.0.0.0', '10.0.0.1', '10.255.255.255', '100.64.0.1', '100.127.255.254', '127.0.0.1', '127.1.2.3',
    '169.254.169.254', '172.16.0.1', '172.31.255.255', '192.0.0.8', '192.0.2.10', '192.88.99.1', '192.168.1.1',
    '198.18.0.1', '198.19.255.255', '198.51.100.7', '203.0.113.9', '224.0.0.1', '239.255.255.250', '240.0.0.1', '255.255.255.255',
  ])('blocks %s', (ip) => expect(isBlockedIPv4(ip)).toBe(true));
  it.each(['8.8.8.8', '1.1.1.1', '104.16.132.229', '172.15.255.255', '172.32.0.1', '100.63.255.255', '100.128.0.1', '192.169.0.1', '198.20.0.1'])(
    'allows public %s', (ip) => expect(isBlockedIPv4(ip)).toBe(false),
  );
  it.each(['1.2.3', '1.2.3.4.5', '256.1.1.1', '01x.2.3.4', ''])('treats malformed %j as blocked', (ip) => expect(isBlockedIPv4(ip)).toBe(true));
});

describe('IPv6 ranges', () => {
  it('expands compressed, zoned and dotted-tail forms', () => {
    expect(expandIPv6('::1')).toEqual([0, 0, 0, 0, 0, 0, 0, 1]);
    expect(expandIPv6('2001:db8::1')).toEqual([0x2001, 0xdb8, 0, 0, 0, 0, 0, 1]);
    expect(expandIPv6('::ffff:127.0.0.1')).toEqual([0, 0, 0, 0, 0, 0xffff, 0x7f00, 1]);
    expect(expandIPv6('fe80::1%eth0')).toEqual([0xfe80, 0, 0, 0, 0, 0, 0, 1]);
    expect(expandIPv6('not-an-ip')).toBeNull();
  });
  it.each([
    '::', '::1', '::ffff:10.0.0.1', '::ffff:169.254.169.254', '::ffff:7f00:1', '::127.0.0.1', 'fc00::1', 'fd12:3456::1',
    'fe80::1', 'fe80::1%lo0', 'fec0::1', 'ff02::1', '64:ff9b::a00:1', '64:ff9b:1::1', '2001:db8::1', '2001::1', '2001:10::1',
    '2002:a00:1::1', '100::1', '3fff::1', '[::1]',
  ])('blocks %s', (ip) => expect(isBlockedIPv6(ip)).toBe(true));
  it.each(['2606:4700:4700::1111', '2a00:1450:4007:80e::200e', '::ffff:8.8.8.8'])('allows public %s', (ip) => expect(isBlockedIPv6(ip)).toBe(false));
  it('isBlockedAddress dispatches and blocks non-addresses', () => {
    expect(isBlockedAddress('127.0.0.1')).toBe(true);
    expect(isBlockedAddress('[fe80::1]')).toBe(true);
    expect(isBlockedAddress('8.8.8.8')).toBe(false);
    expect(isBlockedAddress('example.com')).toBe(true);
  });
});

describe('link URL checks (no network)', () => {
  it.each([
    [123, 'invalid_url'], ['', 'invalid_url'], ['not a url', 'invalid_url'], [`https://a.com/${'x'.repeat(2100)}`, 'invalid_url'],
    ['http://example.com/a.jpg', 'not_https'], ['ftp://example.com/a.jpg', 'not_https'], ['file:///etc/passwd', 'not_https'],
    ['javascript:alert(1)', 'not_https'], ['data:image/png;base64,AAAA', 'not_https'],
    ['https://user:pw@example.com/a.jpg', 'credentials'], ['https://user@example.com/a.jpg', 'credentials'],
    ['https://example.com:8443/a.jpg', 'port'], ['https://example.com:22/a.jpg', 'port'],
    ['https://localhost/a.jpg', 'host'], ['https://localhost./a.jpg', 'host'], ['https://printer.local/a.jpg', 'host'],
    ['https://metadata.google.internal/x', 'host'], ['https://intranet/a.jpg', 'host'], ['https://api.localhost/a', 'host'],
    ['https://127.0.0.1/a.jpg', 'private_address'], ['https://169.254.169.254/latest/meta-data/', 'private_address'],
    ['https://[::1]/a.jpg', 'private_address'], ['https://[::ffff:10.0.0.1]/a.jpg', 'private_address'],
    ['https://2130706433/a.jpg', 'private_address'], ['https://0x7f.1/a.jpg', 'private_address'], ['https://10.1/a.jpg', 'private_address'],
  ] as const)('refuses %j (%s)', (raw, code) => {
    const r = checkLinkUrl(raw);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe(code);
  });
  it('accepts a plain https link, explicit :443 included', () => {
    expect(checkLinkUrl('https://images.example.com/a/b.jpg?x=1').ok).toBe(true);
    expect(checkLinkUrl('https://images.example.com:443/b.png').ok).toBe(true);
  });
});

describe('fetchImageLink', () => {
  const ok = { status: 200, headers: { 'content-type': 'image/png' }, body: [PNG] };

  it('fetches a public image, pinned to the vetted address', async () => {
    const seen: Array<{ url: string; pinned: string }> = [];
    const r = await fetchImageLink('https://img.example.com/a.png', { lookup: dns({ 'img.example.com': ['93.184.216.34'] }), transport: transport({ 'https://img.example.com/a.png': ok }, seen) });
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.buffer.equals(PNG)).toBe(true); expect(r.contentType).toBe('image/png'); }
    expect(seen).toEqual([{ url: 'https://img.example.com/a.png', pinned: '93.184.216.34' }]);
  });

  it('refuses a host that resolves to a private address, before connecting', async () => {
    const seen: Array<{ url: string; pinned: string }> = [];
    const r = await fetchImageLink('https://evil.example.com/a.png', { lookup: dns({ 'evil.example.com': ['10.0.0.5'] }), transport: transport({}, seen) });
    expect(r).toMatchObject({ ok: false, code: 'private_address' });
    expect(seen).toEqual([]);
  });

  it('refuses a DNS answer mixing public and private addresses (rebinding bait)', async () => {
    const r = await fetchImageLink('https://mix.example.com/a.png', { lookup: dns({ 'mix.example.com': ['93.184.216.34', '127.0.0.1'] }), transport: transport({ 'https://mix.example.com/a.png': ok }) });
    expect(r).toMatchObject({ ok: false, code: 'private_address' });
  });

  it('refuses when the connected socket is not public (checked again after connect)', async () => {
    const r = await fetchImageLink('https://img.example.com/a.png', { lookup: dns({ 'img.example.com': ['93.184.216.34'] }), transport: transport({ 'https://img.example.com/a.png': { ...ok, remote: '169.254.169.254' } }) });
    expect(r).toMatchObject({ ok: false, code: 'private_address' });
  });

  it('follows a redirect to another public host, re-checking it', async () => {
    const seen: Array<{ url: string; pinned: string }> = [];
    const r = await fetchImageLink('https://a.example.com/x', {
      lookup: dns({ 'a.example.com': ['93.184.216.34'], 'cdn.example.net': ['151.101.1.1'] }),
      transport: transport({ 'https://a.example.com/x': { status: 302, headers: { location: 'https://cdn.example.net/y.png' } }, 'https://cdn.example.net/y.png': ok }, seen),
    });
    expect(r.ok).toBe(true);
    expect(seen.map((s) => s.pinned)).toEqual(['93.184.216.34', '151.101.1.1']);
  });

  it.each([
    ['a private IP literal', 'https://127.0.0.1/admin', 'private_address'],
    ['the cloud metadata address', 'http://169.254.169.254/latest', 'not_https'],
    ['a host resolving to a private address', 'https://internal.example.com/a.png', 'private_address'],
    ['localhost', 'https://localhost/a.png', 'host'],
  ])('refuses a redirect to %s', async (_label, target, code) => {
    const seen: Array<{ url: string; pinned: string }> = [];
    const r = await fetchImageLink('https://a.example.com/x', {
      lookup: dns({ 'a.example.com': ['93.184.216.34'], 'internal.example.com': ['192.168.0.10'] }),
      transport: transport({ 'https://a.example.com/x': { status: 301, headers: { location: target } } }, seen),
    });
    expect(r).toMatchObject({ ok: false, code });
    expect(seen).toHaveLength(1);
  });

  it('refuses a relative redirect loop past the limit', async () => {
    const steps: Record<string, Step> = {};
    for (let i = 0; i <= LINK_MAX_REDIRECTS + 1; i++) steps[`https://a.example.com/${i}`] = { status: 302, headers: { location: `/${i + 1}` } };
    const r = await fetchImageLink('https://a.example.com/0', { lookup: dns({ 'a.example.com': ['93.184.216.34'] }), transport: transport(steps) });
    expect(r).toMatchObject({ ok: false, code: 'too_many_redirects' });
  });

  it('refuses a redirect without a Location', async () => {
    const r = await fetchImageLink('https://a.example.com/x', { lookup: dns({ 'a.example.com': ['93.184.216.34'] }), transport: transport({ 'https://a.example.com/x': { status: 302 } }) });
    expect(r).toMatchObject({ ok: false, code: 'redirect' });
  });

  it.each([
    ['text/html', 'type'], ['image/svg+xml', 'type'], ['image/gif', 'type'], ['', 'type'], ['application/octet-stream', 'type'],
  ])('refuses Content-Type %j', async (ct, code) => {
    const r = await fetchImageLink('https://img.example.com/a', { lookup: dns({ 'img.example.com': ['93.184.216.34'] }), transport: transport({ 'https://img.example.com/a': { status: 200, headers: { 'content-type': ct }, body: [PNG] } }) });
    expect(r).toMatchObject({ ok: false, code });
  });

  it('accepts image/jpeg; charset and normalises image/jpg', async () => {
    const r = await fetchImageLink('https://img.example.com/a', { lookup: dns({ 'img.example.com': ['93.184.216.34'] }), transport: transport({ 'https://img.example.com/a': { status: 200, headers: { 'content-type': 'image/jpg; charset=binary' }, body: [PNG] } }) });
    expect(r.ok && r.contentType).toBe('image/jpeg');
  });

  it('refuses a non-200 answer', async () => {
    const r = await fetchImageLink('https://img.example.com/a', { lookup: dns({ 'img.example.com': ['93.184.216.34'] }), transport: transport({ 'https://img.example.com/a': { status: 404, headers: { 'content-type': 'image/png' } } }) });
    expect(r).toMatchObject({ ok: false, code: 'http_status' });
  });

  it('refuses a declared Content-Length over the cap', async () => {
    const r = await fetchImageLink('https://img.example.com/a', { maxBytes: 100, lookup: dns({ 'img.example.com': ['93.184.216.34'] }), transport: transport({ 'https://img.example.com/a': { status: 200, headers: { 'content-type': 'image/png', 'content-length': '101' }, body: [PNG] } }) });
    expect(r).toMatchObject({ ok: false, code: 'too_large' });
  });

  it('stops streaming past the cap even when Content-Length lies', async () => {
    const big = [Buffer.alloc(60), Buffer.alloc(60)];
    const r = await fetchImageLink('https://img.example.com/a', { maxBytes: 100, lookup: dns({ 'img.example.com': ['93.184.216.34'] }), transport: transport({ 'https://img.example.com/a': { status: 200, headers: { 'content-type': 'image/png', 'content-length': '10' }, body: big } }) });
    expect(r).toMatchObject({ ok: false, code: 'too_large' });
  });

  it('reports DNS failures and network errors', async () => {
    expect(await fetchImageLink('https://nope.example.com/a', { lookup: dns({}), transport: transport({}) })).toMatchObject({ ok: false, code: 'dns' });
    expect(await fetchImageLink('https://img.example.com/a', { lookup: dns({ 'img.example.com': ['93.184.216.34'] }), transport: transport({}) })).toMatchObject({ ok: false, code: 'network' });
  });

  it('times out a slow server', async () => {
    const slow: TransportFn = (_u, _p, signal) => new Promise((_res, rej) => signal.addEventListener('abort', () => rej(new Error('aborted'))));
    const r = await fetchImageLink('https://img.example.com/a', { timeoutMs: 30, lookup: dns({ 'img.example.com': ['93.184.216.34'] }), transport: slow });
    expect(r).toMatchObject({ ok: false, code: 'timeout' });
  });
});
