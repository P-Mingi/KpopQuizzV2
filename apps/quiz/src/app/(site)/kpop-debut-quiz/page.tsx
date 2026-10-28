import { renderThemePage, themeMetadata } from '@/components/group/ux-v1/theme-page';

import type { Metadata } from 'next';

// General K-pop theme page (SEO phase 1, PR 15): components/group/ux-v1/theme-page.tsx, lib/hubs/general-themes.ts.
export const revalidate = 3600;

export function generateMetadata(): Promise<Metadata> {
  return themeMetadata('kpop-debut-quiz');
}

export default function Page(): Promise<React.ReactElement> {
  return renderThemePage('kpop-debut-quiz');
}
