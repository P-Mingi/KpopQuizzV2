import type { Metadata } from 'next';

// V-UPGRADE-1 Phase B: the Verse mirror of Notifications. The page COMPONENT (the
// auth gate + <NotificationsCenter>) is re-exported so the content is identical;
// only the /verse path flips the chrome to Verse. Route-segment config (dynamic)
// and metadata are declared locally because Next forbids re-exporting route config.
// Auth-gated + noindex: nothing to canonicalize, no duplicate-content exposure; out
// of sitemap.
export { default } from '@/app/notifications/page';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Notifications',
  robots: { index: false, follow: false },
};
