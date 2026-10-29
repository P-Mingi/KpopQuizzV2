// Run O1 (ADM back): import of a picture by URL. https only, port 443, no credentials; the host is resolved here, every address it
// resolves to must be public (ssrf.ts), the connection is then pinned to a validated address (so a second DNS answer cannot move it),
// and the same checks run again on each redirect (3 at most). 10 s for the whole import, 8 MB while streaming, identity encoding.
// Nothing from the URL is kept: the caller copies the bytes into the bucket.
import { lookup as dnsLookup } from 'node:dns/promises';
import { request as httpsRequest } from 'node:https';
import { isIP } from 'node:net';

import { IMPORT_MAX_REDIRECTS, IMPORT_TIMEOUT_MS, MAX_SOURCE_BYTES } from './constants';
import { ImageError } from './errors';
import { isPublicAddress } from './ssrf';

export interface RemoteResponse {
  readonly status: number;
  readonly location: string | null;
  readonly contentLength: number | null;
  readonly stream: AsyncIterable<Uint8Array>;
  destroy(): void;
}

export interface ResolvedAddress { readonly address: string; readonly family: 4 | 6 }

export interface RemoteDeps {
  /** All addresses of a host name. */
  readonly lookup: (hostname: string) => Promise<ResolvedAddress[]>;
  /** One GET of `url`, connected to `to`. */
  readonly request: (url: URL, to: ResolvedAddress) => Promise<RemoteResponse>;
}

const BLOCKED_NAMES = /(^|\.)(localhost|local|localdomain|internal|intranet|lan|home|corp)$/;

/** The URL, parsed and checked before any network call; throws an ImageError otherwise. */
export function checkRemoteUrl(raw: string): URL {
  let u: URL;
  try { u = new URL(raw.trim()); } catch { throw new ImageError('bad_url', 400, 'That is not a valid web address.'); }
  if (u.protocol !== 'https:') throw new ImageError('bad_url', 400, 'Only https:// addresses can be imported.');
  if (u.username || u.password) throw new ImageError('bad_url', 400, 'Addresses with a user name or password are not accepted.');
  if (u.port && u.port !== '443') throw new ImageError('bad_url', 400, 'Only the standard https port is accepted.');
  const host = u.hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (!host) throw new ImageError('bad_url', 400, 'That is not a valid web address.');
  if (isIP(host)) {
    if (!isPublicAddress(host)) throw new ImageError('blocked_address', 400, 'That address points to a private or reserved network.');
  } else if (BLOCKED_NAMES.test(host.toLowerCase())) {
    throw new ImageError('blocked_address', 400, 'That address points to a private or reserved network.');
  }
  return u;
}

/** Every address of the host, all of which must be public; the first is returned for the connection. */
export async function resolvePublic(u: URL, lookup: RemoteDeps['lookup']): Promise<ResolvedAddress> {
  const host = u.hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '');
  const literal = isIP(host);
  if (literal) return { address: host, family: literal === 6 ? 6 : 4 };
  let list: ResolvedAddress[];
  try { list = await lookup(host); } catch { throw new ImageError('dns_failed', 502, 'That host could not be found.'); }
  if (list.length === 0) throw new ImageError('dns_failed', 502, 'That host could not be found.');
  if (list.some((a) => !isPublicAddress(a.address))) throw new ImageError('blocked_address', 400, 'That address points to a private or reserved network.');
  return list[0]!;
}

const realDeps: RemoteDeps = {
  async lookup(hostname) {
    const all = await dnsLookup(hostname, { all: true, verbatim: true });
    return all.map((a) => ({ address: a.address, family: a.family === 6 ? 6 : 4 }));
  },
  request(url, to) {
    return new Promise<RemoteResponse>((resolve, reject) => {
      const host = url.hostname.replace(/^\[|\]$/g, '');
      const req = httpsRequest({
        protocol: 'https:', host, port: 443, path: `${url.pathname}${url.search}`, method: 'GET',
        headers: { accept: 'image/*', 'accept-encoding': 'identity', 'user-agent': 'OtakuQuizImageImport/1.0 (+https://bunnyverse.org/anime)' },
        ...(isIP(host) ? {} : { servername: host }),
        // Pin the connection to the address that was checked: the system resolver is never asked again.
        lookup: ((_h: string, opts: { all?: boolean }, cb: (...a: unknown[]) => void) => (opts?.all ? cb(null, [{ address: to.address, family: to.family }]) : cb(null, to.address, to.family))) as never,
        timeout: IMPORT_TIMEOUT_MS,
      }, (res) => {
        const cl = Number(res.headers['content-length']);
        resolve({
          status: res.statusCode ?? 0,
          location: typeof res.headers.location === 'string' ? res.headers.location : null,
          contentLength: Number.isFinite(cl) && res.headers['content-length'] !== undefined ? cl : null,
          stream: res,
          destroy: () => { res.destroy(); req.destroy(); },
        });
      });
      req.on('timeout', () => req.destroy(new Error('timeout')));
      req.on('error', reject);
      req.end();
    });
  },
};

async function readCapped(stream: AsyncIterable<Uint8Array>, max: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of stream) {
    total += chunk.byteLength;
    if (total > max) throw new ImageError('too_large', 413, 'The picture is larger than 8 MB.');
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks, total);
}

/** The bytes at `rawUrl`, after the checks above. `deps` is for tests. */
export async function fetchRemoteImage(rawUrl: string, deps: RemoteDeps = realDeps, timeoutMs: number = IMPORT_TIMEOUT_MS): Promise<Buffer> {
  let active: RemoteResponse | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;
  const expired = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      timedOut = true;
      active?.destroy();
      reject(new ImageError('timeout', 504, 'The host took longer than 10 seconds.'));
    }, timeoutMs);
  });
  const work = async (): Promise<Buffer> => {
    let current = checkRemoteUrl(rawUrl);
    for (let hops = 0; ; hops++) {
      // The timer has fired: do not start another lookup or request (the race above has already answered).
      if (timedOut) throw new ImageError('timeout', 504, 'The host took longer than 10 seconds.');
      const to = await resolvePublic(current, deps.lookup);
      let res: RemoteResponse;
      try { res = await deps.request(current, to); } catch { throw new ImageError('fetch_failed', 502, 'The host could not be reached.'); }
      active = res;
      if (res.status >= 300 && res.status < 400 && res.location) {
        res.destroy();
        if (hops >= IMPORT_MAX_REDIRECTS) throw new ImageError('too_many_redirects', 400, 'The address redirects too many times.');
        let next: string;
        try { next = new URL(res.location, current).toString(); } catch { throw new ImageError('bad_url', 400, 'The host redirects to an invalid address.'); }
        current = checkRemoteUrl(next);
        continue;
      }
      if (res.status !== 200) { res.destroy(); throw new ImageError('fetch_failed', 502, `The host answered ${res.status}.`); }
      if (res.contentLength !== null && res.contentLength > MAX_SOURCE_BYTES) { res.destroy(); throw new ImageError('too_large', 413, 'The picture is larger than 8 MB.'); }
      try {
        return await readCapped(res.stream, MAX_SOURCE_BYTES);
      } catch (e) {
        res.destroy();
        if (e instanceof ImageError) throw e;
        throw new ImageError('fetch_failed', 502, 'The download was interrupted.');
      }
    }
  };
  try {
    return await Promise.race([work(), expired]);
  } finally {
    clearTimeout(timer);
    (active as RemoteResponse | null)?.destroy();
  }
}
