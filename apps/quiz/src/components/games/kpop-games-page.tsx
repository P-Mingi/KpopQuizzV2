import Link from 'next/link';

import { UxPage } from '@/components/ux-v1/page';
import {
  DIFFICULTY_MIN_ATTEMPTS,
  GAMES_H1,
  GAMES_PATH,
  SITE_URL,
  buildGames,
  difficultyAnswer,
  difficultyTable,
  friendsBlock,
  gameUrl,
  gamesAnswer,
  gamesDescription,
  gamesFaq,
  gamesTitle,
  groupGrid,
  monthLabel,
} from '@/lib/games/registry';
import { DEFAULT_OG_IMAGE } from '@/lib/seo/og';
import { exact } from '@/lib/stats/site-stats';
import { jsonLdScript } from '@/lib/verse/jsonld';

import type { KpopGamesData } from '@/lib/games/data';
import type { Game } from '@/lib/games/registry';
import type { Metadata } from 'next';

// The /kpop-games page body (SEO Mission 2, part A). Pure: it renders what
// lib/games/data.ts read, through the functions of lib/games/registry.ts, so a unit test
// renders the very markup the route serves (lib/games/page.test.ts). DOM order is reading
// order: crumb, H1, answer, table, one section per game, friends, groups, difficulty, FAQ.
// One H1. The JSON-LD repeats the visible values (H1, answer block, the games of the table).

/** Everything the page and its metadata derive from the reads, computed once. */
export function kpopGamesView(data: KpopGamesData): {
  games: Game[];
  title: string;
  description: string;
  answer: string;
  month: string;
} {
  const games = buildGames(data.facts);
  const month = monthLabel(data.stats?.asOf ?? new Date());
  return {
    games,
    title: gamesTitle(games.length),
    description: gamesDescription(games, data.stats),
    answer: gamesAnswer(games, data.stats, month),
    month,
  };
}

export function kpopGamesMetadata(data: KpopGamesData): Metadata {
  const v = kpopGamesView(data);
  return {
    title: v.title,
    description: v.description,
    alternates: { canonical: GAMES_PATH },
    openGraph: { title: `${v.title} | KpopQuiz`, description: v.description, url: GAMES_PATH, type: 'website', images: [DEFAULT_OG_IMAGE] },
    twitter: { card: 'summary_large_image', title: `${v.title} | KpopQuiz`, description: v.description },
  };
}

const playable = (href: string): boolean => !href.startsWith('#');

