// Run O1 twin (rule 18) of apps/quiz/src/app/(site)/profile/page.tsx (owner, 2026-11-09): the Passport door of the OtakuQuiz chrome
// (account menu, streak popover) opens /anime/profile, the OtakuQuiz passport. As on kpopquiz.org, /profile and /me resolve to the one
// personal passport: /me owns the page and its auth (a guest gets the passport invitation, never the data). Noindex.
import { redirect } from 'next/navigation';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My profile',
  robots: { index: false, follow: false },
};

export default function MyProfilePage(): never {
  redirect('/me');
}
