'use client';

import { UxButton } from '@/components/ux-v1/button';
import { useSignIn } from '@/components/ux-v1/sign-in-sheet';

interface HubSignInProps {
  readonly label: string;
  /** Title and line of the sign-in sheet the shell already has. */
  readonly sheetTitle: string;
  readonly sheetSub: string;
}

/** The sign-in button of the network page: opens the shell's sign-in sheet (UxProviders), the same one as everywhere. */
export function HubSignIn({ label, sheetTitle, sheetSub }: HubSignInProps): React.ReactElement {
  const signIn = useSignIn();
  return (
    <UxButton size="lg" aria-haspopup="dialog" onClick={() => signIn({ title: sheetTitle, sub: sheetSub })}>
      {label}
    </UxButton>
  );
}
