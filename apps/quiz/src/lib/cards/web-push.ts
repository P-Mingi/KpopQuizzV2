// Bunnyverse Cards, lot 4: payload-less Web Push (RFC 8030) with VAPID (RFC 8292), with node:crypto only (no npm dependency). The request
// carries no body, so there is no message encryption: the service worker (public/brand/hub/sw.js) shows one fixed notification. Server only.
import { createPrivateKey, sign } from 'node:crypto';

export interface VapidKeys {
  /** The uncompressed P-256 public key, base64url (65 bytes: 0x04, x, y). */
  readonly publicKey: string;
  /** The private scalar, base64url (32 bytes). */
  readonly privateKey: string;
  /** A mailto: or https: address of the sender. */
  readonly subject: string;
}

const b64u = (b: Buffer | string): string => Buffer.from(b).toString('base64url');

/** The VAPID keys from the environment, or null when one is missing or malformed (the cron then sends nothing). */
export function vapidFromEnv(env: Record<string, string | undefined> = process.env): VapidKeys | null {
  const publicKey = env.CARDS_VAPID_PUBLIC_KEY?.trim();
  const privateKey = env.CARDS_VAPID_PRIVATE_KEY?.trim();
  const subject = env.CARDS_VAPID_SUBJECT?.trim();
  if (!publicKey || !privateKey || !subject) return null;
  if (!/^(mailto:[^\s@]+@[^\s@]+|https:\/\/[^\s]+)$/.test(subject)) return null;
  if (Buffer.from(publicKey, 'base64url').length !== 65 || Buffer.from(privateKey, 'base64url').length !== 32) return null;
  return { publicKey, privateKey, subject };
}

/** The push services the server agrees to call (the endpoint comes from the browser, so it is checked: no private address, no other host). */
const PUSH_HOSTS: readonly string[] = ['fcm.googleapis.com', 'push.services.mozilla.com', 'push.apple.com', 'notify.windows.com', 'push.microsoft.com'];

/** True for an https endpoint of a known push service (the host or a subdomain of it), on the default port, with no credentials. */
export function pushEndpointOk(endpoint: string): boolean {
  if (endpoint.length > 2048) return false;
  let u: URL;
  try {
    u = new URL(endpoint);
  } catch {
    return false;
  }
  if (u.protocol !== 'https:' || u.username || u.password || u.port) return false;
  const host = u.hostname.toLowerCase();
  return PUSH_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
}

/** The origin of a push endpoint: the JWT audience (RFC 8292 section 2). */
export function audienceOf(endpoint: string): string {
  return new URL(endpoint).origin;
}

/** The VAPID JWT: ES256 over base64url(header).base64url(claims), the signature in the fixed 64 byte form (r then s). exp is at most 24 h away. */
export function vapidJwt(keys: VapidKeys, audience: string, nowMs: number = Date.now(), ttlS = 12 * 3600): string {
  const header = b64u(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const claims = b64u(JSON.stringify({ aud: audience, exp: Math.floor(nowMs / 1000) + Math.min(ttlS, 24 * 3600 - 60), sub: keys.subject }));
  const pub = Buffer.from(keys.publicKey, 'base64url');
  const key = createPrivateKey({
    format: 'jwk',
    key: { kty: 'EC', crv: 'P-256', d: keys.privateKey, x: b64u(pub.subarray(1, 33)), y: b64u(pub.subarray(33, 65)) },
  });
  const input = `${header}.${claims}`;
  const sig = sign('sha256', Buffer.from(input), { key, dsaEncoding: 'ieee-p1363' });
  return `${input}.${b64u(sig)}`;
}

/** How long the push service keeps the message for an offline browser: one hour (a reminder about a full stack gets stale). */
export const PUSH_TTL_S = 3600;

/** The request for one payload-less push: POST, no body, Authorization: vapid t=<jwt>, k=<public key>, TTL, Urgency normal. */
export function pushRequest(keys: VapidKeys, endpoint: string, nowMs: number = Date.now()): { url: string; init: RequestInit } {
  return {
    url: endpoint,
    init: {
      method: 'POST',
      headers: {
        Authorization: `vapid t=${vapidJwt(keys, audienceOf(endpoint), nowMs)}, k=${keys.publicKey}`,
        TTL: String(PUSH_TTL_S),
        Urgency: 'normal',
      },
    },
  };
}

export type PushOutcome = 'sent' | 'gone' | 'retry';

/** 201 (or any 2xx): sent. 404 and 410: the subscription is gone for good. Anything else (429, 5xx, a network error): a failure to count. */
export function outcomeOf(status: number): PushOutcome {
  if (status >= 200 && status < 300) return 'sent';
  if (status === 404 || status === 410) return 'gone';
  return 'retry';
}

/** Sends one push with a time limit; never throws. */
export async function sendPush(
  keys: VapidKeys,
  endpoint: string,
  fetcher: typeof fetch = fetch,
  timeoutMs = 5000,
  nowMs: number = Date.now(),
): Promise<PushOutcome> {
  try {
    const { url, init } = pushRequest(keys, endpoint, nowMs);
    const res = await fetcher(url, { ...init, signal: AbortSignal.timeout(timeoutMs), redirect: 'error' });
    return outcomeOf(res.status);
  } catch {
    return 'retry';
  }
}
