import { redirect } from 'next/navigation';
import nextDynamic from 'next/dynamic';

import { createServerClient } from '@/lib/supabase/server';
import { NotificationsCenter } from '@/components/notifications/notifications-center';
import { UxPage } from '@/components/ux-v1/page';
import { UX_V1 } from '@/lib/ux-v1';

import type { Metadata } from 'next';

// Notification center (Workstream M, M1.10). Personal + auth-gated, so dynamic
// per-user. Public/static pages are untouched; the unread badge lives in the nav
// as a client island.
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Notifications',
  robots: { index: false, follow: false },
};

// UX v11 (P11): the re-skinned center in its own lazily loaded chunk; flag off
// never loads it and renders the live center below unchanged.
const UxNotifications = UX_V1
  ? nextDynamic(() => import('@/components/notifications/ux-v1/notifications-page').then((m) => m.UxNotifications))
  : null;

export default async function NotificationsPage(): Promise<React.ReactElement> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  if (UxNotifications) return <UxPage width="text" className="p11-page"><UxNotifications /></UxPage>;
  return <NotificationsCenter />;
}
