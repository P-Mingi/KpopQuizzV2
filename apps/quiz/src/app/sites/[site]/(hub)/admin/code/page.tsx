// ADMIN-2: the code page of the one admin, at /<ADMIN_PATH>/code. The door first (404 without it), then the shared TOTP page, which answers 404 to
// anyone requireAdmin('mfa') refuses. `?next=` is the address the admin asked for before the code was due again: validated on the server
// (safeAdminNext: an internal path under the secret address, never an external URL) and handed to the form as a prop.
import { AdminMfaPage } from '@/components/admin/mfa/mfa-page';
import { requireAdminDoor } from '@/lib/admin/door-guard';
import { safeAdminNext } from '@/lib/admin/paths';

interface CodeProps { searchParams?: Promise<{ next?: string | string[] }> }

export default async function HubAdminCodePage({ searchParams }: CodeProps): Promise<React.ReactElement> {
  const door = await requireAdminDoor();
  const raw = (await searchParams)?.next;
  const asked = safeAdminNext(Array.isArray(raw) ? raw[0] : raw, door.prefix);
  return AdminMfaPage({ step: 'code', door: { prefix: door.prefix, next: asked ?? door.next } });
}
