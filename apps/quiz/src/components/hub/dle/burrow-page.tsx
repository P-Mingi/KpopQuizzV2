// Daily games step 4: the page of the Terrier, /daily and /fr/daily (board Main.dc.html, v2 sections 2 and 11). Server component: it reads what is public (the number of the day, the stats above their floor, yesterday's answers) and hands it to the
// two columns. It fails closed: no read, no number, the page keeps its two games and every image keeps the colours of the game.
import { siteHasCredits } from '@/lib/credits/site-credits';
import { burrowGamesJsonLd, breadcrumbJsonLd } from '@/lib/dle/seo';
import { dleCopy, gameCopy } from '@/lib/dle/copy';
import { DAILY_PATH, builtGames, localePath } from '@/lib/dle/games';
import { getAnimeSeriesSlugs, getDleDay, getDleImages, getKpopGroupSlugs, quizLinksOf } from '@/lib/dle/read';

import { parentName } from './dle-avatar';
import { BurrowBoard } from './burrow-board';
import { DleChrome } from './dle-chrome';
import { DleJsonLd } from './dle-game-page';

import type { BurrowGameFacts } from './burrow-board';
import type { DleGameId } from '@/lib/dle/games';
import type { DleLocale } from '@/lib/dle/types';

export async function burrowFacts(): Promise<Readonly<Partial<Record<DleGameId, BurrowGameFacts>>>> {
  const days = await Promise.all(builtGames().map(async (g) => [g.id, await getDleDay(g.id)] as const));
  const out: Partial<Record<DleGameId, BurrowGameFacts>> = {};
  for (const [id, d] of days) {
    if (d) out[id] = { gameNo: d.game_no, stats: d.stats, yesterday: d.yesterday ? { gameNo: d.yesterday.game_no, answer: d.yesterday.answer } : null };
  }
  return out;
}

export async function BurrowPage({ locale }: { locale: DleLocale }): Promise<React.ReactElement> {
  const t = dleCopy(locale);
  const [facts, images, kpopSlugs, animeSlugs, showCredits] = await Promise.all([burrowFacts(), getDleImages(), getKpopGroupSlugs(), getAnimeSeriesSlugs(), siteHasCredits()]);
  const quizLinks: Record<string, string> = {};
  for (const g of builtGames()) {
    const a = facts[g.id]?.yesterday?.answer;
    const group = a ? parentName(g, gameCopy(g.id, locale).subKey, a.attrs) : '';
    // A game of one series knows its slug: its quiz link never waits for the read of the series titles.
    if (group) Object.assign(quizLinks, quizLinksOf(g.universe, [group], g.series ? { [group]: g.series.slug } : g.universe === 'anime' ? animeSlugs : kpopSlugs));
  }
  const label = new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date());
  return (
    <DleChrome locale={locale} enPath={DAILY_PATH} current showCredits={showCredits}>
      <DleJsonLd data={[burrowGamesJsonLd(locale), breadcrumbJsonLd([{ name: t.navBurrow, path: localePath(DAILY_PATH, locale) }])]} />
      <BurrowBoard locale={locale} dateLabel={label.charAt(0).toUpperCase() + label.slice(1)} facts={facts} images={images} quizLinks={quizLinks} />
    </DleChrome>
  );
}
