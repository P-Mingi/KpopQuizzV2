import Link from 'next/link';

import { OrbitLockup } from './verse-wordmarks';

// V-IDENTITY step 2 - the Verse world header mark: the chosen Orbit + "KpopVerse"
// lockup, linking to the Verse home. "Kpop" takes the ink; "Verse" the violet.
// Rendered by the world chrome only when world === 'verse' (Play keeps its logo).
export function VerseLogo({ height = 22 }: { height?: number }): React.ReactElement {
  return (
    <Link href="/verse" className="inline-flex items-center" aria-label="KpopVerse home">
      <OrbitLockup height={height} color="var(--text-primary)" />
    </Link>
  );
}
