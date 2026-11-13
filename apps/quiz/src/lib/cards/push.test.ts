// Bunnyverse Cards, lot 4: the web push proofs (JWT, request, quiet hours, once a day, 404/410 stop), the guard, the manifest per site and the
// service worker file. Nothing leaves the process.
import { createPublicKey, generateKeyPairSync, verify } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { PUSH_NOTIFICATION, PWA_FAQ } from './pwa';
import { mayPush, parisHourOf, pushQuiet } from './push-quiet';
import { cardsPushOpen, cardsPushPublicOn } from './push-flags';
import { urlBase64ToBytes } from './push-client';
import { audienceOf, outcomeOf, pushEndpointOk, pushRequest, sendPush, vapidFromEnv, vapidJwt } from './web-push';

const QUIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..');

function keys(): { env: Record<string, string>; pubJwk: JsonWebKey } {
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const priv = privateKey.export({ format: 'jwk' });
  const pub = publicKey.export({ format: 'jwk' });
  const raw = Buffer.concat([Buffer.from([4]), Buffer.from(pub.x!, 'base64url'), Buffer.from(pub.y!, 'base64url')]).toString('base64url');
  return { env: { CARDS_VAPID_PUBLIC_KEY: raw, CARDS_VAPID_PRIVATE_KEY: priv.d!, CARDS_VAPID_SUBJECT: 'mailto:owner@example.test' }, pubJwk: pub };
}

describe('VAPID JWT (RFC 8292)', () => {
  const k = keys();
  const vk = vapidFromEnv(k.env)!;
  const now = Date.parse('2026-11-13T10:00:00Z');
  const jwt = vapidJwt(vk, 'https://push.example', now);
  const [h, c, s] = jwt.split('.');

  it('header and claims', () => {
    expect(JSON.parse(Buffer.from(h!, 'base64url').toString())).toEqual({ typ: 'JWT', alg: 'ES256' });
    const claims = JSON.parse(Buffer.from(c!, 'base64url').toString());
    expect(claims.aud).toBe('https://push.example');
    expect(claims.sub).toBe('mailto:owner@example.test');
    expect(claims.exp).toBeGreaterThan(now / 1000);
    expect(claims.exp - now / 1000).toBeLessThanOrEqual(24 * 3600);
  });

  it('the ES256 signature (64 bytes, r then s) verifies with the public key', () => {
    const sig = Buffer.from(s!, 'base64url');
    expect(sig.length).toBe(64);
    const ok = verify('sha256', Buffer.from(`${h}.${c}`), { key: createPublicKey({ format: 'jwk', key: k.pubJwk }), dsaEncoding: 'ieee-p1363' }, sig);
    expect(ok).toBe(true);
    const bad = verify('sha256', Buffer.from(`${h}.${c}x`), { key: createPublicKey({ format: 'jwk', key: k.pubJwk }), dsaEncoding: 'ieee-p1363' }, sig);
    expect(bad).toBe(false);
  });

  it('the env is refused when a key or the subject is missing or malformed', () => {
    expect(vapidFromEnv({})).toBeNull();
    expect(vapidFromEnv({ ...k.env, CARDS_VAPID_SUBJECT: 'owner@example.test' })).toBeNull();
    expect(vapidFromEnv({ ...k.env, CARDS_VAPID_PRIVATE_KEY: 'abc' })).toBeNull();
    expect(vapidFromEnv({ ...k.env, CARDS_VAPID_SUBJECT: 'https://bunnyverse.org/contact' })).not.toBeNull();
  });

  it('the request: POST, no body, vapid Authorization, TTL, Urgency normal', () => {
    const { url, init } = pushRequest(vk, 'https://fcm.googleapis.com/fcm/send/abc', now);
    expect(url).toBe('https://fcm.googleapis.com/fcm/send/abc');
    expect(init.method).toBe('POST');
    expect(init.body).toBeUndefined();
    const hd = init.headers as Record<string, string> & { Authorization: string };
    expect(hd.Authorization).toMatch(/^vapid t=[\w-]+\.[\w-]+\.[\w-]+, k=[\w-]+$/);
    expect(hd.Authorization.endsWith(`k=${vk.publicKey}`)).toBe(true);
    expect(JSON.parse(Buffer.from(hd.Authorization.split('t=')[1]!.split('.')[1]!, 'base64url').toString()).aud).toBe('https://fcm.googleapis.com');
    expect(hd.TTL).toBe('3600');
    expect(hd.Urgency).toBe('normal');
    expect(audienceOf('https://a.push.apple.com/x/y')).toBe('https://a.push.apple.com');
  });
});

