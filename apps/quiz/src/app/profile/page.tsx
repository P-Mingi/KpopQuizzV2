import Link from 'next/link';
import { redirect } from 'next/navigation';

import { createServerClient } from '@/lib/supabase/server';
import { getProfileById } from '@/lib/db/queries/profiles';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My profile',
  description: 'Your KpopQuiz profile, stats, and quizzes.',
  robots: { index: false, follow: false },
};

export default async function MyProfilePage(): Promise<React.ReactElement> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const profile = await getProfileById(user.id);
    if (profile) {
      // Delegate to the canonical /u/[username] profile view.
      redirect(`/u/${profile.username}`);
    }
    // Authenticated but no profile yet - push through onboarding.
    redirect('/onboarding');
  }

  // Signed out: show a sign-in prompt.
  return (
    <div className="pt-10 md:pt-16 pb-8 flex flex-col items-center text-center max-w-[440px] mx-auto">
      <div className="w-20 h-20 rounded-full bg-accent-bg border-2 border-accent flex items-center justify-center mb-4">
        <svg width="32" height="32" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="7" r="3.5" stroke="var(--accent)" strokeWidth="1.5" />
          <path
            d="M4 17C4 14 6.5 12 10 12C13.5 12 16 14 16 17"
            stroke="var(--accent)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <h1 className="text-[22px] font-bold text-primary">Sign in to see your profile</h1>
      <p className="text-sm text-secondary mt-2 max-w-xs">
        Track your XP, save your favorites, and climb the hall of fame.
      </p>

      <Link
        href="/login"
        className="mt-6 w-full max-w-[260px] py-3.5 rounded-2xl bg-accent text-white text-[15px] font-bold active:scale-[0.98] transition-transform"
      >
        Sign in
      </Link>

      <p className="text-[11px] text-ghost mt-4">
        New here?{' '}
        <Link href="/login" className="text-accent font-medium hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
