import type { Metadata } from 'next';

// V-UPGRADE-1 Phase B: the Verse mirror of the personal passport (/me). The page
// COMPONENT is re-exported so the content is identical; only the /verse path flips
// the chrome to Verse. Route-segment config (dynamic) and metadata are declared
// locally because Next forbids re-exporting route config. Auth-gated + noindex, so
// there is nothing to canonicalize and no duplicate-content exposure; out of sitemap.
export { default } from '@/app/(site)/me/page';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'My passport',
  robots: { index: false, follow: false },
};
