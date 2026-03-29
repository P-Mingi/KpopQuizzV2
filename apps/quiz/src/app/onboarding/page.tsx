import { Suspense } from 'react';

import { OnboardingForm } from './onboarding-form';

export default function OnboardingPage(): React.ReactElement {
  return (
    <Suspense fallback={
      <div className="max-w-sm mx-auto mt-20 px-4">
        <div className="bg-surface-primary rounded-lg border border-border-light p-6 text-center">
          <div className="w-5 h-5 border-2 border-border-light border-t-accent-pink rounded-full animate-spin mx-auto" />
        </div>
      </div>
    }>
      <OnboardingForm />
    </Suspense>
  );
}
