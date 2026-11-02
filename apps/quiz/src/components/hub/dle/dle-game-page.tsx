// Daily games step 4: a game's page (board Kpopdle.dc.html, v2 sections 6 and 11.3): the banner, the marquee, the game, then the guide Google reads: yesterday's answer, how to play and the columns in a fold kept in the HTML, the answer
// block, the pool in clear, the hop to the other game. Server component. A game with no pool (off, or a failed read) keeps the guide and says it is not available; the metadata then says noindex.
import { siteHasCredits } from '@/lib/credits/site-credits';
import { jsonLdString } from '@/lib/seo/json-ld';
import { blindLinksOf, getAnimeSeriesSlugs, getBlindtestSlugs, getDleDay, getDleImages, getDlePictures, getDlePool, getKpopGroupSlugs, quizLinksOf } from '@/lib/dle/read';
import { dleCopy, gameCopy, valueLabel } from '@/lib/dle/copy';
import { DAILY_PATH, builtGames, dleGame, localePath } from '@/lib/dle/games';
import { breadcrumbJsonLd, gameAnswerBlock, gameJsonLd, itemListJsonLd } from '@/lib/dle/seo';
import { burrowHref, otherWorld, worldHref, worldOf } from '@/lib/dle/worlds';
import { withBasePath } from '@/lib/site/base-path';
import { REGISTRY } from '@/lib/site/registry';

import { firstValue, parentName } from './dle-avatar';
import { DleChrome } from './dle-chrome';
import { dleMarquee } from './dle-font';
import { DleGame } from './dle-game';
import { D, Ic, Spark, libraryIcon } from './dle-icons';
import { DleGameTools } from './dle-tools';

import type { DleGameId } from '@/lib/dle/games';
import type { DleLocale, DlePool } from '@/lib/dle/types';

/** The pool in clear, by group (v2 section 11.3): a real table, one row per group, in the HTML. */
export function poolByGroup(pool: DlePool, subKey: string, other?: string, shown: (group: string) => string = (g) => g): readonly { readonly group: string; readonly names: readonly string[] }[] {
  const groups = new Map<string, string[]>();
  const rest: string[] = [];
  for (const e of pool.entities) {
    const v = e.attrs[subKey];
    const g = v?.p?.[0] ?? firstValue(v?.v);
    // A character with no value in the sub column (a game of one series has a few) goes to the last row when the game names one, else out of the table as it always did.
    if (!g) { rest.push(e.name); continue; }
    groups.set(g, [...(groups.get(g) ?? []), e.name]);
  }
  const rows = [...groups.entries()].map(([group, names]) => ({ group: shown(group), names })).sort((a, b) => a.group.localeCompare(b.group, 'en', { sensitivity: 'base' }));
  return other && rest.length ? [...rows, { group: other, names: rest }] : rows;
}

export function DleJsonLd({ data }: { data: readonly Record<string, unknown>[] }): React.ReactElement {
  return <>{data.map((d, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(d) }} />)}</>;
}

