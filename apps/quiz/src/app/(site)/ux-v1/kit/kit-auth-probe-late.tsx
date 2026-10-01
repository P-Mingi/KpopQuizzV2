'use client';

import { Suspense, useEffect } from 'react';
import dynamic from 'next/dynamic';

import { useMe } from '@/lib/auth/use-me';

// The probe is server-rendered like any page island, but on the client its code is
// only fetched once the shared /api/auth/me cache is filled (MeReady below), and it
// sits in its own Suspense boundary, so the rest of the page hydrates first and the
// probe hydrates afterwards: the order a page island meets in real pages (P4 request
// 3). On the server there is nothing to wait for.
let markReady: (() => void) | null = null;
const meReady: Promise<void> = typeof window === 'undefined'
  ? Promise.resolve()
  : new Promise<void>((resolve) => { markReady = resolve; });

const KitAuthProbe = dynamic(() => meReady.then(() => import('./kit-auth-probe')).then((m) => m.KitAuthProbe));

function MeReady(): null {
  const me = useMe();
  useEffect(() => { if (me !== null) markReady?.(); }, [me]);
  return null;
}

export function KitAuthProbeLate(): React.ReactElement {
  return (
    <>
      <MeReady />
      <Suspense fallback={null}><KitAuthProbe /></Suspense>
    </>
  );
}
