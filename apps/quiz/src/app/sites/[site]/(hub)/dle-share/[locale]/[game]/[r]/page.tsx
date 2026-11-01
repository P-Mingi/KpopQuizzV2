// Daily games step 4, row 51: a shared result, /kpopdle?r=2-1-3 (v2 section 11.6), reached only through the rewrite of lib/site/routing.ts, which keeps /kpopdle itself static. The same page as the clean address; only its share image differs (bars, the number of
// the day, never the answer), and its canonical is the clean address. /dle-share/... is no public address (BLOCKED_PUBLIC). With the flag off: a 404, as any unknown URL.
import { notFound } from 'next/navigation';

import { DleGamePage } from '@/components/hub/dle/dle-game-page';
import { DLE_GAMES, SHARE_R_PATTERN } from '@/lib/dle/games';
import { gameMetadata } from '@/lib/dle/page-meta';
import { dleOpen } from '@/lib/site/hub/daily-guess';

import type { DleGameId } from '@/lib/dle/games';
import type { DleLocale } from '@/lib/dle/types';
import type { Metadata } from 'next';

export const revalidate = 60;
// The results of a day are not known at build: this page allows them (the layout of app/sites/[site] says false).
export const dynamicParams = true;

const R = new RegExp(`^${SHARE_R_PATTERN}$`);

interface Params { readonly locale: string; readonly game: string; readonly r: string }

function parse(p: Params): { game: DleGameId; locale: DleLocale; r: string } | null {
  const g = DLE_GAMES.find((x) => x.id === p.game && x.built);
  if (!g || (p.locale !== 'en' && p.locale !== 'fr') || !R.test(p.r)) return null;
  return { game: g.id, locale: p.locale, r: p.r };
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const v = parse(await params);
  if (!dleOpen() || !v) notFound();
  return gameMetadata(v.game, v.locale, v.r);
}

export default async function Page({ params }: { params: Promise<Params> }): Promise<React.ReactElement> {
  const v = parse(await params);
  if (!dleOpen() || !v) notFound();
  return DleGamePage({ game: v.game, locale: v.locale });
}
