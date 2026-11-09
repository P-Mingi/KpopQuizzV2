'use client';

// The one <Analytics /> of the site, from @vercel/analytics/next (the same package as before: it groups the
// pages by route, so /q/[slug] is one line in the dashboard) with the filter of lib/analytics-filter.ts.
// A client component because beforeSend is a function and the root layout is a server component.
// Also hosts the first-party Web Vitals reporter, behind NEXT_PUBLIC_WEB_VITALS (OFF: nothing rendered, nothing shipped).
import { Analytics } from '@vercel/analytics/next';
import dynamic from 'next/dynamic';

import { beforeSend } from '@/lib/analytics-filter';

const VITALS_ON = process.env.NEXT_PUBLIC_WEB_VITALS === '1' || process.env.NEXT_PUBLIC_WEB_VITALS === 'true';
const WebVitals = VITALS_ON ? dynamic(() => import('./web-vitals-reporter'), { ssr: false }) : null;

export function AnalyticsMount(): React.ReactElement {
  return (
    <>
      <Analytics beforeSend={beforeSend} />
      {WebVitals ? <WebVitals /> : null}
    </>
  );
}
