import fs from 'node:fs';
import path from 'node:path';

import { expect, test as setup } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { createServerClient as createSsrClient } from '@supabase/ssr';

import { AUTH_FILE, loadTestEnv } from './helpers/env';

// Signed-in testing for the v11 run (worker prompt 3b). The site is passwordless:
// the service role only MINTS a one-time email OTP for the ONE parity test user
// (auth.admin.generateLink, no email is sent); the OTP is verified through the
// app's own @supabase/ssr client, whose cookie store captures the exact
// `sb-<ref>-auth-token` cookies the app writes on a real login. Those cookies are
// saved as a Playwright storage state for the target host (baseURL), gitignored
// in apps/quiz/e2e/.auth/. Signed-in specs: test.use({ storageState: AUTH_FILE }).
//
// Never prints the env or the state. Skips cleanly when the env is missing (the
// run continues guest-only and reports say "signed-in NOT verified"). A fresh
// state (< 45 min, same host) is reused so a run mints at most one session.

const REUSE_MS = 45 * 60 * 1000;

setup('parity test user session', async ({ baseURL }) => {
  const env = loadTestEnv();
  setup.skip(!env.ready, 'signed-in env missing (UX_V1_TEST_EMAIL + Supabase URL / anon / service role): guest only');

  const target = new URL(baseURL ?? 'http://localhost:3021');
  const host = target.hostname;

  if (fs.existsSync(AUTH_FILE)) {
    const age = Date.now() - fs.statSync(AUTH_FILE).mtimeMs;
    const saved = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8')) as { cookies?: { domain?: string }[] };
    if (age < REUSE_MS && saved.cookies?.length && saved.cookies.every((c) => c.domain === host)) {
      setup.info().annotations.push({ type: 'auth', description: 'reused a fresh storage state' });
      return;
    }
  }

  // 1. Mint a magic-link OTP with the service role (no email is sent).
  const admin = createClient(env.supabaseUrl as string, env.serviceKey as string, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email: env.email as string });
  expect(error, 'generateLink').toBeFalsy();
  const tokenHash = data?.properties?.hashed_token;
  expect(tokenHash, 'hashed_token').toBeTruthy();
  if (env.userId) expect(data?.user?.id, 'the minted user is UX_V1_TEST_USER_ID').toBe(env.userId);

  // 2. Verify it through the app's SSR client with a capture cookie store.
  const captured: { name: string; value: string }[] = [];
  const ssr = createSsrClient(env.supabaseUrl as string, env.anonKey as string, {
    cookies: {
      getAll: () => [],
      setAll: (list) => { for (const c of list) captured.push({ name: c.name, value: c.value }); },
    },
  });
  const { error: verifyErr } = await ssr.auth.verifyOtp({ type: 'email', token_hash: tokenHash as string });
  expect(verifyErr, 'verifyOtp').toBeFalsy();
  expect(captured.length, 'auth cookies emitted').toBeGreaterThan(0);

  // 3. Save the storage state for the target host only (never printed).
  const secure = target.protocol === 'https:';
  const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7;
  const state = {
    cookies: captured.map((c) => ({ name: c.name, value: c.value, domain: host, path: '/', expires, httpOnly: false, secure, sameSite: 'Lax' as const })),
    origins: [],
  };
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  fs.writeFileSync(AUTH_FILE, JSON.stringify(state), { mode: 0o600 });
});
