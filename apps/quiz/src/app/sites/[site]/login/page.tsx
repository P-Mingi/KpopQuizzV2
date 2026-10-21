import { LoginBody } from '@/components/passport-ui/login-body';

import type { Metadata } from 'next';

// Run O1 twin (rule 18) of apps/quiz/src/app/(site)/login/page.tsx, rows 19, H-6: the body is the shared LoginBody
// (components/passport-ui/login-body.tsx), which reads the words of this site from the registry.
// Never indexed, whatever NET_INDEXING says (C3; the kpop twin sets it in its login layout). The title takes the template of the site.
export const metadata: Metadata = {
  title: 'Sign In',
  robots: { index: false, follow: true },
};

export default function LoginPage(): React.ReactElement {
  return <LoginBody />;
}
