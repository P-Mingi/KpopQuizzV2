'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

/** W4.3 - shows a "Curate space" link to curators+ only. Keeps the space ISR (client
 * check via the space-scoped can-edit endpoint). */
export function CurateLink({ groupSlug }: { groupSlug: string }): React.ReactElement | null {
  const [show, setShow] = useState(false);
  useEffect(() => {
    fetch(`/api/verse/can-edit?group=${encodeURIComponent(groupSlug)}`).then((r) => (r.ok ? r.json() : null)).then((d) => setShow(!!d?.canEdit)).catch(() => {});
  }, [groupSlug]);
  if (!show) return null;
  return (
    <Link href={`/verse/${groupSlug}/curate`} className="rounded-full border px-3 py-1.5 text-xs font-semibold text-secondary no-underline transition-colors hover:text-primary" style={{ borderColor: 'var(--verse-line)' }}>
      Curate space
    </Link>
  );
}
