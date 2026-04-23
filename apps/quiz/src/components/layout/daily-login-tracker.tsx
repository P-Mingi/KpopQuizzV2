'use client';

import { useEffect } from 'react';

/**
 * Invisible component that fires the daily login check on mount.
 * Placed in the root layout. Only runs once per session.
 */
export function DailyLoginTracker() {
  useEffect(() => {
    const key = 'kq_daily_login';
    const today = new Date().toISOString().slice(0, 10);

    // Only call once per day per browser session
    if (sessionStorage.getItem(key) === today) return;

    fetch('/api/auth/daily-login', { method: 'POST' })
      .then((res) => {
        if (res.ok) sessionStorage.setItem(key, today);
      })
      .catch(() => {
        // Silent fail - login tracking is non-critical
      });
  }, []);

  return null;
}
