// Otakudle One Piece, row 55: /fr/otakudle/one-piece. With the flag off: a 404, as any unknown URL.
import { notFound } from 'next/navigation';

import { DleGamePage } from '@/components/hub/dle/dle-game-page';
import { gameMetadata } from '@/lib/dle/page-meta';
import { dleOpen } from '@/lib/site/hub/daily-guess';

import type { Metadata } from 'next';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  if (!dleOpen()) notFound();
  return gameMetadata('otakudle-one-piece', 'fr');
}

export default function Page(): Promise<React.ReactElement> {
  if (!dleOpen()) notFound();
  return DleGamePage({ game: 'otakudle-one-piece', locale: 'fr' });
}
