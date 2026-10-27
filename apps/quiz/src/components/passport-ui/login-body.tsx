// Run O1, lot (b), P1 (rule 18): the body of /login on a world site is the shared kpop body (components/login/login-body)
// with the words of this site, read from the registry here; the shared body itself never imports the registry.
import { LoginBody as SharedLoginBody } from '@/components/login/login-body';
import { signInWords } from '@/lib/passport-ui/words';
import { privacyNoticeText } from '@/lib/site/hub/network-page';
import { SITE_ID } from '@/lib/site/registry';

import type { SignInWords } from '@/lib/passport-ui/words';

// H1 (owner, 2026-10-24): the sign-in screen carries the short passport notice. The shared body prints `words.privacy` as plain text, so
// the notice rides on that line (its "Privacy Policy" link below it already goes to /privacy, which is the network policy on every site).
export function LoginBody({ words = signInWords(SITE_ID) }: { words?: SignInWords | undefined }): React.ReactElement {
  return <SharedLoginBody words={words ? { ...words, privacy: `${words.privacy} ${privacyNoticeText()}` } : words} />;
}
