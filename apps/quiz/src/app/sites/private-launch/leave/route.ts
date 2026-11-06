// Private launch (lib/private-launch/enter.ts): GET /auth/private-launch/leave of the hub and anime builds clears the cookie. A 404 with
// the gate off.
import { handleLeave } from '@/lib/private-launch/enter';
import { SITE_ID } from '@/lib/site/registry';

export const dynamic = 'force-dynamic';

export function GET(): Response {
  return handleLeave({ site: SITE_ID, env: process.env });
}
