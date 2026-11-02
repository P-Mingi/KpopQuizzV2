'use client';

// CR-021 (owner decision of 2026-11-02): the footer's Credits link. /credits exists only while an image in use on the site needs a credit (CC BY,
// CC BY-SA), so the link appears only then. The footer asks /api/site-credits once per session after the page has loaded: nothing is drawn on the
// server, so the served HTML of every page is the same whether or not a credit exists (kpopquiz.org's pages stay byte for byte as they were). Fail
// closed: a failed or malformed answer draws nothing.
import Link from 'next/link';
import { useEffect, useState } from 'react';

const BASE_PATH = process.env.__NEXT_ROUTER_BASEPATH || '';
const KEY = 'kpq-site-credits';

/** The answer of the API as a boolean, from the session's memory when it has one. Never throws. */
export async function loadShowCredits(
  fetchImpl: typeof fetch = fetch,
  storage: Pick<Storage, 'getItem' | 'setItem'> | null = typeof sessionStorage === 'undefined' ? null : sessionStorage,
  base: string = BASE_PATH,
): Promise<boolean> {
  try {
    const kept = storage?.getItem(KEY) ?? null;
    if (kept === '1' || kept === '0') return kept === '1';
  } catch { /* storage blocked: ask */ }
  try {
    const res = await fetchImpl(`${base}/api/site-credits`, { credentials: 'omit' });
    if (!res.ok) return false;
    const body = (await res.json()) as { show?: unknown };
    const show = body.show === true;
    try { storage?.setItem(KEY, show ? '1' : '0'); } catch { /* storage blocked */ }
    return show;
  } catch {
    return false;
  }
}

export function UxCreditsLink(): React.ReactElement | null {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let live = true;
    void loadShowCredits().then((v) => { if (live) setShow(v); });
    return () => { live = false; };
  }, []);
  return show ? <Link href="/credits" prefetch={false}>Credits</Link> : null;
}
