'use client';

import { useEffect } from 'react';

import { claimReload, isChunkLoadError, mayReload } from '@/components/blindtest/ux-v1/chunk-reload';
import { isUxV12 } from '@/lib/ux-v12';

interface Props {
  error: Error & { digest?: string };
  reset?: () => void;
}

function sessionStore(): Storage | null {
  try { return window.sessionStorage; } catch { return null; }
}

/**
 * F7a: V12 only, a missing script file under /blindtest (a page the browser kept from
 * an earlier build, see chunk-reload.ts) reloads the page once instead of showing
 * "Something went wrong". Every other error, a second failure, and every error with the
 * flag off are thrown on to the root boundary (app/error.tsx): the same screen, in the
 * same place, as before.
 */
export default function BlindtestError({ error }: Props): null {
  // Decided in the first render (a read only, so a double render agrees): a boundary that
  // throws while it first renders hands the error to the parent boundary.
  const reload = isUxV12() && isChunkLoadError(error) && typeof window !== 'undefined'
    && mayReload(sessionStore(), window.location.pathname, Date.now());
  useEffect(() => {
    if (reload && claimReload(sessionStore(), window.location.pathname, Date.now())) window.location.reload();
  }, [reload]);
  if (!reload) throw error;
  return null;
}
