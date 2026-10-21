// Run O1, lot (b), P1 (rule 18): the body of /login on a world site is the shared kpop body (components/login/login-body)
// with the words of this site, read from the registry here; the shared body itself never imports the registry.
import { LoginBody as SharedLoginBody } from '@/components/login/login-body';
import { signInWords } from '@/lib/passport-ui/words';
import { SITE_ID } from '@/lib/site/registry';

import type { SignInWords } from '@/lib/passport-ui/words';

export function LoginBody({ words = signInWords(SITE_ID) }: { words?: SignInWords | undefined }): React.ReactElement {
  return <SharedLoginBody words={words} />;
}
