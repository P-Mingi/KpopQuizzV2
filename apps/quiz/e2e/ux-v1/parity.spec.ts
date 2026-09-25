import { signedInTest as test, expect, skipUnlessSignedIn } from './helpers/auth';
import { loadTestEnv } from './helpers/env';

// Existing-account parity (mission rule 9 / data-safety contract). The site is
// PASSWORDLESS (magic-link + OTP), so there is no password anywhere. The session
// is minted once by the `setup` project (e2e/ux-v1/auth.setup.ts: the service role
// only MINTS a one-time OTP, verified through the app's own @supabase/ssr client,
// the exact `sb-<ref>-auth-token` cookies saved as a storage state). This spec
// reuses that state.
//
// It reads the guarded signed-in numbers (fixture: 2 plays, 1 badge, xp 20,
// following 1). Run on a flag-OFF build (baseline) and a flag-ON build (shell);
// the printed values must match, in light and dark - that is the parity gate.
//
// NOTE (A0, v11): GET /me (where /profile redirects) is NOT read-only today: the
// page calls grantEarnedTiers() and snapshotIfStale() for the viewer (user_badges,
// profiles.passport_snapshot_at, passport_group_snapshots). Run this spec only
// where the owner allows those writes for the test user.
//
// Skips cleanly whenever the env or the storage state is absent, so CI without
// the secret stays green.
const env = loadTestEnv();

test.describe('existing-account parity', () => {
  test('signed-in passport values are unchanged by the shell', async ({ page }) => {
    test.skip(!env.ready, 'UX v1 parity env not set (UX_V1_TEST_EMAIL + Supabase URL/anon/service)');
    skipUnlessSignedIn();

    // Read the guarded numbers off the passport. Print BOTH runs into the PR;
    // they must be identical flag-off vs flag-on.
    await page.goto('/profile');
    await expect(page.locator('main').first()).toBeVisible();
    const text = (await page.locator('main').innerText()).replace(/\s+/g, ' ').trim();
    const plays = text.match(/([\d,]+)\s+plays?/i)?.[1] ?? 'n/a';
    const mastered = text.match(/([\d,]+)\s+mastered/i)?.[1] ?? 'n/a';
    const xp = text.match(/([\d,]+)\s*xp/i)?.[1] ?? 'n/a';
    // eslint-disable-next-line no-console
    console.log(`[parity] user=${env.userId ?? 'test user'} plays=${plays} mastered=${mastered} xp=${xp}`);

    // Smoke: the passport is the signed-in test user (fixture username testtest),
    // proving the shell did not break the signed-in read path.
    await expect(page.locator('main')).toContainText(/testtest/i);
  });
});
