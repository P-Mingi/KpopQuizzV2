'use client';

// KpopCards: "Open a demo pack" for a signed-out visitor (Lot 3 point A18): one demo pack per device, drawn and signed by the server. The button goes to the
// opening page (/kpopcards/open/all?demo=1), which draws it; nothing is saved until the visitor signs in (the provider then posts the token). Used by the lobby's
// guest banner and the Help page.
import { useRouter } from 'next/navigation';

import { kcPath } from '@/lib/cards/kc-paths';

import { useCards } from './cards-provider';
import { demoUsed } from './demo-store';

export function OpenDemo({ className = 'btn-primary', id }: { className?: string; id?: string }): React.ReactElement | null {
  const { status, demo, toast } = useCards();
  const router = useRouter();
  if (status !== 'guest' || !demo) return null;
  return (
    <button
      type="button" className={className} {...(id ? { id } : {})}
      onClick={() => {
        if (demoUsed()) { toast('You already opened your demo pack on this device. Sign in to open real packs.'); return; }
        router.push(`${kcPath.open('all')}?demo=1`);
      }}
    >Open a demo pack</button>
  );
}
