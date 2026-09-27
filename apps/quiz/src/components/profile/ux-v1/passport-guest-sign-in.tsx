'use client';

import { UxButton } from '@/components/ux-v1/button';
import { useSignIn } from '@/components/ux-v1/sign-in-sheet';

/** Where the fan lands after signing in from the guest passport: their own passport. */
export const GUEST_RETURN_TO = '/me';

/**
 * "Sign in" of the guest passport (prototype: `openSignin('Open your passport', ...)`).
 * Opens A0's shared sign-in sheet (the same Supabase calls as /login); /auth/callback
 * brings the fan back to /me, which then renders their real passport.
 */
export function PassportGuestSignIn(): React.ReactElement {
  const signIn = useSignIn();
  return (
    <UxButton
      size="lg"
      aria-haspopup="dialog"
      onClick={() => signIn({
        title: 'Open your passport',
        sub: 'Keep your scores, streak, badges and rank title. No password needed.',
        returnTo: GUEST_RETURN_TO,
      })}
    >
      Sign in
    </UxButton>
  );
}
