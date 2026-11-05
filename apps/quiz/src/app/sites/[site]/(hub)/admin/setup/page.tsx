// ADMIN-2: the setup page of the one admin, at /<ADMIN_PATH>/setup: the door first (404 without it), then the shared TOTP setup page, open only
// while the owner's switch ADMIN_MFA_ENROL_OPEN=1 is on (lib/admin/guard.ts).
import { AdminMfaPage } from '@/components/admin/mfa/mfa-page';
import { requireAdminDoor } from '@/lib/admin/door-guard';

export default async function HubAdminSetupPage(): Promise<React.ReactElement> {
  const door = await requireAdminDoor();
  return AdminMfaPage({ step: 'setup', door });
}
