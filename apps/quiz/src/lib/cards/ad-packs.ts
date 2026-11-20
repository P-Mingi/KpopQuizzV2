// KpopCards launch prep: a rewarded ad gives +1 pack, granted on the server ONLY on the ad network's signed completion callback (server side
// verification, "SSV"), never on the browser's word. Pure part: the flag, the parse and the check of the signed callback, the key list, the
// consent mode of the ad request. No account exists yet and the flag is OFF: nothing here runs until the owner has done the list of
// docs/o1/reports/CARDS/LAUNCH-PREP-ADS.md.
//
// The callback format is the one of Google's rewarded ads server side verification (Ad Manager and AdMob): a GET request to our URL with the query
//   ad_network, ad_unit, custom_data, reward_amount, reward_item, timestamp, transaction_id, user_id, [verifier-set params], signature, key_id
// where `signature` and `key_id` are the LAST two parameters. The signature is ECDSA (P-256, SHA-256, DER, base64url) over the query string
// that comes BEFORE "&signature=", and key_id names one of the public keys published at VERIFIER_KEYS_URL. The owner checks the exact names against
// his console (the list names it); the parameters this code reads are isolated in SSV below.
import { createPublicKey, verify as cryptoVerify } from 'node:crypto';

import type { AdPersonalisation } from './ads';

export const VERIFIER_KEYS_URL = 'https://www.gstatic.com/admob/reward/verifier-keys.json';

/** The names of the callback parameters this code reads (one place to change). */
export const SSV = {
  signature: 'signature',
  keyId: 'key_id',
  tx: 'transaction_id',
  adUnit: 'ad_unit',
  ticket: 'custom_data',
  user: 'user_id',
  timestamp: 'timestamp',
} as const;

// ---- the flag and the settings (env) ------------------------------------------------------------------------------------------------------

export interface AdPackEnv {
  NET_CARDS_AD_PACKS?: string | undefined;
  CARDS_AD_PACKS_PER_DAY?: string | undefined;
  CARDS_AD_SSV_AD_UNIT?: string | undefined;
}
const on = (v: string | undefined): boolean => v === '1' || v === 'true';
export const AD_PACKS_PER_DAY_DEFAULT = 3;
export const AD_PACKS_PER_DAY_MAX = 20;

/** The pack for a rewarded ad: OFF unless NET_CARDS_AD_PACKS is 1 or true, a daily cap above 0 is set, and the ad unit that the callback must name is
 *  configured (without it no callback can be matched to our ad, so nothing is granted). */
export function adPacksOn(env: AdPackEnv): boolean {
  return on(env.NET_CARDS_AD_PACKS) && adPacksPerDay(env) > 0 && adUnitOf(env) !== null;
}

/** Ad packs a user can earn in a Paris day (CARDS_AD_PACKS_PER_DAY, default 3, 0 turns them off, at most 20). */
export function adPacksPerDay(env: AdPackEnv): number {
  const raw = env.CARDS_AD_PACKS_PER_DAY;
  if (raw === undefined || !/^\s*\d{1,3}\s*$/.test(raw)) return AD_PACKS_PER_DAY_DEFAULT;
  return Math.min(AD_PACKS_PER_DAY_MAX, Number(raw));
}

/** The ad unit the callback must name (CARDS_AD_SSV_AD_UNIT), or null. */
export function adUnitOf(env: AdPackEnv): string | null {
  const v = (env.CARDS_AD_SSV_AD_UNIT ?? '').trim();
  return /^[A-Za-z0-9/_\-.]{3,64}$/.test(v) ? v : null;
}

// ---- the callback -----------------------------------------------------------------------------------------------------------------------------

export interface SsvParsed {
  /** The query string the signature covers: everything before "&signature=". */
  message: string;
  signature: string;
  keyId: string;
  params: Record<string, string>;
}

/** Splits a raw query string (without the "?"). Null when the signature is missing or is not followed only by key_id. */
export function parseSsv(rawQuery: string): SsvParsed | null {
  const q = rawQuery.startsWith('?') ? rawQuery.slice(1) : rawQuery;
  const i = q.indexOf('&signature=');
  if (i < 0) return null;
  const message = q.slice(0, i);
  const tail = new URLSearchParams(q.slice(i + 1));
  const signature = tail.get(SSV.signature) ?? '';
  const keyId = tail.get(SSV.keyId) ?? '';
  if (!signature || !keyId) return null;
  // The tail is exactly signature then key_id: anything else after the signature is not covered by it, so it is refused.
  if ([...tail.keys()].length !== 2) return null;
  const params: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(message)) if (!(k in params)) params[k] = v;
  return { message, signature, keyId, params };
}

/** The public keys, by key id, as PEM (SPKI) text. */
export type KeyMap = Readonly<Record<string, string>>;

