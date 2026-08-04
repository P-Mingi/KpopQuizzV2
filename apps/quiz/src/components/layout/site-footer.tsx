'use client';

import { usePathname } from 'next/navigation';

import { VerseFooter } from '@/components/verse/verse-footer';
import { worldForPath, isBuilderCanvas } from '@/lib/world';

// V-IDENTITY step 2 - the footer picker (mirrors the header pattern). The Play
// footer is passed in server-rendered and returned UNTOUCHED on Play routes; Verse
// routes get the Verse-voice footer. Chrome only; no head-tag change.
export function SiteFooter({ play }: { play: React.ReactNode }): React.ReactElement | null {
  const pathname = usePathname();
  if (isBuilderCanvas(pathname)) return null; // chrome-less builder canvas
  const verse = worldForPath(pathname) === 'verse';
  return <>{verse ? <VerseFooter /> : play}</>;
}
