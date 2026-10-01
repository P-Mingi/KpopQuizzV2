'use client';

import { useUxMe } from '@/components/ux-v1/use-ux-me';

/**
 * Kit fixture for the viewer state (P4 request 3). It renders useUxMe() text on
 * the server AND hydrates late on purpose (kit-auth-probe-late.tsx), after the
 * shared /api/auth/me cache is filled: exactly the case that used to hydrate with
 * different markup. kit.spec asserts no hydration error.
 */
export function KitAuthProbe(): React.ReactElement {
  const me = useUxMe();
  const state = me === null ? 'loading' : me.profile ? 'in' : 'out';
  const text = me === null ? 'Checking your account' : me.profile ? `Signed in as ${me.profile.username}` : 'Browsing as a guest';
  return <p className="ux-help" data-kit="auth-probe" data-state={state}>{text}</p>;
}