export async function DleGamePage({ game, locale }: { game: DleGameId; locale: DleLocale }): Promise<React.ReactElement> {
  const t = dleCopy(locale);
  const g = dleGame(game);
  const w = gameCopy(game, locale);
  const world = worldOf(game);
  const [day, pool, images, pictures, slugs, blindSlugs, showCredits] = await Promise.all([getDleDay(game), getDlePool(game), getDleImages(), getDlePictures(g.photoKind), world.universe === 'anime' ? getAnimeSeriesSlugs() : getKpopGroupSlugs(), world.universe === 'kpop' ? getBlindtestSlugs() : Promise.resolve({}), siteHasCredits()]);
  // The banner of the page's own slot when the admin has one (banner:otakudle/one-piece), else the world's.
  const banner = images[`banner:${g.path.slice(1)}`] ?? images[world.bannerSlot];
  const other = otherWorld(world);
  const hop = worldHref(other, locale);
  const words = w.marquee(day?.game_no ?? 0).filter((x) => day || !/\b0\b/.test(x));
  const groups = pool ? poolByGroup(pool, w.subKey, w.poolOther, (x) => valueLabel(w.subKey, x, locale, g.series ? { series: true } : undefined)) : [];
  // The quiz links are looked up by the names as stored; the table shows them in the words of the language.
  const groupNames = pool ? poolByGroup(pool, w.subKey).map((x) => x.group) : [];
  // A game of one series knows its series and its slug: no read of the series titles decides whether its quiz link exists.
  const quizLinks = g.series ? quizLinksOf('anime', [g.series.name], { [g.series.name]: g.series.slug }) : quizLinksOf(world.universe, groupNames, slugs);
  // P5 (CR-025), link 3: "TWICE blind test" next to "TWICE quiz" after a win, only for a K-pop group whose playlist can be played (otherwise no link).
  const blindLinks = world.universe === 'kpop' ? blindLinksOf(groupNames, blindSlugs) : {};
  const yesterday = day?.yesterday ?? null;
  const yGroup = yesterday ? parentName(g, w.subKey, yesterday.answer.attrs) : '';
  const yShown = g.series ? yGroup : valueLabel(w.subKey, yGroup, locale);
  // The games of one series, offered as two tiles on the page of Otakudle across all series (Plan.dc.html, link 8).
  const seriesGames = g.series ? [] : builtGames().filter((x) => x.series && worldOf(x.id) === world);
  const universeGames = world.modes.flatMap((m) => (m.game ? [m.game] : []));
  const rules = Object.entries(w.columns).filter(([, c]) => c.near && c.source);
  return (
    <DleChrome
      locale={locale} enPath={g.path} className={`hub-dle-game hub-dle-${world.tone} ${dleMarquee.variable}`} showCredits={showCredits}
      tools={<DleGameTools locale={locale} enPath={g.path} game={game} universeGames={universeGames} />}
    >
      <DleJsonLd data={[
        gameJsonLd(game, locale),
        breadcrumbJsonLd([
          { name: t.navBurrow, path: localePath(DAILY_PATH, locale) },
          ...(g.series ? [{ name: g.brand, path: localePath(dleGame('otakudle').path, locale) }] : []),
          { name: `${g.brand} ${g.guess[locale]}`, path: localePath(g.path, locale) },
        ]),
        ...(pool ? [itemListJsonLd(w.poolTitle, pool.entities.map((e) => ({ name: e.name })))] : []),
      ]} />
      <figure className={`hub-dle-banner${banner ? ' hub-dle-banner-img' : ''}`}>
        {banner ? (
          <>
            {/* The largest element of the page: the WebP made at upload, at the right width, loaded first (v2 sections 6 and 11.12). */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={banner.src} srcSet={banner.mid ? `${banner.mid} 400w, ${banner.src} 1920w` : undefined} sizes="100vw" alt="" fetchPriority="high" decoding="async" style={{ objectPosition: banner.position }} />
            <span aria-hidden="true" className="hub-dle-banner-fade" />
          </>
        ) : <span aria-hidden="true" className="hub-dle-banner-empty" />}
      </figure>
      <div aria-hidden="true" className="hub-dle-marq">
        <div className="hub-dle-marq-track">
          {[...words, ...words, ...words, ...words].map((x, i) => <span key={i}>{x}<Spark /></span>)}
        </div>
      </div>
      <main id="main" tabIndex={-1} className="hub-dle-main">
        <DleGame
          locale={locale} game={game} gameNo={day?.game_no ?? null} stats={day?.stats ?? null} pool={pool} pictures={pictures}
          quizLinks={quizLinks} blindLinks={blindLinks} kpopName={REGISTRY[world.universe].brand.name}
        />
        {seriesGames.length ? (
          <nav aria-labelledby="dle-series-h" className="hub-dle-seriesnav">
            <h2 id="dle-series-h">{t.seriesTilesTitle}</h2>
            <ul>
              {seriesGames.map((x) => (
                <li key={x.id}>
                  <a href={withBasePath(localePath(x.path, locale))} className="hub-dle-seriestile">
                    <span aria-hidden="true" className="hub-dle-seriestile-ic"><Ic d={libraryIcon(world.modes.find((m) => m.game === x.id)?.icon ?? 'star')} size={28} width={1.9} /></span>
                    <span className="hub-dle-seriestile-text"><strong>{x.series!.name}</strong><small>{x.guess[locale]}</small></span>
                    <Ic d={D.arrowRight} size={20} width={2.2} />
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
        <section aria-label={w.howTitle} className="hub-dle-guide">
          {yesterday ? (w.yesterdayShow ? (
            // A game with spoilers: closed until a click, and in the HTML (a native fold, v2 sections 2 and 11.3).
            <details className="hub-dle-yfold">
              <summary><span>{w.yesterdayLine}</span> <span className="hub-dle-yshow">{w.yesterdayShow}</span></summary>
              <p className="hub-dle-yesterday">
                <strong>{yesterday.answer.name}</strong>{yShown ? ` (${yShown})` : null}
                {quizLinks[yGroup] ? <> · <a href={quizLinks[yGroup]}>{t.quizOf(yShown)}</a></> : null}
              </p>
            </details>
          ) : (
            <p className="hub-dle-yesterday">
              {w.yesterdayLine} <strong>{yesterday.answer.name}</strong>{yShown ? ` (${yShown})` : null}
              {quizLinks[yGroup] ? <> · <a href={quizLinks[yGroup]}>{t.quizOf(yShown)}</a></> : null}
            </p>
          )) : null}
          <details className="hub-dle-howto">
            <summary>
              <span><Ic d={D.help} size={20} /><h2>{w.howTitle}</h2></span>
              <Ic d={D.chev} size={20} className="hub-dle-chev" />
            </summary>
            <div>
              <p>{w.how1}</p>
              <p>{w.how2}</p>
              <div className="hub-dle-tablewrap">
                <table className="hub-dle-table">
                  <thead><tr><th scope="col">{t.thCell}</th><th scope="col">{t.thNear}</th><th scope="col">{t.thSource}</th></tr></thead>
                  <tbody>{rules.map(([k, c]) => <tr key={k}><td><strong>{c.label}</strong></td><td>{c.near}</td><td>{c.source}</td></tr>)}</tbody>
                </table>
              </div>
            </div>
          </details>
          {pool && day ? <p className="hub-dle-answer">{gameAnswerBlock(game, locale, pool.entities.length, day.date)}</p> : null}
          {groups.length ? (
            <details className="hub-dle-howto">
              <summary>
                <span><Ic d={libraryIcon('group')} size={20} /><h2>{w.poolTitle}</h2></span>
                <Ic d={D.chev} size={20} className="hub-dle-chev" />
              </summary>
              <div>
                <div className="hub-dle-tablewrap">
                  <table className="hub-dle-table">
                    <thead><tr><th scope="col">{w.poolHead[0]}</th><th scope="col">{w.poolHead[1]}</th></tr></thead>
                    <tbody>{groups.map((x) => <tr key={x.group}><td><strong>{x.group}</strong></td><td>{x.names.join(', ')}</td></tr>)}</tbody>
                  </table>
                </div>
              </div>
            </details>
          ) : null}
        </section>
        {hop ? (
          <nav aria-label={t.gamesLabel} className="hub-dle-hopnav">
            <a href={withBasePath(hop)} className={`hub-dle-hop hub-dle-${other.tone}`}>
              <span aria-hidden="true" className="hub-dle-hop-ic"><Ic d={libraryIcon(other.hopIcon)} size={30} width={1.9} /></span>
              <strong>{other.brand}</strong>
              <small>{other.what[locale]}</small>
            </a>
          </nav>
        ) : null}
        <p className="hub-dle-sr"><a href={withBasePath(burrowHref(locale))}>{t.navBurrow}</a></p>
      </main>
    </DleChrome>
  );
}

