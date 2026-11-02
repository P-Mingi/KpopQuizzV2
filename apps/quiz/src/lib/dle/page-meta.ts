// Daily games step 4: the metadata of the pages of the Terrier, from the reads the pages themselves make (cached): a page says index only when its game answers (rule 9: a page without its content is noindex).
import { dleGame } from './games';
import { getDleDay, getDlePool } from './read';
import { BURROW_SEO, GAME_SEO, dleMetadata } from './seo';
import { DAILY_PATH, builtGames } from './games';

import type { DleGameId } from './games';
import type { DleLocale } from './types';
import type { Metadata } from 'next';

const ogImage = (game: DleGameId, locale: DleLocale, r?: string): string =>
  `/api/og/dle?game=${game}&locale=${locale}${r ? `&r=${r}` : ''}`;

export async function burrowMetadata(locale: DleLocale): Promise<Metadata> {
  const days = await Promise.all(builtGames().map((g) => getDleDay(g.id)));
  return dleMetadata(DAILY_PATH, locale, BURROW_SEO, days.some(Boolean), ogImage(builtGames()[0]!.id, locale));
}

export async function gameMetadata(game: DleGameId, locale: DleLocale, r?: string): Promise<Metadata> {
  const seo = GAME_SEO[game];
  if (!seo) return {};
  const [day, pool] = await Promise.all([getDleDay(game), getDlePool(game)]);
  return dleMetadata(dleGame(game).path, locale, seo, !!day && !!pool && pool.entities.length > 0, ogImage(game, locale, r));
}
