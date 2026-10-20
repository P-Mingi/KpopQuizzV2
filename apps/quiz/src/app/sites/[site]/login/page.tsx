'use client';

import { LoginBody } from '@/components/passport-ui/login-body';

// Run O1 twin (rule 18) of apps/quiz/src/app/(site)/login/page.tsx, rows 19, H-6: the body is the shared LoginBody
// (components/passport-ui/login-body.tsx), which reads the words of this site from the registry.
export default function LoginPage(): React.ReactElement {
  return <LoginBody />;
}