describe('endpoints and outcomes', () => {
  it('only https endpoints of the known push services', () => {
    for (const ok of ['https://fcm.googleapis.com/fcm/send/x', 'https://updates.push.services.mozilla.com/wpush/v2/x', 'https://web.push.apple.com/x', 'https://wns2-par02p.notify.windows.com/w/?token=x']) expect(pushEndpointOk(ok), ok).toBe(true);
    for (const bad of ['http://fcm.googleapis.com/x', 'https://127.0.0.1/x', 'https://localhost/x', 'https://evil.example/x', 'https://fcm.googleapis.com.evil.example/x', 'https://u:p@fcm.googleapis.com/x', 'https://fcm.googleapis.com:8443/x', 'nope', 'https://169.254.169.254/'])
      expect(pushEndpointOk(bad), bad).toBe(false);
  });

  it('201 sent; 404 and 410 gone for good; everything else a failure to count', () => {
    expect(outcomeOf(201)).toBe('sent');
    expect(outcomeOf(404)).toBe('gone');
    expect(outcomeOf(410)).toBe('gone');
    for (const s of [400, 401, 403, 413, 429, 500, 503]) expect(outcomeOf(s), String(s)).toBe('retry');
  });

  it('sendPush maps the answer and never throws', async () => {
    const vk = vapidFromEnv(keys().env)!;
    const answer = (status: number) => (async () => new Response(null, { status })) as unknown as typeof fetch;
    expect(await sendPush(vk, 'https://fcm.googleapis.com/x', answer(201))).toBe('sent');
    expect(await sendPush(vk, 'https://fcm.googleapis.com/x', answer(410))).toBe('gone');
    expect(await sendPush(vk, 'https://fcm.googleapis.com/x', answer(404))).toBe('gone');
    expect(await sendPush(vk, 'https://fcm.googleapis.com/x', answer(503))).toBe('retry');
    expect(await sendPush(vk, 'https://fcm.googleapis.com/x', (async () => { throw new Error('net'); }) as unknown as typeof fetch)).toBe('retry');
  });
});

describe('quiet hours and the once-a-day rule (Paris)', () => {
  const at = (iso: string): number => Date.parse(iso);
  it('22:00 to 08:00 is quiet, winter and summer', () => {
    expect(pushQuiet(at('2026-11-13T20:59:00Z'))).toBe(false); // 21:59 Paris (CET)
    expect(pushQuiet(at('2026-11-13T21:00:00Z'))).toBe(true); // 22:00
    expect(pushQuiet(at('2026-11-13T06:59:00Z'))).toBe(true); // 07:59
    expect(pushQuiet(at('2026-11-13T07:00:00Z'))).toBe(false); // 08:00
    expect(pushQuiet(at('2026-07-13T05:59:00Z'))).toBe(true); // 07:59 CEST
    expect(pushQuiet(at('2026-07-13T06:00:00Z'))).toBe(false); // 08:00 CEST
    expect(pushQuiet(at('2026-11-12T23:00:00Z'))).toBe(true); // midnight
    expect(parisHourOf(at('2026-11-13T23:30:00Z'))).toBe(0);
  });
  it('a night stack is told at 08:00, and nobody twice a day', () => {
    expect(mayPush(at('2026-11-13T03:00:00Z'), null, '2026-11-13')).toBe(false);
    expect(mayPush(at('2026-11-13T07:00:00Z'), null, '2026-11-13')).toBe(true);
    expect(mayPush(at('2026-11-13T12:00:00Z'), '2026-11-13', '2026-11-13')).toBe(false);
    expect(mayPush(at('2026-11-13T12:00:00Z'), '2026-11-12', '2026-11-13')).toBe(true);
  });
});

