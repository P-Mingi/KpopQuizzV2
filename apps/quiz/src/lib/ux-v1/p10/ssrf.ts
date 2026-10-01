// SSRF-safe image fetch for the passport header "paste a link" route (DESIGN-SPEC
// 17.8: the server fetches the link, checks type and size, copies it to our
// storage; never hot-linked). Server only (node:https, node:dns).
//
// Rules, each one unit-tested in ssrf.test.ts:
//   - https only, default port only (443), no user:password@, no bare / internal
//     host names (localhost, *.local, *.internal, single-label names);
//   - every address the host resolves to must be public unicast; one private,
//     loopback, link-local, CGNAT, multicast, reserved or documentation address
//     rejects the whole host (a DNS answer mixing public and private is an attack);
//   - the TCP connection is PINNED to the vetted address (custom lookup), so a
//     second DNS answer cannot swap in a private address (DNS rebinding), and the
//     socket's remote address is checked again after connect;
//   - redirects are followed by hand, at most 3, and every hop goes through the
//     same checks (a redirect to a private address is refused);
//   - 4 s to connect, 10 s overall, 5 MB cap while streaming (Content-Length is
//     not trusted), Content-Type must be image/jpeg, image/png or image/webp.
// The caller still sniffs the bytes and re-encodes them (header-image.ts).

import https from 'node:https';
import net from 'node:net';
import { lookup as dnsLookup } from 'node:dns/promises';

import type { IncomingHttpHeaders } from 'node:http';

export const LINK_MAX_BYTES = 5 * 1024 * 1024;
export const LINK_TIMEOUT_MS = 10_000;
export const LINK_CONNECT_TIMEOUT_MS = 4_000;
export const LINK_MAX_REDIRECTS = 3;
export const LINK_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export type LinkError =
  | 'invalid_url' | 'not_https' | 'credentials' | 'port' | 'host'
  | 'dns' | 'private_address' | 'redirect' | 'too_many_redirects'
  | 'http_status' | 'type' | 'too_large' | 'timeout' | 'network';

export interface LinkFail { ok: false; code: LinkError; error: string }

const MESSAGES: Record<LinkError, string> = {
  invalid_url: 'That is not a valid link.',
  not_https: 'Paste a link that starts with https://',
  credentials: 'Links with a user name or password are not allowed.',
  port: 'Links on a custom port are not allowed.',
  host: 'That link does not point to a public website.',
  dns: 'We could not find that website.',
  private_address: 'That link does not point to a public website.',
  redirect: 'That link redirects somewhere we cannot fetch.',
  too_many_redirects: 'That link redirects too many times.',
  http_status: 'That link did not return an image.',
  type: 'That link is not a JPG, PNG or WebP image.',
  too_large: 'That image is over 5 MB.',
  timeout: 'That website took too long to answer.',
  network: 'We could not download that image.',
};

export function fail(code: LinkError): LinkFail {
  return { ok: false, code, error: MESSAGES[code] };
}

// ---- addresses ----------------------------------------------------------------

function v4Parts(ip: string): number[] | null {
  const p = ip.split('.');
  if (p.length !== 4) return null;
  const n = p.map((x) => (/^\d{1,3}$/.test(x) ? Number(x) : NaN));
  return n.every((x) => Number.isInteger(x) && x >= 0 && x <= 255) ? n : null;
}

/** IPv4 that is not public unicast (RFC 6890 special-purpose ranges). */
export function isBlockedIPv4(ip: string): boolean {
  const p = v4Parts(ip);
  if (!p) return true; // malformed: unsafe
  const [a, b, c] = p as [number, number, number, number];
  return a === 0                                  // 0.0.0.0/8 this network
    || a === 10                                   // 10/8 private
    || (a === 100 && b >= 64 && b <= 127)         // 100.64/10 CGNAT
    || a === 127                                  // loopback
    || (a === 169 && b === 254)                   // link-local (cloud metadata)
    || (a === 172 && b >= 16 && b <= 31)          // 172.16/12 private
    || (a === 192 && b === 0 && c === 0)          // 192.0.0/24 IETF
    || (a === 192 && b === 0 && c === 2)          // TEST-NET-1
    || (a === 192 && b === 88 && c === 99)        // 6to4 relay anycast
    || (a === 192 && b === 168)                   // 192.168/16 private
    || (a === 198 && (b === 18 || b === 19))      // 198.18/15 benchmarking
    || (a === 198 && b === 51 && c === 100)       // TEST-NET-2
    || (a === 203 && b === 0 && c === 113)        // TEST-NET-3
    || a >= 224;                                  // multicast, reserved, broadcast
}

/** Expand an IPv6 address to 8 hextets (handles ::, an embedded dotted IPv4 tail
 *  and a %zone). Null when malformed. */
