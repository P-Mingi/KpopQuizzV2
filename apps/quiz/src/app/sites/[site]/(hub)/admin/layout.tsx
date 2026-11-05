// ADMIN-2 (owner, 2026-10-30; PLAN-ADMIN-2 section 1): the guard layout of the one admin, the internal tree behind the secret address. It answers
// notFound() from above every page of the tree, in this order and before anything is read or shown:
//   1. no door: the request did not come through the middleware's rewrite of /<ADMIN_PATH> (a direct request to this folder, to /admin of the
//      hub, a forged header, a deployment without ADMIN_PATH) -> the 404 of the site;
//   2. no verified, listed admin (requireAdmin('mfa')) -> the same 404.
// Each page keeps its own requireAdminDoor() and requireAdmin(): a layout is not re-run on a client navigation. Nothing of the tree is indexed.
import { notFound } from 'next/navigation';

import { adminDoorOfRequest, requireAdminDoor } from '@/lib/admin/door-guard';
import { requireAdmin } from '@/lib/admin/guard';

import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const noindex = { robots: { index: false, follow: false } };
  if (!(await adminDoorOfRequest())) return noindex;
  const admin = await requireAdmin('check');
  return admin ? { title: 'Admin', ...noindex } : noindex;
}

export default async function HubAdminLayout({ children }: { children: React.ReactNode }): Promise<React.ReactElement> {
  await requireAdminDoor();
  const admin = await requireAdmin('mfa');
  if (!admin) notFound();
  return children as React.ReactElement;
}
