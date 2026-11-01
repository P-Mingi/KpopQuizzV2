// Daily games step 4, row 47: le Terrier, /fr/daily. With the flag off: a 404, as any unknown URL.
import { notFound } from 'next/navigation';

import { BurrowPage } from '@/components/hub/dle/burrow-page';
import { burrowMetadata } from '@/lib/dle/page-meta';
import { dleOpen } from '@/lib/site/hub/daily-guess';

import type { Metadata } from 'next';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  if (!dleOpen()) notFound();
  return burrowMetadata('fr');
}

export default function Page(): Promise<React.ReactElement> {
  if (!dleOpen()) notFound();
  return BurrowPage({ locale: 'fr' });
}
