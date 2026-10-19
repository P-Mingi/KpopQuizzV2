// Run O1 twin (rule 18) of apps/quiz/src/app/(site)/onboarding/page.tsx, rows 20: copied by scripts/o1/twins-codemod.mjs; kpop modules imported, not copied.
import { Suspense } from 'react';

import { OnboardingForm } from '@/app/(site)/onboarding/onboarding-form';

export default function OnboardingPage(): React.ReactElement {
  return (
    <Suspense fallback={
      <div className="max-w-sm mx-auto mt-20 px-4">
        <div className="bg-primary rounded-lg border border-default p-6 text-center">
          <div className="w-5 h-5 border-2 border-default border-t-accent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    }>
      <OnboardingForm />
    </Suspense>
  );
}
