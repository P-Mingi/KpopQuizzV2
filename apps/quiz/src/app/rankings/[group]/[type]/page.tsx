import { notFound } from 'next/navigation';
import Link from 'next/link';

import { getRanking, RANKING_UNLOCK_VOTES } from '@/lib/db/queries/duels';
import { RankingList } from '@/components/duel/ranking-list';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';

import type { Metadata } from 'next';

// ISR: hourly, so the nightly Elo reconcile shows without a rebuild (4c).
export const revalidate = 3600;

const GROUP_NAMES: Record<string, string> = {
  bts: 'BTS',
  blackpink: 'BLACKPINK',
  aespa: 'aespa',
  seventeen: 'SEVENTEEN',
  'stray-kids': 'Stray Kids',
};

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Declarative, fan-framed heading. Never asserts a fact. */
function heading(group: string, type: string): string {
  const t = type.replace(/-/g, ' ');
  if (group === 'general') return `${cap(t)} ranked by fans`;
  const g = GROUP_NAMES[group] ?? cap(group.replace(/-/g, ' '));
  return `${g} ${t} ranked by fans`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ group: string; type: string }>;
}): Promise<Metadata> {
  const { group, type } = await params;
  const r = await getRanking(group, type);
  if (!r) return {};

  const title = `${heading(group, type)} | KpopQuiz`;
  const description = r.public
    ? `${r.entities[0]?.name ? `${r.entities[0].name} leads. ` : ''}A live fan ranking built from ${r.total_votes.toLocaleString('en-US')} head-to-head votes. Fan opinion, not an official list.`
    : r.provisional
    ? `Early results from ${r.total_votes.toLocaleString('en-US')} fan votes so far. The ranking is still moving. Vote to help shape it.`
    : `Fans are still voting on this matchup. Play the head-to-head game to help unlock the ranking.`;

  const base: Metadata = {
    title,
    description,
    alternates: { canonical: `/rankings/${group}/${type}` },
  };
  // 4b: indexable only once it passes min_votes.
  if (!r.public) return { ...base, robots: { index: false, follow: true } };
  return base;
}

export default async function RankingPage({
  params,
}: {
  params: Promise<{ group: string; type: string }>;
}): Promise<React.ReactElement> {
  const { group, type } = await params;
  const r = await getRanking(group, type);
  if (!r) notFound();

  const h1 = heading(group, type);
  const duelHref = `/games/this-or-that?group=${encodeURIComponent(group)}&type=${encodeURIComponent(type)}`;

  return (
    <div className="ranking-page">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Rankings', href: '/rankings' },
          { label: h1 },
        ]}
      />

      <p className="duel-label">Fan-voted ranking</p>
      <h1 className="ranking-h1">{h1}</h1>

      {r.public ? (
        <>
          <p className="ranking-intro">
            {r.total_votes.toLocaleString('en-US')} fans have voted in head-to-head matchups to build
            this ranking. It reflects fan opinion, not an official list.
          </p>

          <Link href={duelHref} className="btn-primary ranking-cta">
            Vote on these matchups →
          </Link>

          <RankingList
            title={r.question.prompt}
            badge={<span className="rank-pill-votes">{r.total_votes.toLocaleString('en-US')} votes</span>}
            entities={r.entities}
            variant="winrate"
            footer={{ href: duelHref, label: 'Vote on these matchups →' }}
          />

          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'ItemList',
                name: h1,
                description: `A fan-voted ranking on KpopQuiz, based on ${r.total_votes} head-to-head votes.`,
                numberOfItems: r.entities.length,
                itemListOrder: 'https://schema.org/ItemListOrderDescending',
                itemListElement: r.entities.map((e) => ({
                  '@type': 'ListItem',
                  position: e.rank,
                  name: e.name,
                })),
              }),
            }}
          />
        </>
      ) : r.provisional ? (
        <>
          <p className="ranking-intro">
            <strong>Early results</strong> from {r.total_votes.toLocaleString('en-US')} fan{' '}
            {r.total_votes === 1 ? 'vote' : 'votes'} so far. The standings are still moving as more
            fans play. This is fan opinion in progress, not a settled list.
          </p>

          <Link href={duelHref} className="btn-primary ranking-cta">
            Vote to shape this ranking →
          </Link>

          <RankingList
            title={r.question.prompt}
            badge={<span className="rank-pill-early">Early results · {r.total_votes.toLocaleString('en-US')} votes · still moving</span>}
            entities={r.entities.slice(0, 3)}
            variant="winrate"
            footer={{ href: duelHref, label: 'Vote to shape this ranking →' }}
          />
        </>
      ) : (
        <div className="rank-locked">
          <p className="rank-locked-title">Be the first to vote</p>
          <p className="rank-locked-sub">
            No fan has voted on this matchup yet. Early results appear as soon as the first votes come
            in, and the ranking goes live at {RANKING_UNLOCK_VOTES} votes.
          </p>
          <div className="rank-locked-bar">
            <span
              className="rank-locked-fill"
              style={{ width: `${Math.min(100, Math.round((r.total_votes / RANKING_UNLOCK_VOTES) * 100))}%` }}
            />
          </div>
          <p className="rank-locked-count">
            {r.total_votes.toLocaleString('en-US')} / {RANKING_UNLOCK_VOTES} votes
          </p>
          <Link href={duelHref} className="btn-primary ranking-cta">
            Play to start it →
          </Link>
        </div>
      )}
    </div>
  );
}
