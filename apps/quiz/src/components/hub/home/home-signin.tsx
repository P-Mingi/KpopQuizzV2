'use client';

// Run O1, lot H2a: the sign-in buttons of the new home. They open the sign-in sheet the shell already has (UxProviders), the same one
// as everywhere on the hub; only the look is the home's (hub-h2-* classes).
import { useSignIn } from '@/components/ux-v1/sign-in-sheet';

interface HomeSignInProps {
  readonly label: string;
  /** Title and line of the sheet. */
  readonly sheetTitle: string;
  readonly sheetSub: string;
  readonly className: string;
}

export function HomeSignIn({ label, sheetTitle, sheetSub, className }: HomeSignInProps): React.ReactElement {
  const signIn = useSignIn();
  return (
    <button type="button" aria-haspopup="dialog" className={className} onClick={() => signIn({ title: sheetTitle, sub: sheetSub })}>
      {label}
    </button>
  );
}
