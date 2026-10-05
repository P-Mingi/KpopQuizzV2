'use client';

import { useEffect } from 'react';

import { claimReload, isChunkLoadError, mayReload } from '@/components/blindtest/ux-v1/chunk-reload';
import { isUxV12 } from '@/lib/ux-v12';

interface ErrorPageProps {
  error?: Error & { digest?: string };
  reset: () => void;
}

function sessionStore(): Storage | null {
  try { return window.sessionStorage; } catch { return null; }
}

// V12 (F7a, moved here so no route adds an error boundary file with the flag off): a
// missing script file under /blindtest (a page the browser kept from an earlier build,
// see chunk-reload.ts) reloads the page once instead of showing this screen. Every other
// error, a second failure on the same path, and every error with the flag off show the
// screen below, as before.
function shouldReload(error: unknown): boolean {
  return isUxV12() && typeof window !== 'undefined' && window.location.pathname.startsWith('/blindtest')
    && isChunkLoadError(error) && mayReload(sessionStore(), window.location.pathname, Date.now());
}

export default function ErrorPage({ error, reset }: ErrorPageProps): React.ReactElement | null {
  const reload = shouldReload(error);
  useEffect(() => {
    if (reload && claimReload(sessionStore(), window.location.pathname, Date.now())) window.location.reload();
  }, [reload]);
  if (reload) return null;
  return (
    <div className="mt-20 text-center">
      <p className="text-lg font-medium text-primary">Something went wrong</p>
      <p className="text-sm text-secondary mt-2">Please try refreshing the page.</p>
      <button
        onClick={reset}
        className="mt-4 px-6 py-3 rounded-full bg-btn text-white text-sm font-medium cursor-pointer"
      >
        Try again
      </button>
    </div>
  );
}
