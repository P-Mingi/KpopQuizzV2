import { describe, expect, it, vi } from 'vitest';

import { ImageError } from './errors';
import { checkRemoteUrl, fetchRemoteImage } from './fetch-remote';

import type { RemoteDeps, RemoteResponse, ResolvedAddress } from './fetch-remote';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);

async function* chunks(...parts: Uint8Array[]): AsyncGenerator<Uint8Array> {
  for (const p of parts) yield p;
}

function res(status: number, over: Partial<RemoteResponse> & { body?: Uint8Array[] } = {}): RemoteResponse {
  return { status, location: null, contentLength: null, stream: chunks(...(over.body ?? [])), destroy: vi.fn(), ...over };
}

/** DNS table and a script of responses by URL. */
function world(dns: Record<string, string[]>, answers: Record<string, () => RemoteResponse>): { deps: RemoteDeps; looked: string[]; requested: Array<{ url: string; to: ResolvedAddress }> } {
  const looked: string[] = [];
  const requested: Array<{ url: string; to: ResolvedAddress }> = [];
  return {
    looked, requested,
    deps: {
      async lookup(host) {
        looked.push(host);
        const list = dns[host];
        if (!list) throw new Error('ENOTFOUND');
        return list.map((address) => ({ address, family: address.includes(':') ? 6 : 4 }) as ResolvedAddress);
      },
      async request(url, to) {
        requested.push({ url: url.toString(), to });
        const make = answers[url.toString()];
        if (!make) throw new Error('no route');
        return make();
      },
    },
  };
}

async function codeOf(p: Promise<unknown>): Promise<string> {
  try { await p; } catch (e) { return e instanceof ImageError ? e.code : `other:${String(e)}`; }
  return 'none';
}

const redirect = (to: string): RemoteResponse => res(302, { location: to });

describe('checkRemoteUrl: refused before any network call', () => {
  it.each([
    ['http://example.com/a.jpg', 'bad_url'],
    ['ftp://example.com/a.jpg', 'bad_url'],
    ['file:///etc/passwd', 'bad_url'],
    ['javascript:alert(1)', 'bad_url'],
    ['data:image/png;base64,AAAA', 'bad_url'],
    ['//example.com/a.jpg', 'bad_url'],
    ['not a url', 'bad_url'],
    ['', 'bad_url'],
    ['https://user:pass@example.com/a.jpg', 'bad_url'],
    ['https://example.com:8443/a.jpg', 'bad_url'],
    ['https://example.com:22/a.jpg', 'bad_url'],
    ['https://localhost/a.jpg', 'blocked_address'],
    ['https://LOCALHOST./a.jpg', 'blocked_address'],
    ['https://app.localhost/a.jpg', 'blocked_address'],
    ['https://printer.local/a.jpg', 'blocked_address'],
    ['https://db.internal/a.jpg', 'blocked_address'],
    ['https://127.0.0.1/a.jpg', 'blocked_address'],
    ['https://127.1/a.jpg', 'blocked_address'],
    ['https://2130706433/a.jpg', 'blocked_address'],
    ['https://0x7f.0.0.1/a.jpg', 'blocked_address'],
    ['https://0177.0.0.1/a.jpg', 'blocked_address'],
    ['https://10.0.0.5/a.jpg', 'blocked_address'],
    ['https://192.168.1.1/a.jpg', 'blocked_address'],
    ['https://172.16.0.1/a.jpg', 'blocked_address'],
    ['https://169.254.169.254/latest/meta-data/', 'blocked_address'],
    ['https://100.64.0.1/a.jpg', 'blocked_address'],
    ['https://0.0.0.0/a.jpg', 'blocked_address'],
    ['https://224.0.0.1/a.jpg', 'blocked_address'],
    ['https://240.0.0.1/a.jpg', 'blocked_address'],
    ['https://[::1]/a.jpg', 'blocked_address'],
    ['https://[::]/a.jpg', 'blocked_address'],
    ['https://[fe80::1]/a.jpg', 'blocked_address'],
    ['https://[fc00::1]/a.jpg', 'blocked_address'],
    ['https://[fd00::1]/a.jpg', 'blocked_address'],
    ['https://[ff02::1]/a.jpg', 'blocked_address'],
    ['https://[::ffff:127.0.0.1]/a.jpg', 'blocked_address'],
    ['https://[::ffff:10.0.0.1]/a.jpg', 'blocked_address'],
    ['https://[::ffff:169.254.169.254]/a.jpg', 'blocked_address'],
    ['https://[64:ff9b::7f00:1]/a.jpg', 'blocked_address'],
    ['https://[2001:db8::1]/a.jpg', 'blocked_address'],
    ['https://[2002:7f00:1::1]/a.jpg', 'blocked_address'],
  ])('%s -> %s', (url, code) => {
    try { checkRemoteUrl(url); throw new Error('accepted'); } catch (e) { expect(e).toBeInstanceOf(ImageError); expect((e as ImageError).code).toBe(code); }
  });

  it('accepts a plain https address, a public IP literal and the default port', () => {
    expect(checkRemoteUrl('https://images.unsplash.com/photo-1?w=900').hostname).toBe('images.unsplash.com');
    expect(checkRemoteUrl('https://8.8.8.8/a.jpg').hostname).toBe('8.8.8.8');
    expect(checkRemoteUrl('https://[2606:4700:4700::1111]/a.jpg').hostname).toBe('[2606:4700:4700::1111]');
    expect(checkRemoteUrl('https://example.com:443/a.jpg').hostname).toBe('example.com');
  });
});

