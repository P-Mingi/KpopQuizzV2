// ADMIN-2 (owner, 2026-10-30): the server side of the secret door (lib/admin/door.ts is the edge-safe half). A request is "at the door" only
// when the middleware set the door header with the value derived from ADMIN_PATH; a direct request to the internal tree, a forged header
// and a request on a deployment without ADMIN_PATH are not. Every page and layout of the hub admin tree starts with requireAdminDoor():
// notFound() before any session is read.
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

import { ADMIN_DOOR_HEADER, ADMIN_DOOR_NEXT_HEADER, adminDoorPrefix, isAdminDoorValue } from './door';
import { safeAdminNext } from './paths';

export interface AdminDoor {
  /** '/<ADMIN_PATH>': the address of the admin, for the links and the redirects the admin's own pages build. */
  readonly prefix: string;
  /** The address the visitor asked for (behind the prefix), or null. */
  readonly next: string | null;
}

/** The door of this request, or null. Never throws: outside a request (a unit test, a build) there is no door. */
export async function adminDoorOfRequest(): Promise<AdminDoor | null> {
  try {
    const prefix = adminDoorPrefix();
    if (prefix === null) return null;
    const h = await headers();
    if (!(await isAdminDoorValue(h.get(ADMIN_DOOR_HEADER)))) return null;
    return { prefix, next: safeAdminNext(h.get(ADMIN_DOOR_NEXT_HEADER), prefix) };
  } catch {
    return null;
  }
}

/** The door of this request, else the 404 of the site. Called first by every layout and page of the hub admin tree. */
export async function requireAdminDoor(): Promise<AdminDoor> {
  const door = await adminDoorOfRequest();
  if (!door) notFound();
  return door;
}
