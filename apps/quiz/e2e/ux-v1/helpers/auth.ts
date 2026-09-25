// Signed-in fixture for every v11 spec (worker prompt 3b). The storage state is
// written by the `setup` project AFTER test collection, so it is resolved here at
// run time (a module-level check would always see "no file" on a first run).
//
//   import { signedInTest as test, expect, skipUnlessSignedIn } from './helpers/auth';
//   test('bell shows my unread count', async ({ page }) => { skipUnlessSignedIn(); ... });

import fs from 'node:fs';

import { test as base } from '@playwright/test';

import { AUTH_FILE } from './env';

export { expect } from '@playwright/test';

export const signedInTest = base.extend({
  storageState: async ({}, provide) => {
    await provide(fs.existsSync(AUTH_FILE) ? AUTH_FILE : { cookies: [], origins: [] });
  },
});

/** Call at the top of a signed-in test: skips (never passes) without a session. */
export function skipUnlessSignedIn(): void {
  base.skip(!fs.existsSync(AUTH_FILE), 'signed-in NOT verified: no test-user storage state (env missing)');
}
