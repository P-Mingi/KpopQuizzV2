// Run O1 twin (rule 18) of apps/quiz/src/app/(site)/onboarding/page.tsx, row 20: the shared OnboardingForm with the words of
// this site (copy/anime/p1.ts, onboarding.*). create-profile makes the profile and the membership of this site with the `via`.
import { Suspense } from 'react';

import { OnboardingForm } from '@/app/(site)/onboarding/onboarding-form';
import { onboardingWords } from '@/lib/passport-ui/words';
import { SITE } from '@/lib/site/registry';

import type { Metadata } from 'next';

export function generateMetadata(): Metadata {
  return { title: `${onboardingWords(SITE.id)?.title ?? 'Pick a username'} | ${SITE.brand.name}`, robots: { index: false, follow: true } };
}

export default function OnboardingPage(): React.ReactElement {
  return (
    <Suspense fallback={
      <div className="max-w-sm mx-auto mt-20 px-4">
        <div className="bg-primary rounded-lg border border-default p-6 text-center">
          <div className="w-5 h-5 border-2 border-default border-t-accent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    }>
      <OnboardingForm words={onboardingWords(SITE.id)} />
    </Suspense>
  );
}
