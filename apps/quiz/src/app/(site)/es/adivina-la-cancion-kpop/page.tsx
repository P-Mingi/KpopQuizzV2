import { notFound } from 'next/navigation';

import { BlindtestLanding, landingMetadata } from '@/components/blindtest/ux-v1/landing';
import { isUxV12 } from '@/lib/ux-v12';

import type { Metadata } from 'next';

// V12 blindtest landing /es/adivina-la-cancion-kpop (Spanish), SYSTEM.md 4. Behind isUxV12(): with the
// flag off the route answers 404 and has no metadata (and the middleware does not
// know the path at all). Static/ISR like /blindtest: every read is cookie-free.
export const revalidate = 3600;

export function generateMetadata(): Metadata {
  return isUxV12() ? landingMetadata('es') : {};
}

export default function AdivinaLaCancionKpopPage(): React.ReactElement {
  if (!isUxV12()) notFound();
  return <BlindtestLanding lang="es" />;
}
