// ADMIN-1: a local stand-in for the auth client that lib/admin/guard.ts reads, for unit tests only (no network, no account, no
// real password, token or TOTP code). `user` is the account the auth server verifies; `sessionUser` is what the session cookie
// claims (getSession), which a test sets apart from `user` to forge a cookie; `aal` is the level of the verified token and
// `factor` whether the account has a verified TOTP factor. It answers as auth-js does: the verified user carries its factors, and
// nextLevel starts at currentLevel and rises to aal2 only with a verified factor (guard.real-auth.test.ts runs the real auth-js).
// ADMIN-2: an aal2 token carries the `totp` entry of its amr claim, dated `totpAgeMs` before the clock of the test (0 by default: a code
// typed just now; null: no `totp` entry at all). Date.now() is read at each call, so a frozen clock moves the entry with it.

export interface AuthStubState {
  readonly user: { id: string } | null;
  readonly sessionUser?: { id: string } | null;
  readonly aal?: 'aal1' | 'aal2';
  readonly factor?: boolean;
  readonly userThrows?: boolean;
  /** How long before now the last TOTP code was verified (ms). Default 0. null: the token has no `totp` entry. */
  readonly totpAgeMs?: number | null;
  /** The exact time (ms since the epoch) of the last code, to model one token while the clock moves. Wins over totpAgeMs. */
  readonly totpAtMs?: number;
}

export interface AmrEntryStub { method: string; timestamp: number }

export interface AuthStub {
  getSession(): Promise<{ data: { session: { access_token: string; user: { id: string } } | null }; error: null }>;
  getUser(token?: string): Promise<{ data: { user: { id: string; factors: Array<{ id: string; status: 'verified' }> } | null }; error: { message: string } | null }>;
  mfa: {
    getAuthenticatorAssuranceLevel(token?: string): Promise<{
      data: { currentLevel: 'aal1' | 'aal2'; nextLevel: 'aal1' | 'aal2'; currentAuthenticationMethods: AmrEntryStub[] };
      error: null;
    }>;
  };
}

/** Defaults: a session exists when `user` is set, the verified token is aal2 and the account has a verified factor. */
export function stubAuth(read: () => AuthStubState): AuthStub {
  const claimed = (): { id: string } | null => {
    const s = read();
    return s.sessionUser !== undefined ? s.sessionUser : s.user;
  };
  return {
    async getSession() {
      const u = claimed();
      return { data: { session: u ? { access_token: `stub-token-${u.id}`, user: u } : null }, error: null };
    },
    async getUser() {
      const s = read();
      if (s.userThrows) throw new Error('auth unavailable');
      if (!s.user) return { data: { user: null }, error: { message: 'invalid token' } };
      return { data: { user: { ...s.user, factors: (s.factor ?? true) ? [{ id: 'stub-factor', status: 'verified' }] : [] } }, error: null };
    },
    mfa: {
      async getAuthenticatorAssuranceLevel() {
        const s = read();
        const factor = s.factor ?? true;
        const currentLevel = s.aal ?? (factor ? 'aal2' : 'aal1');
        const age = s.totpAgeMs === undefined ? 0 : s.totpAgeMs;
        const currentAuthenticationMethods: AmrEntryStub[] = [{ method: 'password', timestamp: Math.floor(Date.now() / 1000) - 30 }];
        if (currentLevel === 'aal2' && s.totpAtMs !== undefined) currentAuthenticationMethods.push({ method: 'totp', timestamp: Math.floor(s.totpAtMs / 1000) });
        else if (currentLevel === 'aal2' && age !== null) currentAuthenticationMethods.push({ method: 'totp', timestamp: Math.floor((Date.now() - age) / 1000) });
        return { data: { currentLevel, nextLevel: factor ? 'aal2' : currentLevel, currentAuthenticationMethods }, error: null };
      },
    },
  };
}
