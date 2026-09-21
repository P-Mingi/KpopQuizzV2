import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { createServerClient as createSsrClient } from '@supabase/ssr';

// Existing-account parity (mission rule 9 / data-safety contract). The site is
// PASSWORDLESS (magic-link + OAuth), so there is no password anywhere. Option 2:
// the service role only MINTS a one-time email OTP; the OTP is then verified
// through the app's OWN @supabase/ssr client (a capture cookie-store), which emits
// the exact `sb-<ref>-auth-token` cookies the app reads. Those are injected into
// the browser context - no Supabase redirect-allowlist, no hand-encoded cookie.
//
// It reads the guarded signed-in numbers (fixture: 2 plays, 1 badge, xp 20,
// following 1). Run on a flag-OFF build (baseline) and a flag-ON build (shell);
// the printed values must match, in light and dark - that is the parity gate.
//
// Env (test/preview only, never committed):
//   UX_V1_TEST_EMAIL, UX_V1_TEST_USER_ID,
//   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
// Skips cleanly whenever any of these is absent, so CI without the secret stays green.
const EMAIL = process.env.UX_V1_TEST_EMAIL;
const USER_ID = process.env.UX_V1_TEST_USER_ID;
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ready = Boolean(EMAIL && SUPA_URL && ANON && SVC);

test.describe('existing-account parity', () => {
  test.skip(!ready, 'UX v1 parity env not set (UX_V1_TEST_EMAIL + Supabase URL/anon/service)');

  test('signed-in passport values are unchanged by the shell', async ({ page, baseURL }) => {
    // 1. Mint a magic-link OTP with the service role (no email is sent).
    const admin = createClient(SUPA_URL as string, SVC as string, { auth: { persistSession: false } });
    const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email: EMAIL as string });
    expect(error, 'generateLink error').toBeFalsy();
    const tokenHash = data?.properties?.hashed_token;
    expect(tokenHash, 'hashed_token').toBeTruthy();

    // 2. Verify it through the app's own SSR client with a capture cookie-store, so
    //    the emitted cookies match exactly what the app writes on a real login.
    const captured: { name: string; value: string }[] = [];
    const ssr = createSsrClient(SUPA_URL as string, ANON as string, {
      cookies: {
        getAll: () => [],
        setAll: (list) => list.forEach((c) => captured.push({ name: c.name, value: c.value })),
      },
    });
    const { error: verifyErr } = await ssr.auth.verifyOtp({ type: 'email', token_hash: tokenHash as string });
    expect(verifyErr, 'verifyOtp error').toBeFalsy();
    expect(captured.length, 'auth cookies emitted').toBeGreaterThan(0);

    // 3. Inject the auth cookies into the browser and land signed in.
    const host = baseURL ? new URL(baseURL).hostname : 'localhost';
    await page.context().addCookies(captured.map((c) => ({ name: c.name, value: c.value, domain: host, path: '/' })));

    // 4. Read the guarded numbers off the passport. Print BOTH runs into the PR;
    //    they must be identical flag-off vs flag-on.
    await page.goto('/profile');
    await expect(page.locator('main').first()).toBeVisible();
    const text = (await page.locator('main').innerText()).replace(/\s+/g, ' ').trim();
    const plays = text.match(/([\d,]+)\s+plays?/i)?.[1] ?? 'n/a';
    const mastered = text.match(/([\d,]+)\s+mastered/i)?.[1] ?? 'n/a';
    const xp = text.match(/([\d,]+)\s*xp/i)?.[1] ?? 'n/a';
    // eslint-disable-next-line no-console
    console.log(`[parity] user=${USER_ID ?? EMAIL} plays=${plays} mastered=${mastered} xp=${xp}`);

    // Smoke: the passport is the signed-in test user (fixture username testtest),
    // proving the shell did not break the signed-in read path.
    await expect(page.locator('main')).toContainText(/testtest/i);
  });
});
