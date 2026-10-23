import { createVerify, generateKeyPairSync } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { base64url, buildJwtAssertion, buildTokenRequest, fetchAccessToken, GOOGLE_TOKEN_URL, GSC_READONLY_SCOPE, parseServiceAccount, parseTokenResponse } from './google-auth';

import type { FetchLike } from './google-auth';

// A throwaway key made by the test itself: nothing real is ever signed or sent.
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const PEM = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const KEY_FILE = { type: 'service_account', client_email: 'reader@test-project.iam.example.com', private_key: PEM, token_uri: GOOGLE_TOKEN_URL };

const fromB64url = (s: string): string => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');

describe('parseServiceAccount', () => {
  it('reads the raw JSON key file', () => {
    const sa = parseServiceAccount(JSON.stringify(KEY_FILE));
    expect(sa?.clientEmail).toBe(KEY_FILE.client_email);
    expect(sa?.privateKey).toContain('BEGIN PRIVATE KEY');
    expect(sa?.tokenUri).toBe(GOOGLE_TOKEN_URL);
  });

  it('reads the same file in base64', () => {
    const sa = parseServiceAccount(Buffer.from(JSON.stringify(KEY_FILE)).toString('base64'));
    expect(sa?.clientEmail).toBe(KEY_FILE.client_email);
  });

  it('turns literal \\n back into new lines', () => {
    const escaped = JSON.stringify({ ...KEY_FILE, private_key: PEM.replace(/\n/g, '\\n') });
    const sa = parseServiceAccount(escaped);
    expect(sa?.privateKey.split('\n').length).toBeGreaterThan(3);
  });

  it('returns null when absent, broken or incomplete (the job then skips)', () => {
    expect(parseServiceAccount(undefined)).toBeNull();
    expect(parseServiceAccount('')).toBeNull();
    expect(parseServiceAccount('{not json')).toBeNull();
    expect(parseServiceAccount(JSON.stringify({ client_email: 'x@y.example.com' }))).toBeNull();
    expect(parseServiceAccount(JSON.stringify({ ...KEY_FILE, private_key: 'nope' }))).toBeNull();
  });

  it('never trusts a non https token_uri', () => {
    expect(parseServiceAccount(JSON.stringify({ ...KEY_FILE, token_uri: 'http://evil.example.com/token' }))?.tokenUri).toBe(GOOGLE_TOKEN_URL);
  });
});

describe('buildJwtAssertion', () => {
  const sa = parseServiceAccount(JSON.stringify(KEY_FILE))!;
  const jwt = buildJwtAssertion(sa, GSC_READONLY_SCOPE, 1_760_000_000);
  const [h, p, s] = jwt.split('.');

  it('has an RS256 header and the claims Google expects', () => {
    expect(JSON.parse(fromB64url(h!))).toEqual({ alg: 'RS256', typ: 'JWT' });
    expect(JSON.parse(fromB64url(p!))).toEqual({
      iss: KEY_FILE.client_email,
      scope: 'https://www.googleapis.com/auth/webmasters.readonly',
      aud: GOOGLE_TOKEN_URL,
      iat: 1_760_000_000,
      exp: 1_760_003_600,
    });
  });

  it('is signed with the private key (verifies with the public key)', () => {
    const verifier = createVerify('RSA-SHA256');
    verifier.update(`${h}.${p}`);
    verifier.end();
    const sig = Buffer.from(s!.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    expect(verifier.verify(publicKey, sig)).toBe(true);
  });

  it('uses base64url without padding', () => {
    expect(jwt).not.toMatch(/[=+/]/);
    expect(base64url('??>')).toBe('Pz8-');
  });
});

describe('token exchange', () => {
  const sa = parseServiceAccount(JSON.stringify(KEY_FILE))!;

  it('posts the jwt-bearer grant as a form', () => {
    const req = buildTokenRequest(sa, 'a.b.c');
    expect(req.url).toBe(GOOGLE_TOKEN_URL);
    expect(req.init.method).toBe('POST');
    expect(req.init.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
    const body = new URLSearchParams(req.init.body);
    expect(body.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:jwt-bearer');
    expect(body.get('assertion')).toBe('a.b.c');
  });

  it('reads the access token, and fails with a message that holds no secret', () => {
    expect(parseTokenResponse(200, { access_token: 'tok', expires_in: 3599, token_type: 'Bearer' })).toBe('tok');
    expect(() => parseTokenResponse(400, { error: 'invalid_grant', error_description: 'Invalid JWT Signature.' })).toThrow('Google token request failed (HTTP 400, invalid_grant)');
  });

  it('fetchAccessToken sends one request and returns the token (fake fetch, no network)', async () => {
    const calls: Array<{ url: string; body: string | undefined }> = [];
    const fake: FetchLike = async (url, init) => {
      calls.push({ url, body: init?.body });
      return { status: 200, ok: true, json: async () => ({ access_token: 'ya29.test' }), text: async () => '' };
    };
    await expect(fetchAccessToken(sa, GSC_READONLY_SCOPE, fake, 1_760_000_000_000)).resolves.toBe('ya29.test');
    expect(calls).toHaveLength(1);
    expect(new URLSearchParams(calls[0]!.body).get('assertion')!.split('.')).toHaveLength(3);
  });
});
