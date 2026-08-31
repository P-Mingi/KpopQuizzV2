import { redirect } from 'next/navigation';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My profile',
  robots: { index: false, follow: false },
};

// /profile and /me both resolve to the personal passport (no second profile).
// /me is the canonical self view and owns the auth gating (login / onboarding).
export default function MyProfilePage(): never {
  redirect('/me');
}