export function expandIPv6(ip: string): number[] | null {
  let s = ip.toLowerCase().replace(/^\[|\]$/g, '');
  const z = s.indexOf('%');
  if (z >= 0) s = s.slice(0, z);
  if (!net.isIPv6(s)) return null;
  let tail: number[] = [];
  const lastColon = s.lastIndexOf(':');
  const last = s.slice(lastColon + 1);
  if (last.includes('.')) {
    const v4 = v4Parts(last);
    if (!v4) return null;
    tail = [(v4[0]! << 8) | v4[1]!, (v4[2]! << 8) | v4[3]!];
    s = s.slice(0, lastColon + 1) + '0:0';
  }
  const [head, rest] = s.split('::') as [string, string | undefined];
  const h = head ? head.split(':').filter((x) => x !== '') : [];
  const r = rest !== undefined && rest !== '' ? rest.split(':').filter((x) => x !== '') : [];
  const fill = s.includes('::') ? 8 - h.length - r.length : 0;
  const all = [...h, ...Array(Math.max(0, fill)).fill('0'), ...r].map((x) => parseInt(x, 16));
  if (all.length !== 8 || all.some((x) => Number.isNaN(x) || x < 0 || x > 0xffff)) return null;
  if (tail.length) { all[6] = tail[0]!; all[7] = tail[1]!; }
  return all;
}

function embeddedV4(w: number[]): string {
  return `${w[6]! >> 8}.${w[6]! & 255}.${w[7]! >> 8}.${w[7]! & 255}`;
}

/** IPv6 that is not public unicast. Only 2000::/3 can be public, minus the
 *  documentation, Teredo, 6to4 and ORCHID ranges; mapped / compatible / NAT64
 *  addresses are judged by the IPv4 they carry. */
export function isBlockedIPv6(ip: string): boolean {
  const w = expandIPv6(ip);
  if (!w) return true;
  const zeroHead = w.slice(0, 5).every((x) => x === 0);
  if (zeroHead && w[5] === 0xffff) return isBlockedIPv4(embeddedV4(w));          // ::ffff:a.b.c.d mapped
  if (zeroHead && w[5] === 0) return true;                                         // ::, ::1 and deprecated ::a.b.c.d compatible
  if (w[0] === 0x64 && w[1] === 0xff9b) return true;                               // NAT64 64:ff9b::/96 and /48
  if ((w[0]! & 0xe000) !== 0x2000) return true;                                    // outside 2000::/3: ::, ::1, fc00::/7, fe80::/10, ff00::/8...
  if (w[0] === 0x2001 && w[1] === 0x0db8) return true;                             // documentation
  if (w[0] === 0x2001 && w[1] === 0x0000) return true;                             // Teredo 2001::/32
  if (w[0] === 0x2001 && (w[1]! & 0xfff0) === 0x0010) return true;                 // ORCHID 2001:10::/28
  if (w[0] === 0x2002) return true;                                                // 6to4 (embeds any IPv4)
  if (w[0] === 0x3fff && (w[1]! & 0xf000) === 0) return true;                      // 3fff::/20 documentation
  return false;
}

export function isBlockedAddress(ip: string): boolean {
  const s = ip.replace(/^\[|\]$/g, '');
  if (net.isIPv4(s)) return isBlockedIPv4(s);
  if (net.isIPv6(s.split('%')[0] ?? '')) return isBlockedIPv6(s);
  return true;
}

// ---- URL ------------------------------------------------------------------------

/** Static checks on a pasted link (no network). */
export function checkLinkUrl(raw: unknown): { ok: true; url: URL } | LinkFail {
  if (typeof raw !== 'string') return fail('invalid_url');
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 2048) return fail('invalid_url');
  let url: URL;
  try { url = new URL(trimmed); } catch { return fail('invalid_url'); }
  if (url.protocol !== 'https:') return fail('not_https');
  if (url.username || url.password) return fail('credentials');
  if (url.port && url.port !== '443') return fail('port');
  const host = url.hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '').toLowerCase();
  if (!host) return fail('host');
  if (net.isIP(host)) return isBlockedAddress(host) ? fail('private_address') : { ok: true, url };
  if (!host.includes('.')) return fail('host'); // single-label names resolve on the local network
  if (host === 'localhost' || /\.(localhost|local|internal|intranet|lan|home|corp|localdomain)$/.test(host)) return fail('host');
  return { ok: true, url };
}

// ---- fetch ------------------------------------------------------------------------

export interface Resolved { address: string; family: 4 | 6 }
export type LookupFn = (host: string) => Promise<Resolved[]>;

export interface TransportResponse {
  status: number;
  headers: IncomingHttpHeaders;
  /** Address of the connected socket (checked again). */
  remoteAddress: string | undefined;
  body: AsyncIterable<Buffer>;
  destroy: () => void;
}
export type TransportFn = (url: URL, pinned: Resolved, signal: AbortSignal) => Promise<TransportResponse>;

export const defaultLookup: LookupFn = async (host) => {
  const all = await dnsLookup(host, { all: true, verbatim: true });
  return all.map((r) => ({ address: r.address, family: r.family === 6 ? 6 : 4 }));
};