describe('fetchRemoteImage: DNS', () => {
  it('refuses a name that resolves to a private address, and makes no request', async () => {
    for (const ip of ['127.0.0.1', '10.1.2.3', '192.168.0.9', '169.254.169.254', '::1', 'fe80::1', 'fd00::5', '::ffff:10.0.0.1']) {
      const w = world({ 'evil.example': [ip] }, {});
      expect(await codeOf(fetchRemoteImage('https://evil.example/a.png', w.deps))).toBe('blocked_address');
      expect(w.requested).toHaveLength(0);
    }
  });

  it('refuses a name when ANY of its addresses is private (a public and a private one)', async () => {
    const w = world({ 'mixed.example': ['93.184.216.34', '10.0.0.1'] }, {});
    expect(await codeOf(fetchRemoteImage('https://mixed.example/a.png', w.deps))).toBe('blocked_address');
    expect(w.requested).toHaveLength(0);
  });

  it('a host that does not resolve is dns_failed', async () => {
    expect(await codeOf(fetchRemoteImage('https://nowhere.example/a.png', world({}, {}).deps))).toBe('dns_failed');
  });

  it('connects to the address it checked, not to a second lookup', async () => {
    const w = world({ 'ok.example': ['93.184.216.34'] }, { 'https://ok.example/a.png': () => res(200, { body: [PNG] }) });
    await fetchRemoteImage('https://ok.example/a.png', w.deps);
    expect(w.requested).toEqual([{ url: 'https://ok.example/a.png', to: { address: '93.184.216.34', family: 4 } }]);
    expect(w.looked).toEqual(['ok.example']);
  });
});

describe('fetchRemoteImage: redirects', () => {
  const dns = { 'a.example': ['93.184.216.34'], 'b.example': ['93.184.216.35'], 'internal.example': ['10.0.0.8'], 'meta.example': ['169.254.169.254'] };

  it('follows a redirect to another public host and checks it again', async () => {
    const w = world(dns, { 'https://a.example/x': () => redirect('https://b.example/y.png'), 'https://b.example/y.png': () => res(200, { body: [PNG] }) });
    expect((await fetchRemoteImage('https://a.example/x', w.deps)).equals(PNG)).toBe(true);
    expect(w.looked).toEqual(['a.example', 'b.example']);
  });

  it('refuses a redirect to a host that resolves to a private address', async () => {
    const w = world(dns, { 'https://a.example/x': () => redirect('https://internal.example/secret') });
    expect(await codeOf(fetchRemoteImage('https://a.example/x', w.deps))).toBe('blocked_address');
    expect(w.requested.map((r) => r.url)).toEqual(['https://a.example/x']);
  });

  it('refuses a redirect to a private IP literal, to localhost, to the metadata address and to an IPv6 loopback', async () => {
    for (const to of ['https://127.0.0.1/a.png', 'https://localhost/a.png', 'https://169.254.169.254/latest/meta-data', 'https://[::1]/a.png', 'https://10.0.0.1/a.png']) {
      const w = world(dns, { 'https://a.example/x': () => redirect(to) });
      expect(await codeOf(fetchRemoteImage('https://a.example/x', w.deps))).toBe('blocked_address');
      expect(w.requested).toHaveLength(1);
    }
  });

  it('refuses a redirect to http, to file, and a redirect with an unusable Location', async () => {
    for (const to of ['http://b.example/a.png', 'file:///etc/passwd', 'ftp://b.example/a.png']) {
      const w = world(dns, { 'https://a.example/x': () => redirect(to) });
      expect(await codeOf(fetchRemoteImage('https://a.example/x', w.deps))).toBe('bad_url');
    }
  });

  it('a relative Location is resolved against the current URL and checked', async () => {
    const w = world(dns, { 'https://a.example/dir/x': () => redirect('../img/y.png'), 'https://a.example/img/y.png': () => res(200, { body: [PNG] }) });
    expect((await fetchRemoteImage('https://a.example/dir/x', w.deps)).length).toBe(PNG.length);
  });

  it('allows three redirects and refuses the fourth', async () => {
    const hop = (n: number, last: () => RemoteResponse): Record<string, () => RemoteResponse> => {
      const a: Record<string, () => RemoteResponse> = {};
      for (let i = 0; i < n; i++) a[`https://a.example/${i}`] = () => redirect(`https://a.example/${i + 1}`);
      a[`https://a.example/${n}`] = last;
      return a;
    };
    const three = world(dns, hop(3, () => res(200, { body: [PNG] })));
    expect((await fetchRemoteImage('https://a.example/0', three.deps)).length).toBe(PNG.length);
    const four = world(dns, hop(4, () => res(200, { body: [PNG] })));
    expect(await codeOf(fetchRemoteImage('https://a.example/0', four.deps))).toBe('too_many_redirects');
    expect(four.requested).toHaveLength(4);
  });

  it('a redirect loop ends as too_many_redirects', async () => {
    const w = world(dns, { 'https://a.example/x': () => redirect('https://a.example/x') });
    expect(await codeOf(fetchRemoteImage('https://a.example/x', w.deps))).toBe('too_many_redirects');
  });
});

