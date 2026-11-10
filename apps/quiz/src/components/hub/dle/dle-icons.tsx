// Daily games step 4: the small stroke icons of the Terrier and the game (the paths of the boards; the library is lib/photos/slots.ts). Decorative: the words are beside them.
import { ICON_LIBRARY } from '@/lib/photos/slots';

import type { LiveIcon, LiveIcons } from '@/lib/photos/icons-read';

export const D = {
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  arrowRight: 'M5 12h14M13 6l6 6-6 6',
  check: 'M20 6L9 17l-5-5',
  chev: 'M6 9l6 6 6-6',
  x: 'M18 6L6 18M6 6l12 12',
  help: ICON_LIBRARY.help!,
  stats: 'M4 20V11M10 20V5M16 20v-6M21 20H3',
  sliders: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM9 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  bulb: ICON_LIBRARY.bulb!,
  lock: 'M6 11h12v10H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  up: 'M12 19V5M5 12l7-7 7 7',
  down: 'M12 5v14M5 12l7 7 7-7',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  share: 'M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13',
  eye: ICON_LIBRARY.eye!,
} as const;

const FLAME = 'M12 2c1 4 5 5.5 5 11a5 5 0 0 1-10 0c0-2.4 1.2-4 2.5-5.2.2 1.7 1 2.7 2 3.2-.4-3.4.5-6.4.5-9z';

export function Ic({ d, size = 18, width = 2, className }: { d: string; size?: number; width?: number; className?: string }): React.ReactElement {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={d} />
    </svg>
  );
}

export function Flame({ size = 15, className }: { size?: number; className?: string }): React.ReactElement {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}><path d={FLAME} /></svg>;
}

export function Spark({ size = 13 }: { size?: number }): React.ReactElement {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24"><path d="M12 0C13 8 16 11 24 12 16 13 13 16 12 24 11 16 8 13 0 12 8 11 11 8 12 0Z" fill="currentColor" /></svg>;
}

export function libraryIcon(name: string): string {
  return ICON_LIBRARY[name] ?? ICON_LIBRARY.star!;
}

/**
 * The icon the owner saved for a slot of the admin's "Icônes du jeu" (lib/photos/icons-read.ts), or null: a slot with nothing saved keeps the
 * drawing the page always had, so the pages are byte for byte what they were until a row exists. Type-only import: this file also ships to the browser.
 */
export function savedIcon(icons: LiveIcons | undefined, id: string): LiveIcon | null {
  const i = icons?.[id];
  return i && i.live ? i : null;
}
