'use client';

import { LoginBody } from '@/components/passport-ui/login-body';

// Run O1, lot (b), P1 (rule 18): the body of /login lives in one shared component for the three sites; kpop renders the
// markup this file used to hold, byte for byte (o1-p1-kpop-tree.test.ts).
export default function LoginPage(): React.ReactElement {
  return <LoginBody />;
}
