// ADMIN-1 (owner, 2026-10-30): the TOTP setup page, for a listed admin at aal1 with no verified factor (requireAdmin sends them
// here before any admin page); the 404 of the site for anyone else (components/admin/mfa/mfa-page.tsx). Named by no robots file,
// sitemap, link or nav (lib/admin/paths.ts).
import { AdminMfaPage } from '@/components/admin/mfa/mfa-page';

import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Admin', robots: { index: false, follow: false } };

export default function AdminSetupPage(): Promise<React.ReactElement> {
  return AdminMfaPage({ step: 'setup' });
}
