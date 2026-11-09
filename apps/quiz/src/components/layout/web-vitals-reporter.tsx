'use client';

// Sends each Core Web Vital of the page to /api/vitals (lib/vitals.ts). Loaded only when
// NEXT_PUBLIC_WEB_VITALS is on (components/layout/analytics-mount.tsx), so a build with the flag off ships none of it.
import { useReportWebVitals } from 'next/web-vitals';

import { templateOf, VITAL_METRICS } from '@/lib/vitals';

const BASE_PATH = process.env.__NEXT_ROUTER_BASEPATH || '';

export default function WebVitalsReporter(): null {
  useReportWebVitals((m) => {
    if (!(VITAL_METRICS as readonly string[]).includes(m.name)) return;
    const body = JSON.stringify({
      metric: m.name,
      rating: m.rating,
      template: templateOf(window.location.pathname),
      device: window.innerWidth < 768 ? 'mobile' : 'desktop',
      value: m.name === 'CLS' ? m.value * 1000 : m.value,
    });
    try {
      if (!navigator.sendBeacon(`${BASE_PATH}/api/vitals`, new Blob([body], { type: 'application/json' }))) {
        void fetch(`${BASE_PATH}/api/vitals`, { method: 'POST', body, keepalive: true }).catch(() => {});
      }
    } catch {
      // a lost sample is cheaper than an error
    }
  });
  return null;
}
