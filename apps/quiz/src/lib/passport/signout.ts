// Run O1, lot (e), lane B7: the sign-out library of anime and hub (apis.md 3.6, last paragraph; registry auth.signOutModes).
// There is no sign-out route: a client (browser or server) calls `signOut`, which asks Supabase for the scope the site offers.
// anime and hub offer 'global' (every device) and 'local' (this browser). kpop offers 'global' only, so any request there is
// global, which is what its untouched button does today. Nothing here is imported by the kpop button.

import { SITE_ID, siteConfig } from '@/lib/site/registry';

import type { SiteId, SignOutMode } from '@/lib/site/types';

/** What the Supabase client needs: `auth.signOut({ scope })`. */
export interface SignOutClient {
  auth: { signOut(options: { scope: SignOutMode }): Promise<{ error: unknown } | unknown> };
}

/** The scopes `site` offers (its registry `auth.signOutModes`). */
export function signOutModesFor(site: SiteId = SITE_ID): readonly SignOutMode[] {
  return siteConfig(site).auth.signOutModes;
}

/** The scope that will be used: the requested one when the site offers it, else 'global' (the safe, wider sign-out). */
export function signOutScopeFor(requested: SignOutMode | undefined, site: SiteId = SITE_ID): SignOutMode {
  return requested !== undefined && signOutModesFor(site).includes(requested) ? requested : 'global';
}

/** Signs out with the scope `signOutScopeFor` gives, and returns it. A failure of the call is thrown to the caller. */
export async function signOut(client: SignOutClient, requested?: SignOutMode, site: SiteId = SITE_ID): Promise<SignOutMode> {
  const scope = signOutScopeFor(requested, site);
  await client.auth.signOut({ scope });
  return scope;
}
