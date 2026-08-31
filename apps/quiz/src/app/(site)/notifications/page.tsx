import { redirect } from 'next/navigation';

import { createServerClient } from '@/lib/supabase/server';
import { NotificationsCenter } from '@/components/notifications/notifications-center';

import type { Metadata } from 'next';

// Notification center (Workstream M, M1.10). Personal + auth-gated, so dynamic
// per-user. Public/static pages are untouched; the unread badge lives in the nav
// as a client island.
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Notifications',
  robots: { index: false, follow: false },
};

export default async function NotificationsPage(): Promise<React.ReactElement> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return <NotificationsCenter />;
}