/** https.request pinned to the vetted address: the custom lookup answers with
 *  that address only; TLS still verifies the certificate for url.hostname. */
export const defaultTransport: TransportFn = (url, pinned, signal) => new Promise((resolve, reject) => {
  const pinnedLookup = (_h: string, opts: { all?: boolean } | number | undefined, cb: (...a: unknown[]) => void): void => {
    const all = typeof opts === 'object' && opts !== null && opts.all;
    if (all) cb(null, [{ address: pinned.address, family: pinned.family }]);
    else cb(null, pinned.address, pinned.family);
  };
  const req = https.request({
    protocol: 'https:',
    hostname: url.hostname.replace(/^\[|\]$/g, ''),
    servername: net.isIP(url.hostname.replace(/^\[|\]$/g, '')) ? undefined : url.hostname,
    port: 443,
    path: `${url.pathname}${url.search}`,
    method: 'GET',
    headers: { 'user-agent': 'KpopQuizBot/1.0 (+https://kpopquiz.org)', accept: 'image/webp,image/png,image/jpeg;q=0.9', 'accept-encoding': 'identity' },
    lookup: pinnedLookup as unknown as typeof import('node:dns').lookup,
    signal,
    agent: false,
  });
  const connectTimer = setTimeout(() => req.destroy(new Error('connect-timeout')), LINK_CONNECT_TIMEOUT_MS);
  req.on('socket', (s) => s.once('connect', () => clearTimeout(connectTimer)).once('secureConnect', () => clearTimeout(connectTimer)));
  req.on('response', (res) => {
    clearTimeout(connectTimer);
    resolve({ status: res.statusCode ?? 0, headers: res.headers, remoteAddress: res.socket?.remoteAddress, body: res, destroy: () => res.destroy() });
  });
  req.on('error', (e) => { clearTimeout(connectTimer); reject(e); });
  req.end();
});

async function vetHost(url: URL, lookup: LookupFn): Promise<Resolved | LinkFail> {
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(host)) return isBlockedAddress(host) ? fail('private_address') : { address: host, family: net.isIPv6(host) ? 6 : 4 };
  let answers: Resolved[];
  try { answers = await lookup(host); } catch { return fail('dns'); }
  if (!answers.length) return fail('dns');
  if (answers.some((a) => isBlockedAddress(a.address))) return fail('private_address');
  return answers[0]!;
}

export interface FetchedImage { ok: true; buffer: Buffer; contentType: string; finalUrl: string }

/** Fetch a pasted image link with every rule of the header above. */
export async function fetchImageLink(
  raw: unknown,
  deps: { lookup?: LookupFn; transport?: TransportFn; maxBytes?: number; timeoutMs?: number } = {},
): Promise<FetchedImage | LinkFail> {
  const lookup = deps.lookup ?? defaultLookup;
  const transport = deps.transport ?? defaultTransport;
  const maxBytes = deps.maxBytes ?? LINK_MAX_BYTES;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), deps.timeoutMs ?? LINK_TIMEOUT_MS);
  try {
    let current: unknown = raw;
    for (let hop = 0; hop <= LINK_MAX_REDIRECTS; hop++) {
      const checked = checkLinkUrl(current);
      if (!checked.ok) return hop > 0 ? { ...checked, code: checked.code === 'invalid_url' ? 'redirect' : checked.code } : checked;
      const url = checked.url;
      const pinned = await vetHost(url, lookup);
      if ('ok' in pinned) return pinned;
      let res: TransportResponse;
      try { res = await transport(url, pinned, ctrl.signal); } catch { return ctrl.signal.aborted ? fail('timeout') : fail('network'); }
      if (res.remoteAddress && isBlockedAddress(res.remoteAddress)) { res.destroy(); return fail('private_address'); }
      if (res.status >= 300 && res.status < 400) {
        res.destroy();
        const loc = res.headers.location;
        if (!loc || Array.isArray(loc)) return fail('redirect');
        try { current = new URL(loc, url).toString(); } catch { return fail('redirect'); }
        continue;
      }
      if (res.status !== 200) { res.destroy(); return fail('http_status'); }
      const type = String(res.headers['content-type'] ?? '').split(';')[0]!.trim().toLowerCase();
      if (!LINK_TYPES.includes(type)) { res.destroy(); return fail('type'); }
      const declared = Number(res.headers['content-length'] ?? 0);
      if (declared > maxBytes) { res.destroy(); return fail('too_large'); }
      const chunks: Buffer[] = [];
      let total = 0;
      try {
        for await (const chunk of res.body) {
          const b = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          total += b.length;
          if (total > maxBytes) { res.destroy(); return fail('too_large'); }
          chunks.push(b);
        }
      } catch { return ctrl.signal.aborted ? fail('timeout') : fail('network'); }
      return { ok: true, buffer: Buffer.concat(chunks), contentType: type === 'image/jpg' ? 'image/jpeg' : type, finalUrl: url.toString() };
    }
    return fail('too_many_redirects');
  } finally {
    clearTimeout(timer);
  }
}
