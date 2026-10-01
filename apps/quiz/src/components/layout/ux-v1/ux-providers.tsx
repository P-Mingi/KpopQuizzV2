'use client';

import { UxFeedbackProvider } from '@/components/ux-v1/toast';
import { SignInProvider } from '@/components/ux-v1/sign-in-sheet';

import { UxSearchProvider } from './ux-search';

/**
 * Client providers of the v11 shell: toast + live region, the sign-in sheet
 * (useSignIn), the search overlay (useUxSearch, "/" key). Server children pass
 * straight through, so pages stay server-rendered.
 */
export function UxProviders({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <UxFeedbackProvider>
      <SignInProvider>
        <UxSearchProvider>{children}</UxSearchProvider>
      </SignInProvider>
    </UxFeedbackProvider>
  );
}
