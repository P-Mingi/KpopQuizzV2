'use client';

import { useEffect, useRef, useState } from 'react';

// V-POLISH-2 B2 - THE READER LENS. Inside the studio, curators preview their
// draft as the OWNER, so every affordance resolves to Edit/Lock chrome and the
// page they ship is never the page a first-time reader meets. The lens marks
// the preview subtree with [data-reader-lens]; affordance components mounted
// under it render their logged-out branch, so what the lens shows IS the real
// logged-out render (the verify law), not a stripped approximation.
export function useReaderLens(): { lensRef: React.RefObject<HTMLElement | null>; lensed: boolean } {
  const lensRef = useRef<HTMLElement | null>(null);
  const [lensed, setLensed] = useState(false);
  useEffect(() => {
    setLensed(!!lensRef.current?.closest('[data-reader-lens]'));
  }, []);
  return { lensRef, lensed };
}
