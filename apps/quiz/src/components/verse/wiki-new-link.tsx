'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { fetchAffordance } from '@/components/verse/roles/role-affordance';
import { useReaderLens } from '@/components/verse/reader-lens';

// V-MODES step 3 - the wiki index's New page CTA is a builder affordance:
// contributors+ see it (matching /wiki/new's own server gate); readers see
// nothing. Client island so the index stays ISR; lens-aware so the studio's
// reader preview matches the real logged-out render.
export function WikiNewLink({ groupSlug }: { groupSlug: string }): React.ReactElement | null {
  const [show, setShow] = useState(false);
  const { lensRef, lensed } = useReaderLens();

  useEffect(() => {
    // Mirror /wiki/new's own server gate (contributor+; admins pass). canEdit
    // alone is the curator/stage-C bar, stricter than the destination's.
    fetchAffordance(groupSlug)
      .then((a) => setShow(a.canEdit || ['contributor', 'curator', 'space_admin', 'admin'].includes(a.role)))
      .catch(() => {});
  }, [groupSlug]);

  // The probe span always mounts so the lens check has a node to walk from
  // (the hook samples its ref once on mount).
  return (
    <span ref={lensRef as React.RefObject<HTMLSpanElement>} className="contents">
      {show && !lensed ? (
        <Link href={`/verse/${groupSlug}/wiki/new`}
          className="inline-flex min-h-[44px] items-center rounded-xl px-5 text-sm font-bold no-underline"
          style={{ background: 'var(--verse-cta, var(--verse-accent))', color: 'var(--verse-cta-text, var(--verse-accent-text))' }}>
          New page
        </Link>
      ) : null}
    </span>
  );
}