/** The key list the network publishes: { keys: [{ keyId, pem, base64 }] }. Entries without a PEM or a base64 SPKI are dropped. */
export function keysFromJson(body: unknown): KeyMap {
  const out: Record<string, string> = {};
  const list = (body as { keys?: unknown } | null)?.keys;
  if (!Array.isArray(list)) return out;
  for (const k of list) {
    const e = k as { keyId?: unknown; pem?: unknown; base64?: unknown };
    const id = typeof e.keyId === 'number' || typeof e.keyId === 'string' ? String(e.keyId) : null;
    if (id === null) continue;
    if (typeof e.pem === 'string' && e.pem.includes('BEGIN PUBLIC KEY')) out[id] = e.pem;
    else if (typeof e.base64 === 'string' && /^[A-Za-z0-9+/=]+$/.test(e.base64)) out[id] = `-----BEGIN PUBLIC KEY-----\n${e.base64}\n-----END PUBLIC KEY-----\n`;
  }
  return out;
}

/** True when the signature is valid for the message under the named key. Any malformed input is false, never a throw. */
export function signatureValid(p: SsvParsed, keys: KeyMap): boolean {
  const pem = keys[p.keyId];
  if (!pem) return false;
  try {
    const sig = Buffer.from(p.signature.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    if (sig.length < 8) return false;
    return cryptoVerify('sha256', Buffer.from(p.message, 'utf8'), { key: createPublicKey(pem), dsaEncoding: 'der' }, sig);
  } catch {
    return false;
  }
}

export type SsvVerdict =
  | { ok: true; ticket: string; tx: string; adUnit: string; user: string | null }
  | { ok: false; why: 'disabled' | 'malformed' | 'unknown_key' | 'signature' | 'ad_unit' | 'stale' | 'ticket' | 'tx' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** How old a callback may be (the network signs a timestamp in milliseconds). */
export const SSV_MAX_AGE_MS = 2 * 60 * 60 * 1000;

/**
 * Everything that must hold before a pack is given: the flag is on, the callback is well formed, the key is known, the signature is valid, the ad unit
 * is ours, the timestamp is fresh, the custom data is a ticket id and the transaction id is present. The ticket's owner, the one-grant-per-event rule
 * and the daily cap are then decided by the database (cards_ad_pack_grant).
 */
export function verifySsv(rawQuery: string, keys: KeyMap, env: AdPackEnv, nowMs: number): SsvVerdict {
  if (!adPacksOn(env)) return { ok: false, why: 'disabled' };
  const p = parseSsv(rawQuery);
  if (!p) return { ok: false, why: 'malformed' };
  if (!keys[p.keyId]) return { ok: false, why: 'unknown_key' };
  if (!signatureValid(p, keys)) return { ok: false, why: 'signature' };
  const unit = adUnitOf(env);
  if (p.params[SSV.adUnit] !== unit) return { ok: false, why: 'ad_unit' };
  const ts = Number(p.params[SSV.timestamp]);
  if (!Number.isFinite(ts) || Math.abs(nowMs - ts) > SSV_MAX_AGE_MS) return { ok: false, why: 'stale' };
  const ticket = p.params[SSV.ticket] ?? '';
  if (!UUID.test(ticket)) return { ok: false, why: 'ticket' };
  const tx = p.params[SSV.tx] ?? '';
  if (tx.length < 1 || tx.length > 128) return { ok: false, why: 'tx' };
  const user = p.params[SSV.user] ?? '';
  return { ok: true, ticket: ticket.toLowerCase(), tx, adUnit: unit!, user: UUID.test(user) ? user.toLowerCase() : null };
}

// ---- the keys, fetched and kept ------------------------------------------------------------------------------------------------------------

export interface KeyCache {
  get(fetchFn: typeof fetch, wantedId: string, nowMs: number): Promise<KeyMap>;
}
/** Keeps the list 24 hours; an unknown key id forces one refetch, at most one a minute (a forged key id cannot make us hammer the network). */
export function createKeyCache(): KeyCache {
  let keys: KeyMap = {};
  let at = 0;
  let tried = 0;
  return {
    async get(fetchFn, wantedId, nowMs) {
      const stale = nowMs - at > 24 * 60 * 60 * 1000;
      const unknown = !keys[wantedId] && nowMs - tried > 60_000;
      if (at === 0 || stale || unknown) {
        tried = nowMs;
        try {
          const res = await fetchFn(VERIFIER_KEYS_URL, { signal: AbortSignal.timeout(5000), cache: 'no-store' });
          if (res.ok) {
            const k = keysFromJson(await res.json());
            if (Object.keys(k).length > 0) { keys = k; at = nowMs; }
          }
        } catch { /* keep what we hold: a failed fetch never grants, it only fails to verify */ }
      }
      return keys;
    },
  };
}

// ---- the consent mode of the ad request -----------------------------------------------------------------------------------------------------

// The consent mode of the ad request is decided in ads.ts (one rule for the claim path and the signed-callback path); re-exported for callers of this file.
export { adPersonalisation } from './ads';
export type { AdPersonalisation } from './ads';

/** What the browser puts on the rewarded request: the ticket as the custom data (the network echoes it in the signed callback), our user id, and the
 *  non personalised flag. Nothing here grants anything. */
export function rewardedRequestOptions(ticket: string, userId: string, mode: AdPersonalisation): { customData: string; userId: string; nonPersonalizedAds: boolean } {
  return { customData: ticket, userId, nonPersonalizedAds: mode === 'non_personalised' };
}
