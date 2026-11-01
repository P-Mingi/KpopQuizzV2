// Daily games step 4: a game's page (board Kpopdle.dc.html, v2 sections 6 and 11.3): the banner, the marquee, the game, then the guide Google reads: yesterday's answer, how to play and the columns in a fold kept in the HTML, the answer
// block, the pool in clear, the hop to the other game. Server component. A game with no pool (off, or a failed read) keeps the guide and says it is not available; the metadata then says noindex.
import { jsonLdString } from '@/lib/seo/json-ld';
import { getDleDay, getDleImages, getDlePictures, getDlePool, getKpopGroupSlugs } from '@/lib/dle/read';
import { dleCopy, gameCopy } from '@/lib/dle/copy';
import { DAILY_PATH, dleGame, localePath } from '@/lib/dle/games';
import { breadcrumbJsonLd, gameAnswerBlock, gameJsonLd, itemListJsonLd } from '@/lib/dle/seo';
import { burrowHref, otherWorld, worldHref, worldOf } from '@/lib/dle/worlds';
import { withBasePath } from '@/lib/site/base-path';
import { homeUrl } from '@/lib/site/hub/home-types';
import { REGISTRY } from '@/lib/site/registry';

import { firstValue } from './dle-avatar';
import { DleChrome } from './dle-chrome';
import { dleMarquee } from './dle-font';
import { DleGame } from './dle-game';
import { D, Ic, Spark, libraryIcon } from './dle-icons';
import { DleGameTools } from './dle-tools';

import type { DleGameId } from '@/lib/dle/games';
import type { DleLocale, DlePool } from '@/lib/dle/types';

/** The pool in clear, by group (v2 section 11.3): a real table, one row per group, in the HTML. */
export function poolByGroup(pool: DlePool, subKey: string): readonly { readonly group: string; readonly names: readonly string[] }[] {
  const groups = new Map<string, string[]>();
  for (const e of pool.entities) {
    const v = e.attrs[subKey];
    const g = v?.p?.[0] ?? firstValue(v?.v);
    if (!g) continue;
    groups.set(g, [...(groups.get(g) ?? []), e.name]);
  }
  return [...groups.entries()].map(([group, names]) => ({ group, names })).sort((a, b) => a.group.localeCompare(b.group, 'en', { sensitivity: 'base' }));
}

export function DleJsonLd({ data }: { data: readonly Record<string, unknown>[] }): React.ReactElement {
  return <>{data.map((d, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(d) }} />)}</>;
}

export async function DleGamePage({ game, locale }: { game: DleGameId; locale: DleLocale }): Promise<React.ReactElement> {
  const t = dleCopy(locale);
  const g = dleGame(game);
  const w = gameCopy(game, locale);
  const world = worldOf(game);
  const [day, pool, images, pictures, slugs] = await Promise.all([getDleDay(game), getDlePool(game), getDleImages(), getDlePictures(g.photoKind), getKpopGroupSlugs()]);
  const banner = images[world.bannerSlot];
  const other = otherWorld(world);
  const hop = worldHref(other, locale);
  const words = w.marquee(day?.game_no ?? 0).filter((x) => day || !/\b0\b/.test(x));
  const groups = pool ? poolByGroup(pool, w.subKey) : [];
  const quizLinks = Object.fromEntries(groups.flatMap((x) => (slugs[x.group] ? [[x.group, homeUrl({ site: 'kpop', path: `/${slugs[x.group]}-quiz` })]] : [])));
  const yesterday = day?.yesterday ?? null;
  const yGroup = yesterday ? (yesterday.answer.attrs[w.subKey]?.p?.[0] ?? firstValue(yesterday.answer.attrs[w.subKey]?.v)) : '';
  const universeGames = world.modes.flatMap((m) => (m.game ? [m.game] : []));
  const rules = Object.entries(w.columns).filter(([, c]) => c.near && c.source);
  return (
    <DleChrome
      locale={locale} enPath={g.path} className={`hub-dle-game hub-dle-${world.tone} ${dleMarquee.variable}`}
      tools={<DleGameTools locale={locale} enPath={g.path} game={game} universeGames={universeGames} />}
    >
      <DleJsonLd data={[
        gameJsonLd(game, locale),
        breadcrumbJsonLd([{ name: t.navBurrow, path: localePath(DAILY_PATH, locale) }, { name: `${g.brand} ${g.guess[locale]}`, path: localePath(g.path, locale) }]),
        ...(pool ? [itemListJsonLd(w.poolTitle, pool.entities.map((e) => ({ name: e.name })))] : []),
      ]} />
      <figure className={`hub-dle-banner${banner ? ' hub-dle-banner-img' : ''}`}>
        {banner ? (
          <>
            {/* The largest element of the page: the WebP made at upload, at the right width, loaded first (v2 sections 6 and 11.12). */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={banner.src} srcSet={banner.mid ? `${banner.mid} 400w, ${banner.src} 1920w` : undefined} sizes="100vw" alt="" fetchPriority="high" decoding="async" style={{ objectPosition: banner.position }} />
            <span aria-hidden="true" className="hub-dle-banner-fade" />
            <figcaption>{banner.credit}</figcaption>
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
          quizLinks={quizLinks} kpopName={REGISTRY.kpop.brand.name}
        />
        <section aria-label={w.howTitle} className="hub-dle-guide">
          {yesterday ? (
            <p className="hub-dle-yesterday">
              {w.yesterdayLine} <strong>{yesterday.answer.name}</strong>{yGroup ? ` (${yGroup})` : null}
              {quizLinks[yGroup] ? <> · <a href={quizLinks[yGroup]}>{t.quizOf(yGroup)}</a></> : null}
            </p>
          ) : null}
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
              <span aria-hidden="true" className="hub-dle-hop-ic"><Ic d={libraryIcon('eye')} size={30} width={1.9} /></span>
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

