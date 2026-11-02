// Daily games step 4, row 46: the Terrier, public address /daily (the rewrite of lib/site/routing.ts: /sites/[site]/daily is the anime handler of the quiz of the day, so its file lives here). With the flag off: a 404, as any unknown URL.
import { notFound } from 'next/navigation';

import { BurrowPage } from '@/components/hub/dle/burrow-page';
import { burrowMetadata } from '@/lib/dle/page-meta';
import { dleOpen } from '@/lib/site/hub/daily-guess';

import type { Metadata } from 'next';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  if (!dleOpen()) notFound();
  return burrowMetadata('en');
}

export default function Page(): Promise<React.ReactElement> {
  if (!dleOpen()) notFound();
  return BurrowPage({ locale: 'en' });
}