describe('fetchRemoteImage: the body', () => {
  const dns = { 'a.example': ['93.184.216.34'] };
  const url = 'https://a.example/p.png';

  it('stops streaming past 8 MB and destroys the connection', async () => {
    const destroy = vi.fn();
    async function* endless(): AsyncGenerator<Uint8Array> { for (let i = 0; i < 100; i++) yield new Uint8Array(1024 * 1024); }
    const w = world(dns, { [url]: () => res(200, { stream: endless(), destroy }) });
    expect(await codeOf(fetchRemoteImage(url, w.deps))).toBe('too_large');
    expect(destroy).toHaveBeenCalled();
  });

  it('accepts exactly 8 MB', async () => {
    const w = world(dns, { [url]: () => res(200, { body: [new Uint8Array(8 * 1024 * 1024)] }) });
    expect((await fetchRemoteImage(url, w.deps)).length).toBe(8 * 1024 * 1024);
  });

  it('refuses at once when Content-Length says more than 8 MB', async () => {
    const read = vi.fn();
    async function* spy(): AsyncGenerator<Uint8Array> { read(); yield PNG; }
    const w = world(dns, { [url]: () => res(200, { contentLength: 8 * 1024 * 1024 + 1, stream: spy() }) });
    expect(await codeOf(fetchRemoteImage(url, w.deps))).toBe('too_large');
    expect(read).not.toHaveBeenCalled();
  });

  it('a Content-Length that lies low does not help: the stream is counted', async () => {
    async function* big(): AsyncGenerator<Uint8Array> { yield new Uint8Array(5 * 1024 * 1024); yield new Uint8Array(5 * 1024 * 1024); }
    const w = world(dns, { [url]: () => res(200, { contentLength: 100, stream: big() }) });
    expect(await codeOf(fetchRemoteImage(url, w.deps))).toBe('too_large');
  });

  it('a non-200 answer is fetch_failed', async () => {
    for (const status of [204, 401, 403, 404, 500, 503]) {
      const w = world(dns, { [url]: () => res(status) });
      expect(await codeOf(fetchRemoteImage(url, w.deps))).toBe('fetch_failed');
    }
  });

  it('a connection error is fetch_failed and a broken stream is fetch_failed', async () => {
    expect(await codeOf(fetchRemoteImage(url, world(dns, {}).deps))).toBe('fetch_failed');
    async function* broken(): AsyncGenerator<Uint8Array> { yield PNG; throw new Error('reset'); }
    expect(await codeOf(fetchRemoteImage(url, world(dns, { [url]: () => res(200, { stream: broken() }) }).deps))).toBe('fetch_failed');
  });

  it('times out when the host is slow, and destroys the connection', async () => {
    const destroy = vi.fn();
    async function* slow(): AsyncGenerator<Uint8Array> { await new Promise((r) => setTimeout(r, 400)); yield PNG; }
    const w = world(dns, { [url]: () => res(200, { stream: slow(), destroy }) });
    expect(await codeOf(fetchRemoteImage(url, w.deps, 50))).toBe('timeout');
    expect(destroy).toHaveBeenCalled();
  });

  it('the timeout covers the whole import, redirects included', async () => {
    const d = { 'a.example': ['93.184.216.34'] };
    const deps: RemoteDeps = {
      lookup: async (h) => (d[h as 'a.example'] ?? []).map((address) => ({ address, family: 4 as const })),
      request: async () => { await new Promise((r) => setTimeout(r, 60)); return redirect('https://a.example/next'); },
    };
    expect(await codeOf(fetchRemoteImage('https://a.example/0', deps, 150))).toBe('timeout');
  });
});
