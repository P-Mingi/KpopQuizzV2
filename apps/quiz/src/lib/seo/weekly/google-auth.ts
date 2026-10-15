// Google service-account sign-in, by hand (SEO Mission 3, part C; no new dependency).
//
// The flow is Google's "OAuth 2.0 for server to server applications": we sign a short JWT
// with the service account's private key (RS256, Node's crypto), send it to the token
// endpoint, and get back an access token valid for one hour. The key never leaves the
// server and is never logged; an error message names the step, never a value.
//
// The owner pastes the whole JSON key file into one environment variable,
// GSC_SERVICE_ACCOUNT_JSON (raw JSON, or the same JSON in base64). See
// docs/seo/WEEKLY-DATA-SETUP.md.

import { createSign } from 'node:crypto';

export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
export const GSC_READONLY_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';

export interface ServiceAccount {
  clientEmail: string;
  privateKey: string;
  tokenUri: string;
}

/**
 * Read the key file from the environment value. Null when it is absent or unusable, so the
 * caller skips Search Console quietly instead of failing the job.
 */
export function parseServiceAccount(raw: string | undefined | null): ServiceAccount | null {
  const text = (raw ?? '').trim();
  if (!text) return null;
  let json: unknown = null;
  for (const candidate of [text, safeBase64(text)]) {
    if (!candidate) continue;
    try {
      json = JSON.parse(candidate);
      break;
    } catch {
      // try the next form
    }
  }
  if (!json || typeof json !== 'object') return null;
  const o = json as Record<string, unknown>;
  const clientEmail = typeof o.client_email === 'string' ? o.client_email.trim() : '';
  // Vercel and shells often keep "\n" as two characters: turn them back into new lines.
  const privateKey = typeof o.private_key === 'string' ? o.private_key.replace(/\\n/g, '\n').trim() : '';
  if (!clientEmail || !privateKey.includes('PRIVATE KEY')) return null;
  const tokenUri = typeof o.token_uri === 'string' && o.token_uri.startsWith('https://') ? o.token_uri : GOOGLE_TOKEN_URL;
  return { clientEmail, privateKey, tokenUri };
}

function safeBase64(text: string): string | null {
  if (!/^[A-Za-z0-9+/=\s]+$/.test(text)) return null;
  try {
    return Buffer.from(text, 'base64').toString('utf8');
  } catch {
    return null;
  }
}

export function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

/** The signed JWT ("assertion") Google exchanges for an access token. */
export function buildJwtAssertion(sa: ServiceAccount, scope: string, nowSeconds: number): string {
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = { iss: sa.clientEmail, scope, aud: sa.tokenUri, iat: nowSeconds, exp: nowSeconds + 3600 };
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;
  const signer = createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();
  return `${signingInput}.${base64url(signer.sign(sa.privateKey))}`;
}

export interface HttpRequest {
  url: string;
  init: { method: string; headers: Record<string, string>; body?: string };
}

export function buildTokenRequest(sa: ServiceAccount, assertion: string): HttpRequest {
  const body = new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }).toString();
  return {
    url: sa.tokenUri,
    init: { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body },
  };
}

/** The access token from the token endpoint's answer, or an error that names no secret. */
export function parseTokenResponse(status: number, json: unknown): string {
  const o = (json && typeof json === 'object' ? json : {}) as Record<string, unknown>;
  if (status === 200 && typeof o.access_token === 'string' && o.access_token) return o.access_token;
  const code = typeof o.error === 'string' ? o.error : 'no_token';
  throw new Error(`Google token request failed (HTTP ${status}, ${code})`);
}

/** The part of fetch these modules use, so tests can pass a fake one (no network in tests). */
export type FetchLike = (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string; signal?: AbortSignal; redirect?: 'manual' | 'follow' | 'error' }) => Promise<{ status: number; ok: boolean; json(): Promise<unknown>; text(): Promise<string> }>;

export async function fetchAccessToken(sa: ServiceAccount, scope: string, fetchImpl: FetchLike, nowMs: number = Date.now()): Promise<string> {
  const req = buildTokenRequest(sa, buildJwtAssertion(sa, scope, Math.floor(nowMs / 1000)));
  const res = await fetchImpl(req.url, req.init);
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return parseTokenResponse(res.status, json);
}
