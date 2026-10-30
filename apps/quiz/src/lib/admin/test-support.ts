// ADMIN-1: a local stand-in for the auth client that lib/admin/guard.ts reads, for unit tests only (no network, no account, no
// real password, token or TOTP code). `user` is the account the auth server verifies; `sessionUser` is what the session cookie
// claims (getSession), which a test sets apart from `user` to forge a cookie; `aal` is the level of the verified token and
// `factor` whether the account has a verified TOTP factor.

export interface AuthStubState {
  readonly user: { id: string } | null;
  readonly sessionUser?: { id: string } | null;
  readonly aal?: 'aal1' | 'aal2';
  readonly factor?: boolean;
  readonly userThrows?: boolean;
}

export interface AuthStub {
  getSession(): Promise<{ data: { session: { access_token: string; user: { id: string } } | null }; error: null }>;
  getUser(token?: string): Promise<{ data: { user: { id: string } | null }; error: { message: string } | null }>;
  mfa: {
    getAuthenticatorAssuranceLevel(token?: string): Promise<{
      data: { currentLevel: 'aal1' | 'aal2'; nextLevel: 'aal1' | 'aal2'; currentAuthenticationMethods: [] };
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
      return s.user ? { data: { user: s.user }, error: null } : { data: { user: null }, error: { message: 'invalid token' } };
    },
    mfa: {
      async getAuthenticatorAssuranceLevel() {
        const s = read();
        const factor = s.factor ?? true;
        return { data: { currentLevel: s.aal ?? (factor ? 'aal2' : 'aal1'), nextLevel: factor ? 'aal2' : 'aal1', currentAuthenticationMethods: [] }, error: null };
      },
    },
  };
}