export function KpopGamesPage({ data }: { data: KpopGamesData }): React.ReactElement {
  const { games, answer } = kpopGamesView(data);
  const friends = friendsBlock(games, data.facts.v12);
  const faq = gamesFaq(games);
  const grid = groupGrid(data.gridGroups, {
    playlist: data.playlistSlugs,
    nameAll: new Set(data.facts.nameAll.map((g) => g.slug)),
    wma: new Set(data.facts.wma.map((g) => g.slug)),
  });
  const hardest = difficultyTable(games, data.difficulty);

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: GAMES_H1, item: `${SITE_URL}${GAMES_PATH}` },
    ],
  };
  const collection = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: GAMES_H1,
    description: answer,
    url: `${SITE_URL}${GAMES_PATH}`,
    inLanguage: 'en',
    isPartOf: { '@type': 'WebSite', name: 'KpopQuiz', url: SITE_URL },
    mainEntity: {
      '@type': 'ItemList',
      name: GAMES_H1,
      numberOfItems: games.length,
      itemListElement: games.map((g, i) => ({ '@type': 'ListItem', position: i + 1, name: g.name, url: gameUrl(g) })),
    },
  };

  return (
    <UxPage width="wide" className="kg-page">
      <nav className="ux-crumb kg-crumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{GAMES_H1}</span>
      </nav>

      <h1 className="ux-h1">{GAMES_H1}</h1>
      <p className="kg-answer">{answer}</p>

      <section className="ux-sec kg-sec" aria-labelledby="kg-all-h">
        <h2 id="kg-all-h" className="ux-h2">All {games.length} K-pop games</h2>
        <div className="kg-tablewrap">
          <table className="kg-table">
            <thead>
              <tr>
                <th scope="col">Game</th>
                <th scope="col">What you do</th>
                <th scope="col">Duration</th>
                <th scope="col">Players</th>
                <th scope="col">Groups</th>
              </tr>
            </thead>
            <tbody>
              {games.map((g) => (
                <tr key={g.id}>
                  <th scope="row"><Link href={g.href}>{g.name}</Link></th>
                  <td>{g.what}</td>
                  <td>{g.duration}</td>
                  <td>{g.players}</td>
                  <td>{g.groups}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {games.map((g) => (
        <section key={g.id} id={g.id} className="ux-sec kg-sec" aria-labelledby={`kg-${g.id}-h`}>
          <h2 id={`kg-${g.id}-h`} className="ux-h2">{g.question}</h2>
          <p>{g.answer}</p>
          {g.links.length > 0 ? (
            <ul className={playable(g.href) ? 'kg-links' : 'kg-links is-groups'}>
              {g.links.map((l) => <li key={l.href}><Link href={l.href}>{l.label}</Link></li>)}
            </ul>
          ) : null}
        </section>
      ))}

      <section className="ux-sec kg-sec" aria-labelledby="kg-friends-h">
        <h2 id="kg-friends-h" className="ux-h2">K-pop games to play with friends</h2>
        <p>{friends.answer}</p>
        {friends.items.map((it) => (
          <div key={it.title} className="kg-item">
            <h3>{it.title}</h3>
            <p>{it.body}{it.link ? <> <Link href={it.link.href}>{it.link.label}</Link></> : null}</p>
          </div>
        ))}
      </section>

      {grid.length > 0 ? (
        <section className="ux-sec kg-sec" aria-labelledby="kg-groups-h">
          <h2 id="kg-groups-h" className="ux-h2">K-pop games by group</h2>
          <p>Each group page has a games section with every game for that group. These {grid.length} groups have the most games, then the most plays.</p>
          <ul className="kg-grid">
            {grid.map((g) => (
              <li key={g.slug}>
                <Link href={g.href}>{g.name} games</Link>
                <span>{g.games.join(' · ')}</span>
              </li>
            ))}
          </ul>
          <p><Link href="/groups">All K-pop groups A to Z</Link></p>
        </section>
      ) : null}

      {hardest ? (
        <section className="ux-sec kg-sec" aria-labelledby="kg-hard-h">
          <h2 id="kg-hard-h" className="ux-h2">Which K-pop game is the hardest?</h2>
          <p>{difficultyAnswer(hardest)}</p>
          <div className="kg-tablewrap">
            <table className="kg-table">
              <thead>
                <tr>
                  <th scope="col">Game</th>
                  <th scope="col">Right on average</th>
                  <th scope="col">Based on</th>
                  <th scope="col">Since</th>
                </tr>
              </thead>
              <tbody>
                {hardest.rows.map((r) => (
                  <tr key={r.id}>
                    <th scope="row"><Link href={r.href}>{r.name}</Link></th>
                    <td>{r.pct}% of {r.measure}</td>
                    <td>{r.basedOn}</td>
                    <td>{r.since ?? 'Not recorded'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="kg-note">
            How we measure: the share of right answers over every recorded attempt (for Name them all, the share of
            members named), from the site&apos;s own game records. A game is compared only after {exact(DIFFICULTY_MIN_ATTEMPTS)} attempts.
            {hardest.thin.length > 0 ? ` Not enough data yet: ${hardest.thin.join(', ')}.` : ''}
            {hardest.unscored.length > 0 ? ` Not compared: ${hardest.unscored.join('; ')}.` : ''}
          </p>
        </section>
      ) : null}

      <section className="ux-sec kg-sec kg-faq" aria-labelledby="kg-faq-h">
        <h2 id="kg-faq-h" className="ux-h2">Frequently asked questions</h2>
        {faq.map((f) => (
          <div key={f.q} className="kg-item">
            <h3>{f.q}</h3>
            <p>{f.a}</p>
          </div>
        ))}
      </section>

      {jsonLdScript(breadcrumb)}
      {jsonLdScript(collection)}
    </UxPage>
  );
}
