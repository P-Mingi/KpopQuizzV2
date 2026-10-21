'use client';

import { LoginBody } from '@/components/login/login-body';

// The body is shared (components/login/login-body, Run O1 rule 18): an anime or hub /login renders the same component with its words.
export default function LoginPage(): React.ReactElement {
  return <LoginBody />;
}
