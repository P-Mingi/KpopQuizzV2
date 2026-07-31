'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { useReaderLens } from '@/components/verse/reader-lens';

/** W4.3 - shows a "Curate space" link to curators+ only. Keeps the space ISR (client
 * check via the space-scoped can-edit endpoint). Lens-aware (V-MODES): the studio's
 * simulated reader render hides it like the real logged-out render does. */
export function CurateLink({ groupSlug }: { groupSlug: string }): React.ReactElement | null {
  const [show, setShow] = useState(false);
  const { lensRef, lensed } = useReaderLens();
  useEffect(() => {
    fetch(`/api/verse/can-edit?group=${encodeURIComponent(groupSlug)}`).then((r) => (r.ok ? r.json() : null)).then((d) => setShow(!!d?.canEdit)).catch(() => {});
  }, [groupSlug]);
  // The probe span always mounts so the lens check has a node to walk from
  // (the hook samples its ref once on mount).
  return (
    <span ref={lensRef as React.RefObject<HTMLSpanElement>} className="contents">
      {show && !lensed ? (
        <Link href={`/verse/${groupSlug}/curate`} className="rounded-full border px-3 py-1.5 text-xs font-semibold text-secondary no-underline transition-colors hover:text-primary" style={{ borderColor: 'var(--verse-line)' }}>
          Curate space
        </Link>
      ) : null}
    </span>
  );
}