describe('flags', () => {
  it('off by default; on only on the hub with NET_CARDS and NET_CARDS_PUSH', () => {
    expect(cardsPushOpen({ site: 'hub', env: {} })).toBe(false);
    expect(cardsPushOpen({ site: 'hub', env: { NET_CARDS_PUSH: '1' } })).toBe(false);
    expect(cardsPushOpen({ site: 'hub', env: { NET_CARDS: '1' } })).toBe(false);
    expect(cardsPushOpen({ site: 'hub', env: { NET_CARDS: '1', NET_CARDS_PUSH: '1' } })).toBe(true);
    expect(cardsPushOpen({ site: 'kpop', env: { NET_CARDS: '1', NET_CARDS_PUSH: '1' } })).toBe(false);
    expect(cardsPushPublicOn({ site: 'hub', env: {} })).toBe(false);
    expect(cardsPushPublicOn({ site: 'hub', env: { NEXT_PUBLIC_NET_CARDS_PUSH: '1' } })).toBe(true);
    expect(cardsPushPublicOn({ site: 'anime', env: { NEXT_PUBLIC_NET_CARDS_PUSH: '1' } })).toBe(false);
  });
  it('the client key decodes', () => {
    const k = keys().env.CARDS_VAPID_PUBLIC_KEY!;
    expect(Array.from(urlBase64ToBytes(k))).toEqual(Array.from(Buffer.from(k, 'base64url')));
  });
});

describe('the hub manifest and the service worker file', () => {
  const read = (p: string): string => readFileSync(path.join(QUIZ, p), 'utf8');
  const hub = JSON.parse(read('public/brand/hub/site.webmanifest'));

  it('the hub manifest is installable', () => {
    expect(hub.name).toBe('Bunnyverse');
    expect(hub.short_name).toBe('Bunnyverse');
    expect(hub.start_url).toBe('/');
    expect(hub.display).toBe('standalone');
    expect(hub.theme_color).toMatch(/^#[0-9A-F]{6}$/i);
    expect(hub.background_color).toMatch(/^#[0-9A-F]{6}$/i);
    const sizes = hub.icons.map((i: { sizes: string; purpose: string }) => `${i.sizes}:${i.purpose}`);
    expect(sizes).toEqual(['192x192:any', '512x512:any', '512x512:maskable']);
    for (const i of hub.icons) {
      const png = readFileSync(path.join(QUIZ, 'public', i.src));
      expect(png.subarray(1, 4).toString()).toBe('PNG');
      expect(png.readUInt32BE(16)).toBe(Number(i.sizes.split('x')[0]));
    }
  });

  it('only the hub build rewrites /sw.js; kpopquiz.org and the anime site serve none', async () => {
    const { rewritesFor } = await import('@/lib/site/routing');
    expect(rewritesFor('hub').some((r) => r.source === '/sw.js' && r.destination === '/brand/hub/sw.js')).toBe(true);
    expect(rewritesFor('kpop')).toEqual([]);
    expect(rewritesFor('anime').some((r) => r.source === '/sw.js')).toBe(false);
    expect(readFileSync(path.join(QUIZ, 'public/site.webmanifest'), 'utf8')).toContain('"KpopQuiz"');
  });

  it('the service worker does push and notificationclick only: no fetch handler, no cache', () => {
    const sw = read('public/brand/hub/sw.js');
    const code = sw.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    expect([...code.matchAll(/addEventListener\('(\w+)'/g)].map((m) => m[1])).toEqual(['push', 'notificationclick']);
    expect(code).not.toMatch(/\bfetch\b|\bcaches\b|CacheStorage|respondWith|skipWaiting|importScripts/);
    expect(code).toContain(PUSH_NOTIFICATION.title);
    expect(code).toContain(PUSH_NOTIFICATION.body);
    expect(code).toContain(PUSH_NOTIFICATION.url);
  });

  it('the FAQ answer exists and the new text has no dash', () => {
    expect(PWA_FAQ.question).toBe('Can I add Bunnyverse to my home screen?');
    expect(PWA_FAQ.answer.length).toBeGreaterThan(50);
    const dash = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`);
    for (const f of ['src/lib/cards/pwa.ts', 'src/lib/cards/web-push.ts', 'src/lib/cards/push-client.ts', 'src/lib/cards/push-quiet.ts', 'public/brand/hub/sw.js', 'public/brand/hub/site.webmanifest', 'scripts/cards/vapid-keys.mjs'])
      expect(read(f), f).not.toMatch(dash);
  });
});
